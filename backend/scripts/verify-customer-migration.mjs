import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createCustomerCrypto, encryptedCustomerFields } from '../src/customers/customer-crypto.ts';
import { createCustomerReadService } from '../src/customers/customer-read-service.ts';
import { createCustomerRepository } from '../src/customers/customer-repository.ts';
import { parseCustomerMigrationWorkbook } from '../src/customer-migration/customer-migration-excel.ts';
import { migrateCustomers } from '../src/customer-migration/customer-migration.ts';

const expectedDatabase = 'customer_management_e2e';
const datasetId = 'sdd-customer-migration-v1';
const testCrypto = createCustomerCrypto({
  currentKeyId: 'migration-acceptance',
  keys: new Map([['migration-acceptance', Buffer.alloc(32, 12)]]),
});
const fixturePath = fileURLToPath(new URL('../../examples/fixtures/sdd_customer_migration_source.xlsx', import.meta.url));
const acceptanceOwnerIds = Array.from({ length: 5 }, (_, index) =>
  `71000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);

const safeConnectionString = () => {
  if (process.env.NODE_ENV !== 'e2e' || !process.env.DATABASE_URL) throw new Error('Customer migration Acceptance requires the E2E database.');
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname !== '127.0.0.1' || url.port !== '55432' || decodeURIComponent(url.pathname.slice(1)) !== expectedDatabase) {
    throw new Error('Customer migration Acceptance requires the dedicated local E2E database.');
  }
  return process.env.DATABASE_URL;
};

const cleanup = async (client) => {
  await client.query('BEGIN');
  try {
    const migrated = await client.query('SELECT customer_id FROM customer_migration_ledger WHERE dataset_id = $1', [datasetId]);
    await client.query('DELETE FROM customer_migration_ledger WHERE dataset_id = $1', [datasetId]);
    if (migrated.rows.length > 0) {
      await client.query('DELETE FROM customers WHERE id = ANY($1::uuid[])', [migrated.rows.map(({ customer_id }) => customer_id)]);
    }
    await client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [acceptanceOwnerIds]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

const assertResult = (condition, message) => {
  if (!condition) throw new Error(message);
};

const main = async () => {
  const workbook = await parseCustomerMigrationWorkbook(fixturePath);
  const crypto = testCrypto;
  const client = new pg.Client({ connectionString: safeConnectionString() });
  await client.connect();
  try {
    await cleanup(client);
    for (let index = 0; index < acceptanceOwnerIds.length; index += 1) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ($1, $2, 'migration-acceptance-no-login', 'staff', true, NOW(), NOW())`,
        [acceptanceOwnerIds[index], `staff${String(index + 1).padStart(2, '0')}@example.test`],
      );
    }

    const first = await migrateCustomers(workbook, client, crypto, { datasetId, batchSize: 7 });
    assertResult(first.summary.source_total === 40 && first.summary.inserted === 31 &&
      first.summary.already_migrated === 0 && first.summary.rejected_records === 9, 'First-run summary mismatch.');
    assertResult(first.summary.reject_reason_counts.DUPLICATE_SOURCE_ID === 2 &&
      first.summary.reject_reason_counts.NAME_REQUIRED === 1 &&
      first.summary.reject_reason_counts.OWNER_EMAIL_REQUIRED === 1 &&
      first.summary.reject_reason_counts.OWNER_MAPPING_FAILED === 1 &&
      first.summary.reject_reason_counts.UNKNOWN_CATEGORY === 1 &&
      first.summary.reject_reason_counts.INVALID_EMAIL === 1 &&
      first.summary.reject_reason_counts.DELETE_STATE_INCONSISTENT === 2, 'Reject classification mismatch.');
    assertResult(!JSON.stringify(first.rejects).includes('@') && !JSON.stringify(first.rejects).includes('東京都'), 'Reject output contains plaintext PII.');

    const rows = await client.query(
      `SELECT l.source_customer_id, c.* FROM customer_migration_ledger l
      JOIN customers c ON c.id = l.customer_id WHERE l.dataset_id = $1 ORDER BY l.source_customer_id`,
      [datasetId],
    );
    assertResult(rows.rows.length === 31, 'Migrated Customer count mismatch.');
    assertResult(rows.rows.filter(({ deleted_at }) => deleted_at === null).length === 28 &&
      rows.rows.filter(({ deleted_at }) => deleted_at !== null).length === 3, 'Active/deleted count mismatch.');
    assertResult(rows.rows.every(({ id }) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)), 'Customer ID is not UUID v4.');
    assertResult(rows.rows.every(({ owner_user_id }) => acceptanceOwnerIds.includes(owner_user_id)), 'Owner mapping mismatch.');
    assertResult(rows.rows.every(({ category }) => category === null || ['法人', '個人', '重点', '休眠'].includes(category)), 'Category mapping mismatch.');
    for (const row of rows.rows) {
      for (const field of encryptedCustomerFields) {
        if (row[field] !== null) crypto.validateEnvelope(field, row[field]);
      }
    }
    assertResult(rows.rows.every((row) => encryptedCustomerFields.every((field) => row[field] === null || row[field].startsWith('enc:v1:'))), 'Plaintext remains in encrypted columns.');
    const duplicate = await client.query(
      'SELECT COUNT(*)::int AS count FROM customer_migration_ledger WHERE dataset_id = $1 AND source_customer_id = $2',
      [datasetId, 'CUST-0008'],
    );
    assertResult(duplicate.rows[0].count === 0, 'Duplicate source ID was migrated.');

    const representative = rows.rows.find((row) =>
      row.deleted_at === null && encryptedCustomerFields.some((field) => row[field] !== null));
    const active = representative ?? rows.rows.find(({ deleted_at }) => deleted_at === null);
    assertResult(active !== undefined, 'No active migrated Customer exists.');
    const readService = createCustomerReadService(createCustomerRepository(client), crypto);
    const dto = await readService.findById(active.id, { id: acceptanceOwnerIds[0], role: 'manager' });
    assertResult(encryptedCustomerFields.every((field) => dto[field] === null || !dto[field].startsWith('enc:v1:')), 'Authorized read returned ciphertext.');
    const source = workbook.customers.find((row) => row.sourceCustomerId === active.source_customer_id);
    assertResult(source !== undefined && dto.name_kana === source.nameKana && dto.email === source.email &&
      dto.phone === source.phone && dto.address === source.address, 'Authorized read did not restore source values.');

    const second = await migrateCustomers(workbook, client, crypto, { datasetId, batchSize: 7 });
    assertResult(second.summary.source_total === 40 && second.summary.inserted === 0 &&
      second.summary.already_migrated === 31 && second.summary.rejected_records === 9, 'Second-run summary mismatch.');
    const finalCount = await client.query('SELECT COUNT(*)::int AS count FROM customer_migration_ledger WHERE dataset_id = $1', [datasetId]);
    assertResult(finalCount.rows[0].count === 31, 'Retry created duplicate Customers.');

    console.log(JSON.stringify({
      first: first.summary,
      second: second.summary,
      database: { customers: 31, active: 28, deleted: 3, plaintext_remaining: 0 },
      authorized_read: 'PASS',
    }));
  } finally {
    await cleanup(client);
    await client.end();
  }
};

main().catch(() => {
  console.error('Customer migration Acceptance failed.');
  process.exitCode = 1;
});
