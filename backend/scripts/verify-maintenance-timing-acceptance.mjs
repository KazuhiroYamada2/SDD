import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createMaintenanceTimingRepository } from '../src/maintenance/maintenance-timing-repository.ts';
import { evaluateMaintenanceEventTiming } from '../src/maintenance/maintenance-timing.ts';

const connectionString = process.env.DATABASE_URL;
if (!connectionString || process.env.NODE_ENV !== 'e2e') throw new Error('Maintenance timing Acceptance requires the dedicated E2E database.');
const url = new URL(connectionString);
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/customer_management_e2e') {
  throw new Error('Maintenance timing Acceptance requires the dedicated E2E database.');
}

const pool = new pg.Pool({ connectionString });
const repository = createMaintenanceTimingRepository(pool);
const eventIds = [];

async function addScenario({ type, startsAt, createdAt, phase, status = 'SENT', firstAttemptedAt, attemptedAt = firstAttemptedAt, sentAt }) {
  const eventId = randomUUID();
  eventIds.push(eventId);
  const user = await pool.query('SELECT id FROM users WHERE is_active = TRUE ORDER BY id LIMIT 1');
  await pool.query(
    `INSERT INTO maintenance_events (id, type, starts_at, expected_recovery_at, impact, contact, created_at)
     VALUES ($1, $2, $3, $4, 'Synthetic timing acceptance.', 'Synthetic operations contact.', $5)`,
    [eventId, type, startsAt, new Date(startsAt.getTime() + 60 * 60_000), createdAt],
  );
  await pool.query(
    `INSERT INTO maintenance_notification_deliveries (
       maintenance_event_id, phase, recipient_user_id, status, attempted_at, first_attempted_at,
       sent_at, provider_message_id, failure_code
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [eventId, phase, user.rows[0].id, status, attemptedAt, firstAttemptedAt, sentAt ?? null,
      status === 'SENT' ? 'synthetic-message' : null, status === 'FAILED' ? 'SES_SEND_FAILED' : null],
  );
  const event = await repository.findEvent(eventId);
  const summary = evaluateMaintenanceEventTiming(event, await repository.listDeliveries(eventId))[0];
  return { eventId, summary };
}

try {
  const startsAt = new Date('2026-10-09T04:00:00Z');
  const createdAt = new Date('2026-10-01T00:00:00Z');
  const initialDeadline = new Date('2026-10-06T04:00:00Z');
  const scenarios = {
    A: await addScenario({ type: 'PLANNED', startsAt, createdAt, phase: 'INITIAL', firstAttemptedAt: initialDeadline, sentAt: initialDeadline }),
    B: await addScenario({ type: 'PLANNED', startsAt, createdAt, phase: 'INITIAL', firstAttemptedAt: new Date(initialDeadline.getTime() + 1000), sentAt: new Date(initialDeadline.getTime() + 1000) }),
    C: await addScenario({ type: 'PLANNED', startsAt, createdAt, phase: 'REMINDER', firstAttemptedAt: new Date(startsAt.getTime() - 60 * 60_000), sentAt: new Date(startsAt.getTime() - 60 * 60_000) }),
    D: await addScenario({ type: 'PLANNED', startsAt, createdAt, phase: 'REMINDER', firstAttemptedAt: new Date(startsAt.getTime() - 65 * 60_000 - 1000), sentAt: new Date(startsAt.getTime() - 65 * 60_000 - 1000) }),
    E: await addScenario({ type: 'PLANNED', startsAt, createdAt, phase: 'REMINDER', firstAttemptedAt: new Date(startsAt.getTime() - 55 * 60_000 + 1000), sentAt: new Date(startsAt.getTime() - 55 * 60_000 + 1000) }),
    F: await addScenario({ type: 'EMERGENCY', startsAt, createdAt, phase: 'EMERGENCY', firstAttemptedAt: new Date(createdAt.getTime() + 15 * 60_000), sentAt: new Date(createdAt.getTime() + 15 * 60_000) }),
    G: await addScenario({ type: 'EMERGENCY', startsAt, createdAt, phase: 'EMERGENCY', firstAttemptedAt: new Date(createdAt.getTime() + 15 * 60_000 + 1000), sentAt: new Date(createdAt.getTime() + 15 * 60_000 + 1000) }),
    H: await addScenario({ type: 'EMERGENCY', startsAt, createdAt, phase: 'EMERGENCY', firstAttemptedAt: new Date(createdAt.getTime() + 5 * 60_000), attemptedAt: new Date(createdAt.getTime() + 20 * 60_000), sentAt: new Date(createdAt.getTime() + 20 * 60_000) }),
  };
  const actual = Object.fromEntries(Object.entries(scenarios).map(([key, value]) => [key, { result: value.summary.result, reasonCode: Object.keys(value.summary.reasonCounts)[0] }]));
  const expected = {
    A: { result: 'PASS', reasonCode: 'INITIAL_ON_TIME' }, B: { result: 'FAIL', reasonCode: 'INITIAL_LATE' },
    C: { result: 'PASS', reasonCode: 'REMINDER_ON_TIME' }, D: { result: 'FAIL', reasonCode: 'REMINDER_TOO_EARLY' },
    E: { result: 'FAIL', reasonCode: 'REMINDER_LATE' }, F: { result: 'PASS', reasonCode: 'EMERGENCY_ON_TIME' },
    G: { result: 'FAIL', reasonCode: 'EMERGENCY_LATE' }, H: { result: 'PASS', reasonCode: 'EMERGENCY_ON_TIME' },
  };
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Maintenance timing scenario result mismatch.');

  const testKeyId = 'timing-acceptance-key';
  const childEnvironment = {
    ...process.env,
    CUSTOMER_ENCRYPTION_CURRENT_KEY_ID: testKeyId,
    CUSTOMER_ENCRYPTION_KEYS_JSON: JSON.stringify({ [testKeyId]: Buffer.alloc(32, 7).toString('base64') }),
  };
  const runCli = (eventId) => spawnSync(process.execPath, ['--env-file=../.env.e2e', '--import', 'tsx', 'scripts/verify-maintenance-timing.mjs', '--event-id', eventId], {
    cwd: process.cwd(), env: childEnvironment, encoding: 'utf8', windowsHide: true,
  });
  const passCli = runCli(scenarios.A.eventId);
  const failCli = runCli(scenarios.B.eventId);
  if (passCli.status !== 0 || failCli.status !== 2) {
    throw new Error(`Maintenance timing CLI exit code mismatch: pass=${passCli.status}, fail=${failCli.status}.`);
  }

  const retryEvidence = await pool.query(
    `SELECT first_attempted_at, attempted_at FROM maintenance_notification_deliveries WHERE maintenance_event_id = $1`,
    [scenarios.H.eventId],
  );
  if (!(retryEvidence.rows[0].first_attempted_at < retryEvidence.rows[0].attempted_at)) throw new Error('First attempt evidence was not preserved.');
  console.log(JSON.stringify({ status: 'PASS', scenarios: actual, cliExitCodes: { pass: 0, fail: 2 }, firstAttemptPreserved: true }));
} finally {
  if (eventIds.length > 0) {
    await pool.query('DELETE FROM maintenance_notification_deliveries WHERE maintenance_event_id = ANY($1::uuid[])', [eventIds]);
    await pool.query('DELETE FROM maintenance_events WHERE id = ANY($1::uuid[])', [eventIds]);
  }
  await pool.end();
}
