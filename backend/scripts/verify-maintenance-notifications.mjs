import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { createMaintenanceRepository } from '../src/maintenance/maintenance-repository.ts';
import { createMaintenanceEvent, sendMaintenanceNotification } from '../src/maintenance/maintenance-service.ts';

const connectionString = process.env.DATABASE_URL;
if (!connectionString || process.env.NODE_ENV !== 'e2e' || new URL(connectionString).hostname !== '127.0.0.1' || new URL(connectionString).port !== '55432') {
  throw new Error('Maintenance Acceptance requires the dedicated E2E database.');
}
const pool = new pg.Pool({ connectionString });
const repository = createMaintenanceRepository(pool);
const inactiveId = randomUUID();

const transport = (failFirst = false) => {
  let calls = 0;
  return {
    messages: [],
    async send(message) {
      calls += 1;
      if (failFirst && calls === 1) throw new Error('synthetic provider failure');
      this.messages.push(message);
      return { messageId: `fake-${calls}` };
    },
  };
};

try {
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
     VALUES ($1, $2, 'acceptance-no-login', 'staff', FALSE, NOW(), NOW())`,
    [inactiveId, 'inactive-maintenance@example.test'],
  );
  const planned = await createMaintenanceEvent(repository, {
    type: 'PLANNED', startsAt: '2026-10-01T10:00:00+09:00', expectedRecoveryAt: '2026-10-01T11:00:00+09:00',
    impact: 'Synthetic acceptance impact.', contact: 'Synthetic operations contact.',
  });
  const initialTransport = transport();
  const initial = await sendMaintenanceNotification(repository, initialTransport, planned.id, 'INITIAL');
  const initialAgain = await sendMaintenanceNotification(repository, initialTransport, planned.id, 'INITIAL');
  const reminder = await sendMaintenanceNotification(repository, transport(), planned.id, 'REMINDER');

  const emergency = await createMaintenanceEvent(repository, {
    type: 'EMERGENCY', startsAt: '2026-10-02T10:00:00+09:00', expectedRecoveryAt: '2026-10-02T11:00:00+09:00',
    impact: 'Synthetic emergency impact.', contact: 'Synthetic operations contact.',
  });
  const emergencyFirst = await sendMaintenanceNotification(repository, transport(true), emergency.id, 'EMERGENCY');
  const emergencyRetry = await sendMaintenanceNotification(repository, transport(), emergency.id, 'EMERGENCY');
  const records = await pool.query(
    `SELECT phase, status, COUNT(*)::int AS count
     FROM maintenance_notification_deliveries GROUP BY phase, status ORDER BY phase, status`,
  );
  const inactive = await pool.query(
    `SELECT COUNT(*)::int AS count FROM maintenance_notification_deliveries WHERE recipient_user_id = $1`, [inactiveId],
  );
  const expected = {
    initial: { target: 4, sent: 4, failed: 0, skipped: 0 },
    initialAgain: { target: 4, sent: 0, failed: 0, skipped: 4 },
    reminder: { target: 4, sent: 4, failed: 0, skipped: 0 },
    emergencyFirst: { target: 4, sent: 3, failed: 1, skipped: 0 },
    emergencyRetry: { target: 4, sent: 1, failed: 0, skipped: 3 },
  };
  const actual = { initial, initialAgain, reminder, emergencyFirst, emergencyRetry };
  if (JSON.stringify(actual) !== JSON.stringify(expected) || inactive.rows[0].count !== 0 ||
      records.rows.some((row) => row.status !== 'SENT') || records.rows.reduce((sum, row) => sum + row.count, 0) !== 12) {
    throw new Error('Maintenance Acceptance failed.');
  }
  console.log(JSON.stringify({ status: 'PASS', ...actual, deliveryRecords: 12, inactiveDeliveries: 0 }));
} finally {
  await pool.query('DELETE FROM maintenance_notification_deliveries');
  await pool.query('DELETE FROM maintenance_events');
  await pool.query('DELETE FROM users WHERE id = $1', [inactiveId]);
  await pool.end();
}

