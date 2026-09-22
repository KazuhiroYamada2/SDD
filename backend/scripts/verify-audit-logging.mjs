import pg from 'pg';
import request from 'supertest';
import { createApp } from '../src/app.ts';
import { closeDatabase } from '../src/db.ts';
import { e2eAdmin, e2eManager } from '../../e2e/fixtures/auth-users.mjs';

const expectedDatabase = 'customer_management_e2e';
const customerUpdateId = '20000000-0000-4000-8000-000000000001';
const customerDeleteId = '20000000-0000-4000-8000-000000000002';
const rollbackUpdateId = '20000000-0000-4000-8000-000000000003';
const rollbackDeleteId = '20000000-0000-4000-8000-000000000004';
const rollbackRoleId = '10000000-0000-4000-8000-000000000002';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const safeConnectionString = () => {
  if (process.env.NODE_ENV !== 'e2e' || !process.env.DATABASE_URL) {
    throw new Error('T-108 safety check failed: dedicated E2E configuration is required.');
  }
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname !== '127.0.0.1' || url.port !== '55432' ||
      decodeURIComponent(url.pathname.slice(1)) !== expectedDatabase || url.username !== expectedDatabase) {
    throw new Error('T-108 safety check failed: DATABASE_URL must target the dedicated local E2E database.');
  }
  return process.env.DATABASE_URL;
};

const auditFor = async (client, action, requestId) => {
  const result = await client.query(
    `SELECT user_id, action, resource_type, resource_id, request_id, ip_address
    FROM audit_logs WHERE action = $1 AND request_id = $2`,
    [action, requestId],
  );
  assert(result.rows.length === 1, `T-108 audit verification failed for ${action}.`);
  return result.rows[0];
};

const authorize = (builder, token) => builder.set('Authorization', `Bearer ${token}`);

const main = async () => {
  const client = new pg.Client({ connectionString: safeConnectionString() });
  const accessRecords = [];
  const accessLog = (record) => accessRecords.push(record);
  const operationalLog = () => undefined;
  try {
    await client.connect();
    const identity = await client.query(
      'SELECT current_database() AS database_name, current_user AS user_name, inet_server_port() AS port',
    );
    const identityRow = identity.rows[0];
    assert(identityRow.database_name === expectedDatabase && identityRow.user_name === expectedDatabase && identityRow.port === 5432,
      'T-108 safety check failed: connected database identity does not match.');

    const app = createApp({ accessLog, operationalLog });
    const login = await request(app).post('/api/v1/auth/login').send({
      email: e2eAdmin.email,
      password: e2eAdmin.password,
    });
    assert(login.status === 200 && typeof login.body.accessToken === 'string', 'T-108 Login success verification failed.');
    const token = login.body.accessToken;
    const loginAudit = await auditFor(client, 'LOGIN_SUCCESS', login.headers['x-request-id']);
    assert(loginAudit.user_id === e2eAdmin.id && loginAudit.resource_type === 'AUTH' && loginAudit.resource_id === null,
      'T-108 LOGIN_SUCCESS audit fields are invalid.');

    const list = await authorize(request(app).get('/api/v1/customers?query=A'), token);
    assert(list.status === 200, 'T-108 Customer list verification failed.');
    const listAudit = await auditFor(client, 'CUSTOMER_LIST', list.headers['x-request-id']);
    const listAccess = accessRecords.find((record) => record.request_id === list.headers['x-request-id']);
    assert(listAudit.user_id === e2eAdmin.id && listAudit.resource_type === 'CUSTOMER_COLLECTION' && listAudit.resource_id === null,
      'T-108 CUSTOMER_LIST audit fields are invalid.');
    assert(listAccess?.request_id === listAudit.request_id && listAccess?.route === '/api/v1/customers',
      'T-108 request ID correlation verification failed.');

    const update = await authorize(request(app).patch(`/api/v1/customers/${customerUpdateId}`).send({ category: 'T108' }), token);
    const remove = await authorize(request(app).delete(`/api/v1/customers/${customerDeleteId}`), token);
    const role = await authorize(request(app).patch(`/api/v1/users/${e2eManager.id}/role`).send({ role: 'staff' }), token);
    assert(update.status === 200 && remove.status === 204 && role.status === 200,
      'T-108 successful write verification failed.');
    const updateAudit = await auditFor(client, 'CUSTOMER_UPDATE', update.headers['x-request-id']);
    const deleteAudit = await auditFor(client, 'CUSTOMER_DELETE', remove.headers['x-request-id']);
    const roleAudit = await auditFor(client, 'USER_ROLE_CHANGE', role.headers['x-request-id']);
    assert(updateAudit.resource_id === customerUpdateId && deleteAudit.resource_id === customerDeleteId &&
      roleAudit.resource_id === e2eManager.id, 'T-108 successful write audit targets are invalid.');
    const committed = await client.query(
      `SELECT
        (SELECT category FROM customers WHERE id = $1) AS category,
        (SELECT deleted_at IS NOT NULL FROM customers WHERE id = $2) AS deleted,
        (SELECT role FROM users WHERE id = $3) AS role`,
      [customerUpdateId, customerDeleteId, e2eManager.id],
    );
    assert(committed.rows[0].category === 'T108' && committed.rows[0].deleted === true && committed.rows[0].role === 'staff',
      'T-108 business and audit commit verification failed.');

    const failingAudit = { insert: async () => { throw new Error('injected audit failure'); } };
    const failureApp = createApp({ auditRepository: failingAudit, accessLog, operationalLog });
    const failedUpdate = await authorize(
      request(failureApp).patch(`/api/v1/customers/${rollbackUpdateId}`).send({ category: 'SHOULD_ROLLBACK' }), token,
    );
    const failedDelete = await authorize(request(failureApp).delete(`/api/v1/customers/${rollbackDeleteId}`), token);
    const failedRole = await authorize(
      request(failureApp).patch(`/api/v1/users/${rollbackRoleId}/role`).send({ role: 'manager' }), token,
    );
    assert(failedUpdate.status === 500 && failedDelete.status === 500 && failedRole.status === 500,
      'T-108 mandatory audit failure response verification failed.');
    const rolledBack = await client.query(
      `SELECT
        (SELECT category FROM customers WHERE id = $1) AS category,
        (SELECT deleted_at IS NULL FROM customers WHERE id = $2) AS active,
        (SELECT role FROM users WHERE id = $3) AS role`,
      [rollbackUpdateId, rollbackDeleteId, rollbackRoleId],
    );
    assert(rolledBack.rows[0].category === 'B' && rolledBack.rows[0].active === true && rolledBack.rows[0].role === 'staff',
      'T-108 audit failure rollback verification failed.');

    const counts = await client.query('SELECT action, COUNT(*)::int AS count FROM audit_logs GROUP BY action ORDER BY action');
    process.stdout.write(`${JSON.stringify({
      database: expectedDatabase,
      correlation: 'PASS',
      successfulAtomicWrites: 3,
      rolledBackAuditFailures: 3,
      auditActionCounts: counts.rows,
    })}\n`);
  } finally {
    await client.end().catch(() => undefined);
    await closeDatabase();
  }
};

main().catch((error) => {
  let password = '';
  try { password = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).password : ''; }
  catch { /* The safety check reports invalid configuration. */ }
  const message = error instanceof Error ? error.message : 'T-108 verification failed.';
  process.stderr.write(`${password ? message.replaceAll(password, '[redacted]') : message}\n`);
  process.exitCode = 1;
});
