import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import request from 'supertest';
import { createJwtService } from '../src/auth/jwt-service.ts';
import { createCustomerCrypto, encryptedCustomerFields } from '../src/customers/customer-crypto.ts';
import { createCustomerReadService } from '../src/customers/customer-read-service.ts';
import { createCustomerRepository } from '../src/customers/customer-repository.ts';
import { parseCustomerMigrationWorkbook } from '../src/customer-migration/customer-migration-excel.ts';
import { migrateCustomers } from '../src/customer-migration/customer-migration.ts';
import {
  assertRehearsalConnection,
  connectionForDatabase,
  createStepResults,
  failureDatabase,
  rehearsalDatabase,
  rollbackDatabase,
  runOrderedSteps,
} from '../src/operations/migration-rehearsal.ts';
import { backupPostgres, restorePostgres } from '../src/operations/postgres-backup.ts';

const execFileAsync = promisify(execFile);
const datasetId = 'sdd-customer-migration-v1';
const ownerIds = Array.from({ length: 5 }, (_, index) =>
  `71000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
const fixturePath = fileURLToPath(new URL('../../examples/fixtures/sdd_customer_migration_source.xlsx', import.meta.url));
const migrationFiles = ['001_create_core_schema.sql', '002_create_customer_migration_ledger.sql', '003_create_maintenance_notifications.sql'];
const pendingMigration = '004_add_maintenance_first_attempted_at.sql';
const tables = ['users', 'customers', 'activities', 'sales_records', 'audit_logs', 'customer_migration_ledger', 'maintenance_events', 'maintenance_notification_deliveries'];

const assertResult = (condition, message) => { if (!condition) throw new Error(message); };
const migrationSql = async (name) => readFile(fileURLToPath(new URL(`../migrations/${name}`, import.meta.url)), 'utf8');

const toolVersion = async (executable) => {
  const { stdout } = await execFileAsync(executable, ['--version'], { windowsHide: true });
  const version = stdout.trim();
  assertResult(/\b16\.\d+\b/.test(version), 'PostgreSQL 16 client tools are required.');
  return version;
};

const columnExists = async (client, table, column) => {
  const result = await client.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2) AS present`,
    [table, column],
  );
  return result.rows[0].present;
};

const rowCounts = async (client) => {
  const counts = {};
  for (const table of tables) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = result.rows[0].count;
  }
  return counts;
};

const foreignKeyCount = async (client) => {
  const result = await client.query("SELECT COUNT(*)::int AS count FROM pg_constraint WHERE contype = 'f'");
  return result.rows[0].count;
};

const validateEncryptedCustomers = async (client, crypto) => {
  const rows = await client.query('SELECT name_kana, email, phone, address FROM customers');
  for (const row of rows.rows) {
    for (const field of encryptedCustomerFields) {
      if (row[field] !== null) crypto.validateEnvelope(field, row[field]);
    }
  }
  return 0;
};

const recreateDatabase = async (admin, database) => {
  await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${database}`);
};

const seedBaseline = async (client, crypto) => {
  for (let index = 0; index < ownerIds.length; index += 1) {
    await client.query(
      `INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, 'rehearsal-no-login', $3, true, NOW(), NOW())`,
      [ownerIds[index], `staff${String(index + 1).padStart(2, '0')}@example.test`, index === 0 ? 'manager' : 'staff'],
    );
  }
  const baselineId = randomUUID();
  const encrypted = crypto.encryptCreateInput({
    name: 'T704 baseline synthetic customer',
    name_kana: 'T704 BASELINE',
    email: 't704-baseline@example.test',
    phone: '000-0000-0704',
    address: 'Synthetic rehearsal address',
    category: null,
    owner_user_id: ownerIds[0],
  });
  await client.query(
    `INSERT INTO customers (id, name, name_kana, email, phone, address, category, owner_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [baselineId, encrypted.name, encrypted.name_kana, encrypted.email, encrypted.phone,
      encrypted.address, encrypted.category, encrypted.owner_user_id],
  );
  return baselineId;
};

const applyPendingMigration = async (client) => {
  if (await columnExists(client, 'maintenance_notification_deliveries', 'first_attempted_at')) return 'already_applied';
  await client.query(await migrationSql(pendingMigration));
  assertResult(await columnExists(client, 'maintenance_notification_deliveries', 'first_attempted_at'), 'Pending schema migration verification failed.');
  return 'applied';
};

const smokeApplication = async (client, crypto, customerId) => {
  const { createApp } = await import('../src/app.ts');
  const jwtService = createJwtService();
  const authUserRepository = {
    findByEmail: async () => null,
    findById: async (id) => id === ownerIds[0] ? {
      id: ownerIds[0], email: 'staff01@example.test', role: 'manager', is_active: true,
    } : null,
  };
  const repository = createCustomerRepository(client);
  const app = createApp({
    healthDatabase: client,
    authUserRepository,
    jwtService,
    customerRepository: repository,
    customerReadService: createCustomerReadService(repository, crypto),
    customerCrypto: crypto,
  });
  const live = await request(app).get('/health/live');
  const ready = await request(app).get('/health/ready');
  const token = await jwtService.issueAccessToken(ownerIds[0]);
  const customer = await request(app).get(`/api/v1/customers/${customerId}`).set('Authorization', `Bearer ${token}`);
  assertResult(live.status === 200 && live.body.status === 'ok', 'Liveness smoke failed.');
  assertResult(ready.status === 200 && ready.body.status === 'ready', 'Readiness smoke failed.');
  assertResult(customer.status === 200 && customer.body.id === customerId &&
    encryptedCustomerFields.every((field) => customer.body[field] === null || !customer.body[field].startsWith('enc:v1:')),
  'Authorized Customer smoke failed.');
};

const main = async () => {
  const startedAt = performance.now();
  const steps = createStepResults();
  const sourceUrl = assertRehearsalConnection(process.env.NODE_ENV, process.env.DATABASE_URL);
  const rehearsalUrl = connectionForDatabase(sourceUrl, rehearsalDatabase);
  const rollbackUrl = connectionForDatabase(sourceUrl, rollbackDatabase);
  const failureUrl = connectionForDatabase(sourceUrl, failureDatabase);
  const adminUrl = connectionForDatabase(sourceUrl, 'postgres');
  const pgDump = process.env.PG_DUMP_PATH ?? 'pg_dump';
  const pgRestore = process.env.PG_RESTORE_PATH ?? 'pg_restore';
  const versions = { pg_dump: await toolVersion(pgDump), pg_restore: await toolVersion(pgRestore) };
  const directory = await mkdtemp(join(tmpdir(), 't704-rehearsal-'));
  const artifact = join(directory, 'pre-migration.dump');
  const admin = new pg.Client({ connectionString: adminUrl });
  const source = new pg.Client({ connectionString: sourceUrl.toString() });
  let forward;
  let rollback;
  let failure;
  const testKeyId = 't704-rehearsal';
  const testKey = Buffer.alloc(32, 74);
  process.env.CUSTOMER_ENCRYPTION_CURRENT_KEY_ID = testKeyId;
  process.env.CUSTOMER_ENCRYPTION_KEYS_JSON = JSON.stringify({ [testKeyId]: testKey.toString('base64') });
  const crypto = createCustomerCrypto({ currentKeyId: testKeyId, keys: new Map([[testKeyId, testKey]]) });
  let first;
  let second;
  let baseline;
  let artifactBytes = 0;
  let schemaRerun = 'not_checked';
  let smokeCustomerId;
  let failureInjection;
  let cleaned = false;

  const cleanup = async () => {
    await forward?.end().catch(() => undefined);
    await rollback?.end().catch(() => undefined);
    await failure?.end().catch(() => undefined);
    if ((/** @type {any} */ (admin))._connected) {
      for (const database of [failureDatabase, rollbackDatabase, rehearsalDatabase]) {
        await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`).catch(() => undefined);
      }
    }
    await source.end().catch(() => undefined);
    await admin.end().catch(() => undefined);
    const { closeDatabase } = await import('../src/db.ts');
    await closeDatabase().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
    cleaned = true;
  };

  try {
    await admin.connect();
    await source.connect();
    const identity = await source.query('SELECT current_database() AS database_name, current_setting(\'server_version_num\')::int AS version');
    assertResult(identity.rows[0].database_name === 'customer_management_e2e' && identity.rows[0].version >= 160000 && identity.rows[0].version < 170000,
      'Rehearsal source identity or PostgreSQL version is invalid.');
    await recreateDatabase(admin, rehearsalDatabase);
    forward = new pg.Client({ connectionString: rehearsalUrl });
    await forward.connect();
    for (const migration of migrationFiles) await forward.query(await migrationSql(migration));
    const baselineCustomerId = await seedBaseline(forward, crypto);
    baseline = {
      counts: await rowCounts(forward),
      foreignKeys: await foreignKeyCount(forward),
      pendingAbsent: !(await columnExists(forward, 'maintenance_notification_deliveries', 'first_attempted_at')),
      baselineCustomerId,
    };
    assertResult(baseline.pendingAbsent && baseline.counts.customers === 1, 'Release-before schema baseline is invalid.');
    assertResult(await validateEncryptedCustomers(forward, crypto) === 0, 'Baseline contains plaintext Customer data.');
    steps.precheck = 'PASS';

    artifactBytes = await backupPostgres({ connectionString: rehearsalUrl, outputPath: artifact, executable: pgDump });
    const artifactData = await readFile(artifact);
    const forbidden = [sourceUrl.password, process.env.JWT_SECRET, process.env.CUSTOMER_ENCRYPTION_KEYS_JSON]
      .filter((value) => typeof value === 'string' && value !== '');
    assertResult(artifactBytes > 0 && forbidden.every((value) => !artifactData.includes(Buffer.from(value))),
      'Backup artifact validation failed.');
    steps.backup = 'PASS';

    await recreateDatabase(admin, failureDatabase);
    await restorePostgres({ connectionString: failureUrl, inputPath: artifact, executable: pgRestore });
    failure = new pg.Client({ connectionString: failureUrl });
    await failure.connect();
    let injected;
    try {
      await runOrderedSteps(['prerequisite', 'schemaMigration', 'applicationRollout'], {
        prerequisite: async () => undefined,
        schemaMigration: async () => { throw new Error('Injected rehearsal migration failure.'); },
        applicationRollout: async () => { throw new Error('Application rollout must not run.'); },
      });
    } catch (error) {
      injected = error.stepResults;
    }
    assertResult(injected?.schemaMigration === 'FAIL' && injected?.applicationRollout === 'NOT_RUN' &&
      !(await columnExists(failure, 'maintenance_notification_deliveries', 'first_attempted_at')),
    'Failure injection did not stop the rollout.');
    failureInjection = { migration: 'FAIL_EXPECTED', applicationRollout: 'NOT_RUN' };

    assertResult(await applyPendingMigration(forward) === 'applied', 'Pending schema migration was not applied.');
    steps.schemaMigration = 'PASS';
    const workbook = await parseCustomerMigrationWorkbook(fixturePath);
    first = await migrateCustomers(workbook, forward, crypto, { datasetId, batchSize: 7 });
    assertResult(first.summary.source_total === 40 && first.summary.inserted === 31 &&
      first.summary.already_migrated === 0 && first.summary.rejected_records === 9, 'Customer migration first-run reconciliation failed.');
    steps.dataMigration = 'PASS';

    const migrated = await forward.query(
      `SELECT c.*, l.source_customer_id FROM customer_migration_ledger l
       JOIN customers c ON c.id = l.customer_id WHERE l.dataset_id = $1 ORDER BY l.source_customer_id`, [datasetId],
    );
    assertResult(migrated.rows.length === 31 &&
      migrated.rows.filter((row) => row.deleted_at === null).length === 28 &&
      migrated.rows.filter((row) => row.deleted_at !== null).length === 3,
    'Forward Customer counts are invalid.');
    assertResult(await foreignKeyCount(forward) >= baseline.foreignKeys &&
      await columnExists(forward, 'maintenance_notification_deliveries', 'first_attempted_at'),
    'Forward schema or FK verification failed.');
    assertResult(await validateEncryptedCustomers(forward, crypto) === 0, 'Forward database contains plaintext Customer data.');
    smokeCustomerId = migrated.rows.find((row) => row.deleted_at === null)?.id;
    assertResult(smokeCustomerId !== undefined, 'Forward smoke Customer is missing.');
    steps.forwardVerification = 'PASS';
    await smokeApplication(forward, crypto, smokeCustomerId);
    steps.applicationSmoke = 'PASS';

    schemaRerun = await applyPendingMigration(forward);
    second = await migrateCustomers(workbook, forward, crypto, { datasetId, batchSize: 7 });
    const afterRerun = await forward.query('SELECT COUNT(*)::int AS count FROM customer_migration_ledger WHERE dataset_id = $1', [datasetId]);
    assertResult(schemaRerun === 'already_applied' && second.summary.inserted === 0 &&
      second.summary.already_migrated === 31 && second.summary.rejected_records === 9 && afterRerun.rows[0].count === 31,
    'Migration rerun/idempotency verification failed.');
    steps.rerunVerification = 'PASS';

    await recreateDatabase(admin, rollbackDatabase);
    await restorePostgres({ connectionString: rollbackUrl, inputPath: artifact, executable: pgRestore });
    steps.rollbackRestore = 'PASS';
    rollback = new pg.Client({ connectionString: rollbackUrl });
    await rollback.connect();
    const rollbackCounts = await rowCounts(rollback);
    const rollbackLedger = await rollback.query('SELECT COUNT(*)::int AS count FROM customer_migration_ledger WHERE dataset_id = $1', [datasetId]);
    assertResult(JSON.stringify(rollbackCounts) === JSON.stringify(baseline.counts) &&
      await foreignKeyCount(rollback) === baseline.foreignKeys && rollbackLedger.rows[0].count === 0 &&
      !(await columnExists(rollback, 'maintenance_notification_deliveries', 'first_attempted_at')) &&
      await validateEncryptedCustomers(rollback, crypto) === 0,
    'Rollback pre-state verification failed.');
    const rollbackRead = await createCustomerReadService(createCustomerRepository(rollback), crypto)
      .findById(baseline.baselineCustomerId, { id: ownerIds[0], role: 'manager' });
    assertResult(rollbackRead.id === baseline.baselineCustomerId, 'Rollback Customer decrypt verification failed.');
    steps.rollbackVerification = 'PASS';

    await cleanup();
    steps.cleanup = 'PASS';
    console.log(JSON.stringify({
      tools: versions,
      environment: { source: 'dedicated-e2e', rehearsal: 'separate', rollback: 'separate' },
      manifest: { prerequisite: migrationFiles, pending: pendingMigration, data: 'T-701' },
      precheck: steps.precheck,
      backup: { result: steps.backup, artifact_non_empty: artifactBytes > 0 },
      schemaMigration: { result: steps.schemaMigration, rerun: schemaRerun },
      dataMigration: { first: first.summary, second: second.summary },
      forwardVerification: steps.forwardVerification,
      applicationSmoke: { result: steps.applicationSmoke, live: 200, ready: 200, authorizedCustomerRead: 'PASS' },
      failureInjection,
      rollbackRestore: steps.rollbackRestore,
      rollbackVerification: steps.rollbackVerification,
      rerunVerification: steps.rerunVerification,
      cleanup: cleaned ? 'PASS' : 'FAIL',
      overallResult: Object.values(steps).every((value) => value === 'PASS') ? 'PASS' : 'FAIL',
      duration_ms: Math.round(performance.now() - startedAt),
    }));
  } catch (error) {
    await cleanup();
    console.error('Production migration rehearsal failed.');
    process.exitCode = 1;
  }
};

await main();
