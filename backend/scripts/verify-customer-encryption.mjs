import pg from 'pg';
import { createApp } from '../src/app.ts';
import { config } from '../src/config.ts';
import { closeDatabase } from '../src/db.ts';
import { createCustomerCrypto, encryptedCustomerFields } from '../src/customers/customer-crypto.ts';
import { migrateCustomerEncryption } from '../src/customers/customer-encryption-migration.ts';
import { e2eAdmin, e2eManager, e2eStaff } from '../../e2e/fixtures/auth-users.mjs';

const expectedDatabase = 'customer_management_e2e';
const ownerA = '10000000-0000-4000-8000-000000000001';
const ownerB = '10000000-0000-4000-8000-000000000002';
const createdName = 'T604 encrypted customer';
const plaintext = {
  name_kana: 'ティーロクマルヨン',
  email: 't604@example.test',
  phone: '000-0604-0000',
  address: 'T604 synthetic address',
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const safeConnectionString = () => {
  assert(process.env.NODE_ENV === 'e2e', 'T-604 DB safety check failed.');
  assert(config.databaseUrl, 'T-604 DB safety check failed.');
  const url = new URL(config.databaseUrl);
  assert(url.hostname === '127.0.0.1' && url.port === '55432' &&
    decodeURIComponent(url.pathname.slice(1)) === expectedDatabase && url.username === expectedDatabase,
  'T-604 DB safety check failed.');
  return config.databaseUrl;
};

const app = createApp();
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});
const address = server.address();
assert(typeof address === 'object' && address !== null, 'HTTP listener did not start.');
const baseUrl = `http://127.0.0.1:${address.port}`;
const client = new pg.Client({ connectionString: safeConnectionString() });
const crypto = createCustomerCrypto(config.customerEncryption);

const api = async (path, { token, method = 'GET', body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text === '' ? null : JSON.parse(text) };
};

const login = async (user, role) => {
  const response = await api('/api/v1/auth/login', {
    method: 'POST', body: { email: user.email, password: user.password },
  });
  assert(response.status === 200 && typeof response.body?.accessToken === 'string', `${role} login failed with HTTP ${response.status}.`);
  return response.body.accessToken;
};

try {
  await client.connect();
  const adminToken = await login(e2eAdmin, 'admin');
  const managerToken = await login(e2eManager, 'manager');
  const staffToken = await login(e2eStaff, 'staff');

  const created = await api('/api/v1/customers', {
    token: adminToken,
    method: 'POST',
    body: { name: createdName, ...plaintext, category: 'T604', owner_user_id: e2eStaff.id },
  });
  assert(created.status === 201, 'Encrypted Customer create failed.');
  for (const field of encryptedCustomerFields) assert(created.body[field] === plaintext[field], 'Create response was not plaintext DTO.');

  const stored = await client.query(
    'SELECT name_kana, email, phone, address FROM customers WHERE id = $1', [created.body.id],
  );
  for (const field of encryptedCustomerFields) {
    const value = stored.rows[0][field];
    assert(value !== plaintext[field] && value.startsWith('enc:v1:'), 'DB value was not an envelope.');
    crypto.validateEnvelope(field, value);
  }

  for (const token of [staffToken, managerToken, adminToken]) {
    const read = await api(`/api/v1/customers/${created.body.id}`, { token });
    assert(read.status === 200, 'Authorized decrypt failed.');
    for (const field of encryptedCustomerFields) assert(read.body[field] === plaintext[field], 'Read DTO was not decrypted.');
  }
  const list = await api('/api/v1/customers?query=T604', { token: staffToken });
  assert(list.status === 200 && list.body.items.some(({ id }) => id === created.body.id), 'List decrypt failed.');

  const other = await api('/api/v1/customers', {
    token: adminToken, method: 'POST',
    body: { name: 'T604 other owner', email: 'other-t604@example.test', owner_user_id: ownerB },
  });
  assert(other.status === 201, 'Other-owner fixture create failed.');
  const scope = await api(`/api/v1/customers/${other.body.id}`, { token: staffToken });
  assert(scope.status === 404 && scope.body.code === 'CUSTOMER_NOT_FOUND', 'Staff scope response was not hidden.');

  const beforeEdit = await client.query(
    'SELECT name_kana, email, phone, address FROM customers WHERE id = $1', [created.body.id],
  );
  const edit = await api(`/api/v1/customers/${created.body.id}`, {
    token: staffToken, method: 'PATCH', body: { email: 'updated-t604@example.test', phone: null },
  });
  assert(edit.status === 200 && edit.body.email === 'updated-t604@example.test' && edit.body.phone === null,
    'Encrypted Customer edit failed.');
  const afterEdit = await client.query(
    'SELECT name_kana, email, phone, address FROM customers WHERE id = $1', [created.body.id],
  );
  assert(afterEdit.rows[0].email !== beforeEdit.rows[0].email && afterEdit.rows[0].email.startsWith('enc:v1:'),
    'Changed field was not re-encrypted.');
  assert(afterEdit.rows[0].phone === null, 'Null edit was not stored as DB NULL.');
  assert(afterEdit.rows[0].name_kana === beforeEdit.rows[0].name_kana && afterEdit.rows[0].address === beforeEdit.rows[0].address,
    'Omitted encrypted fields changed.');

  const migrationIds = [
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000002',
  ];
  await client.query(
    `INSERT INTO customers (id, name, email, owner_user_id, deleted_at)
    VALUES ($1, 'T604 migration active', 'migration-active@example.test', $3, NULL),
           ($2, 'T604 migration deleted', 'migration-deleted@example.test', $3, NOW())`,
    [migrationIds[0], migrationIds[1], ownerA],
  );
  const migration = await migrateCustomerEncryption(client, crypto);
  assert(migration.updatedCustomers === 2 && migration.encryptedValues === 2, 'Plaintext migration count was unexpected.');
  const migrated = await client.query('SELECT email FROM customers WHERE id = ANY($1::uuid[]) ORDER BY id', [migrationIds]);
  assert(migrated.rows.length === 2 && migrated.rows.every(({ email }) => email.startsWith('enc:v1:')),
    'Active/deleted migration did not encrypt both rows.');
  const rerun = await migrateCustomerEncryption(client, crypto);
  assert(rerun.updatedCustomers === 0 && rerun.encryptedValues === 0, 'Migration was not idempotent.');

  const rollbackIds = [
    '60000000-0000-4000-8000-000000000003',
    '60000000-0000-4000-8000-000000000004',
  ];
  await client.query(
    `INSERT INTO customers (id, name, email, owner_user_id)
    VALUES ($1, 'T604 rollback plain', 'rollback-plain@example.test', $3),
           ($2, 'T604 rollback malformed', 'enc:v1:malformed', $3)`,
    [rollbackIds[0], rollbackIds[1], ownerA],
  );
  let failedClosed = false;
  try { await migrateCustomerEncryption(client, crypto); } catch { failedClosed = true; }
  assert(failedClosed, 'Malformed envelope did not fail closed.');
  const rolledBack = await client.query('SELECT email FROM customers WHERE id = $1', [rollbackIds[0]]);
  assert(rolledBack.rows[0].email === 'rollback-plain@example.test', 'Migration failure did not roll back.');

  console.log(JSON.stringify({
    create: 'PASS', edit: 'PASS', listDetailDecrypt: 'PASS', roleDecrypt: 'PASS', staffScope404: 'PASS',
    databaseEnvelope: 'PASS', nullHandling: 'PASS', activeDeletedMigration: 'PASS',
    migrationIdempotency: 'PASS', malformedRollback: 'PASS',
  }));
} finally {
  await client.query(
    `DELETE FROM customers WHERE name LIKE 'T604 %' OR id::text LIKE '60000000-0000-4000-8000-%'`,
  ).catch(() => undefined);
  await client.end().catch(() => undefined);
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
}
