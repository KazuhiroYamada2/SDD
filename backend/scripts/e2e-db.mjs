import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import * as argon2 from 'argon2';
import { e2eManager } from '../../e2e/fixtures/auth-manager.mjs';

const expectedDatabase = 'customer_management_e2e';
const tables = ['audit_logs', 'sales_records', 'activities', 'customers', 'users'];
const fixture = {
  users: [
    ['10000000-0000-4000-8000-000000000001', 'sales-a@example.com'],
    ['10000000-0000-4000-8000-000000000002', 'sales-b@example.com'],
  ],
  customers: [
    ['20000000-0000-4000-8000-000000000001', 'A1', 'A', 0, null],
    ['20000000-0000-4000-8000-000000000002', 'A2', 'A', 0, null],
    ['20000000-0000-4000-8000-000000000003', 'B1', 'B', 1, null],
    ['20000000-0000-4000-8000-000000000004', 'B2', 'B', 1, null],
    ['20000000-0000-4000-8000-000000000005', 'N1', null, 0, null],
    ['20000000-0000-4000-8000-000000000006', 'D1', 'A', 0, '2026-01-01T00:00:00Z'],
  ],
  sales: [
    ['2026-01-14', 0, 0, '900.00'],
    ['2026-01-15', 0, 0, '1000.00'],
    ['2026-01-31', 0, 1, '2000.00'],
    ['2026-03-01', 0, 0, '500.00'],
    ['2026-03-10', 1, 2, '1500.00'],
    ['2026-03-11', 1, 2, '700.00'],
    ['2026-04-02', 0, 1, '100.00'],
    ['2026-04-03', 1, 3, '100.00'],
  ],
};

function safeConnectionString() {
  if (process.env.NODE_ENV !== 'e2e') throw new Error('E2E DB safety check failed: NODE_ENV must be e2e.');
  if (!process.env.DATABASE_URL) throw new Error('E2E DB safety check failed: DATABASE_URL is required.');
  let url;
  try { url = new URL(process.env.DATABASE_URL); }
  catch { throw new Error('E2E DB safety check failed: invalid DATABASE_URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      decodeURIComponent(url.pathname.slice(1)) !== expectedDatabase ||
      url.hostname !== '127.0.0.1' || url.port !== '55432' ||
      url.username !== expectedDatabase) {
    throw new Error('E2E DB safety check failed: DATABASE_URL must target the dedicated local E2E database.');
  }
  return process.env.DATABASE_URL;
}

async function checkConnection(client) {
  const result = await client.query('SELECT current_database() AS database_name, current_user AS user_name, inet_server_port() AS port');
  const row = result.rows[0];
  if (row.database_name !== expectedDatabase || row.user_name !== expectedDatabase || row.port !== 5432) {
    throw new Error('E2E DB safety check failed: connected database identity does not match.');
  }
}

async function migrate(client) {
  const path = fileURLToPath(new URL('../migrations/001_create_core_schema.sql', import.meta.url));
  await client.query(await readFile(path, 'utf8'));
}

async function seed(client) {
  for (const [id, email] of fixture.users) {
    await client.query(
      'INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5)',
      [id, email, 'e2e-fixture-no-login', 'staff', '2026-01-01T00:00:00Z'],
    );
  }
  const managerPasswordHash = await argon2.hash(e2eManager.password, {
    type: argon2.argon2id,
    memoryCost: 19 * 1024,
    timeCost: 2,
    parallelism: 1,
  });
  await client.query(
    'INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, true, $5, $5)',
    [e2eManager.id, e2eManager.email, managerPasswordHash, e2eManager.role, '2026-01-01T00:00:00Z'],
  );
  for (const [id, name, category, owner, deletedAt] of fixture.customers) {
    await client.query(
      'INSERT INTO customers (id, name, category, owner_user_id, deleted_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $6)',
      [id, name, category, fixture.users[owner][0], deletedAt, '2026-01-01T00:00:00Z'],
    );
  }
  for (const [index, [date, user, customer, amount]] of fixture.sales.entries()) {
    await client.query(
      'INSERT INTO sales_records (id, customer_id, user_id, amount, recorded_on, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $6)',
      [`30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, fixture.customers[customer][0], fixture.users[user][0], amount, date, '2026-01-01T00:00:00Z'],
    );
  }
}

async function verify(client) {
  const counts = {};
  for (const table of tables) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = result.rows[0].count;
  }
  if (JSON.stringify(counts) !== JSON.stringify({ audit_logs: 0, sales_records: 8, activities: 0, customers: 6, users: 3 })) {
    throw new Error('E2E fixture verification failed: unexpected row counts.');
  }
  const manager = await client.query(`SELECT id, email, role, is_active,
      password_hash LIKE '$argon2id$%' AS valid_hash_format,
      NOT EXISTS (SELECT 1 FROM customers WHERE owner_user_id = users.id) AS owns_no_customers,
      NOT EXISTS (SELECT 1 FROM sales_records WHERE user_id = users.id) AS has_no_sales
    FROM users WHERE id = $1`, [e2eManager.id]);
  if (manager.rows.length !== 1 || manager.rows[0].email !== e2eManager.email ||
      manager.rows[0].role !== e2eManager.role || manager.rows[0].is_active !== true ||
      manager.rows[0].valid_hash_format !== true || manager.rows[0].owns_no_customers !== true ||
      manager.rows[0].has_no_sales !== true) {
    throw new Error('E2E fixture verification failed: manager authentication fixture is invalid.');
  }
  const result = await client.query(`SELECT u.email, c.name, c.category, c.deleted_at IS NOT NULL AS deleted,
      COALESCE(su.email, '') AS sales_email,
      COALESCE(TO_CHAR(s.recorded_on, 'YYYY-MM-DD'), '') AS recorded_on, COALESCE(s.amount::text, '') AS amount
    FROM customers c JOIN users u ON u.id = c.owner_user_id
    LEFT JOIN sales_records s ON s.customer_id = c.id
    LEFT JOIN users su ON su.id = s.user_id
    ORDER BY c.name, s.recorded_on`);
  const expected = [
    ['sales-a@example.com','A1','A',false,'sales-a@example.com','2026-01-14','900.00'],
    ['sales-a@example.com','A1','A',false,'sales-a@example.com','2026-01-15','1000.00'],
    ['sales-a@example.com','A1','A',false,'sales-a@example.com','2026-03-01','500.00'],
    ['sales-a@example.com','A2','A',false,'sales-a@example.com','2026-01-31','2000.00'],
    ['sales-a@example.com','A2','A',false,'sales-a@example.com','2026-04-02','100.00'],
    ['sales-b@example.com','B1','B',false,'sales-b@example.com','2026-03-10','1500.00'],
    ['sales-b@example.com','B1','B',false,'sales-b@example.com','2026-03-11','700.00'],
    ['sales-b@example.com','B2','B',false,'sales-b@example.com','2026-04-03','100.00'],
    ['sales-a@example.com','D1','A',true,'','',''],
    ['sales-a@example.com','N1',null,false,'','',''],
  ];
  const actual = result.rows.map((row) => [row.email, row.name, row.category, row.deleted, row.sales_email, row.recorded_on, row.amount]);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('E2E fixture verification failed: unexpected values.');
  return counts;
}

async function main() {
  const mode = process.argv[2];
  if (!['migrate', 'seed', 'reset'].includes(mode)) throw new Error('Usage: e2e-db.mjs migrate|seed|reset');
  const connectionString = safeConnectionString();
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    await checkConnection(client);
    await client.query('BEGIN');
    if (mode === 'reset') {
      await client.query(`DROP TABLE IF EXISTS ${tables.join(', ')} CASCADE`);
    }
    if (mode === 'reset' || mode === 'migrate') await migrate(client);
    if (mode === 'seed') await client.query(`TRUNCATE ${tables.join(', ')} CASCADE`);
    if (mode === 'reset' || mode === 'seed') await seed(client);
    const counts = mode === 'migrate' ? undefined : await verify(client);
    await client.query('COMMIT');
    console.log(JSON.stringify({ mode, database: expectedDatabase, counts }));
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* No transaction was started. */ }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  let password = '';
  try { password = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).password : ''; }
  catch { /* Invalid URL is already reported by the safety check. */ }
  console.error(password ? error.message.replaceAll(password, '[redacted]') : error.message);
  process.exitCode = 1;
});
