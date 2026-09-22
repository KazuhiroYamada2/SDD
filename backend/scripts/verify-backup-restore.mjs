import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { createCustomerCrypto, encryptedCustomerFields } from '../src/customers/customer-crypto.ts';
import { createCustomerRepository } from '../src/customers/customer-repository.ts';
import { createCustomerReadService } from '../src/customers/customer-read-service.ts';
import { backupPostgres, restorePostgres } from '../src/operations/postgres-backup.ts';

const sourceDatabase = 'customer_management_e2e';
const restoreDatabase = 'customer_management_restore_t702';
const tables = [
  'users', 'customers', 'activities', 'sales_records', 'audit_logs', 'customer_migration_ledger',
  'maintenance_events', 'maintenance_notification_deliveries',
];
const testCrypto = createCustomerCrypto({ currentKeyId: 'acceptance', keys: new Map([['acceptance', Buffer.alloc(32, 37)]]) });
const sourceCustomerId = randomUUID();

const assertResult = (condition, message) => { if (!condition) throw new Error(message); };

const safeSourceUrl = () => {
  if (process.env.NODE_ENV !== 'e2e' || !process.env.DATABASE_URL) throw new Error('Restore verification requires the dedicated E2E database.');
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname !== '127.0.0.1' || url.port !== '55432' || decodeURIComponent(url.pathname.slice(1)) !== sourceDatabase) {
    throw new Error('Restore verification requires the dedicated E2E database.');
  }
  return url;
};

const urlForDatabase = (source, database) => {
  const result = new URL(source);
  result.pathname = `/${database}`;
  return result.toString();
};

const rowCounts = async (client) => {
  const result = {};
  for (const table of tables) {
    const count = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    result[table] = count.rows[0].count;
  }
  return result;
};

const foreignKeyCount = async (client) => {
  const result = await client.query("SELECT COUNT(*)::int AS count FROM pg_constraint WHERE contype = 'f'");
  return result.rows[0].count;
};

const main = async () => {
  const sourceUrl = safeSourceUrl();
  const source = new pg.Client({ connectionString: sourceUrl.toString() });
  const admin = new pg.Client({ connectionString: urlForDatabase(sourceUrl, 'postgres') });
  const directory = await mkdtemp(join(tmpdir(), 't702-restore-'));
  const artifact = join(directory, 'customer-management.dump');
  let restored;
  let sourceConnected = false;
  let adminConnected = false;
  const startedAt = performance.now();
  try {
    await source.connect();
    sourceConnected = true;
    const owner = await source.query("SELECT id FROM users WHERE is_active = true ORDER BY id LIMIT 1");
    assertResult(owner.rows.length === 1, 'Restore verification owner fixture is missing.');
    const plaintext = {
      name: 'T702 synthetic restore customer', name_kana: 'ティーナナマルニ',
      email: 't702-restore@example.test', phone: '000-0000-0702', address: 'Synthetic address',
      category: 'restore', owner_user_id: owner.rows[0].id,
    };
    const encrypted = testCrypto.encryptCreateInput(plaintext);
    await source.query(`INSERT INTO customers
      (id, name, name_kana, email, phone, address, category, owner_user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [
      sourceCustomerId, encrypted.name, encrypted.name_kana, encrypted.email, encrypted.phone,
      encrypted.address, encrypted.category, encrypted.owner_user_id,
    ]);
    const expectedCounts = await rowCounts(source);
    const expectedForeignKeys = await foreignKeyCount(source);

    const artifactBytes = await backupPostgres({ connectionString: sourceUrl.toString(), outputPath: artifact });
    const artifactData = await readFile(artifact);
    const forbidden = [
      sourceUrl.password,
      process.env.JWT_SECRET,
      process.env.CUSTOMER_ENCRYPTION_KEYS_JSON,
    ].filter((value) => typeof value === 'string' && value !== '');
    assertResult(forbidden.every((value) => !artifactData.includes(Buffer.from(value))), 'Backup artifact contains application configuration secret.');

    await admin.connect();
    adminConnected = true;
    await admin.query(`DROP DATABASE IF EXISTS ${restoreDatabase} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${restoreDatabase}`);
    const restoreUrl = urlForDatabase(sourceUrl, restoreDatabase);
    await restorePostgres({ connectionString: restoreUrl, inputPath: artifact });
    restored = new pg.Client({ connectionString: restoreUrl });
    await restored.connect();

    const actualTables = await restored.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name",
      [tables],
    );
    assertResult(actualTables.rows.length === tables.length, 'Restored database is missing a required table.');
    assertResult(JSON.stringify(await rowCounts(restored)) === JSON.stringify(expectedCounts), 'Restored row counts differ from source.');
    assertResult(await foreignKeyCount(restored) === expectedForeignKeys && expectedForeignKeys > 0, 'Restored foreign keys differ from source.');
    const stored = await restored.query(
      'SELECT name_kana, email, phone, address FROM customers WHERE id = $1', [sourceCustomerId],
    );
    assertResult(stored.rows.length === 1, 'Encrypted Customer was not restored.');
    for (const field of encryptedCustomerFields) {
      assertResult(stored.rows[0][field] !== plaintext[field], 'Restored Customer contains plaintext.');
      testCrypto.validateEnvelope(field, stored.rows[0][field]);
    }
    const dto = await createCustomerReadService(createCustomerRepository(restored), testCrypto)
      .findById(sourceCustomerId, { id: owner.rows[0].id, role: 'manager' });
    assertResult(dto.email === plaintext.email && dto.address === plaintext.address, 'Authorized decrypt failed after restore.');

    console.log(JSON.stringify({
      backup: 'PASS', restore: 'PASS', source_database: sourceDatabase, restore_database: restoreDatabase,
      artifact_non_empty: artifactBytes > 0, tables: tables.length, row_counts_match: true,
      foreign_keys_match: true, encrypted_customer: 'PASS', plaintext_remaining: 0,
      authorized_decrypt: 'PASS', duration_ms: Math.round(performance.now() - startedAt),
    }));
  } finally {
    await restored?.end().catch(() => undefined);
    if (adminConnected) await admin.query(`DROP DATABASE IF EXISTS ${restoreDatabase} WITH (FORCE)`).catch(() => undefined);
    await admin.end().catch(() => undefined);
    if (sourceConnected) await source.query('DELETE FROM customers WHERE id = $1', [sourceCustomerId]).catch(() => undefined);
    await source.end().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
};

main().catch(() => {
  console.error('PostgreSQL backup/restore verification failed.');
  process.exitCode = 1;
});
