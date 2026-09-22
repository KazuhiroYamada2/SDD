import type { MaintenanceEvent, MaintenanceRepository, NotificationPhase } from './maintenance-service.js';

type Database = { query<T>(sql: string, values?: readonly unknown[]): Promise<{ rows: T[] }> };
type EventRow = {
  id: string; type: 'PLANNED' | 'EMERGENCY'; starts_at: Date; expected_recovery_at: Date;
  impact: string; contact: string; created_at: Date;
};

const toEvent = (row: EventRow): MaintenanceEvent => ({
  id: row.id, type: row.type, startsAt: row.starts_at, expectedRecoveryAt: row.expected_recovery_at,
  impact: row.impact, contact: row.contact, createdAt: row.created_at,
});

export const createMaintenanceRepository = (database: Database): MaintenanceRepository => ({
  async createEvent(event) {
    await database.query(
      `INSERT INTO maintenance_events (id, type, starts_at, expected_recovery_at, impact, contact, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [event.id, event.type, event.startsAt, event.expectedRecoveryAt, event.impact, event.contact, event.createdAt],
    );
  },
  async findEvent(id) {
    const result = await database.query<EventRow>(
      `SELECT id, type, starts_at, expected_recovery_at, impact, contact, created_at
       FROM maintenance_events WHERE id = $1`, [id],
    );
    return result.rows[0] === undefined ? null : toEvent(result.rows[0]);
  },
  async listActiveRecipients() {
    const result = await database.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE is_active = TRUE ORDER BY id`,
    );
    return result.rows;
  },
  async claimDelivery(eventId, phase, recipientId) {
    const result = await database.query<{ recipient_user_id: string }>(
       `INSERT INTO maintenance_notification_deliveries (
         maintenance_event_id, phase, recipient_user_id, status, attempted_at, first_attempted_at
       ) VALUES ($1, $2, $3, 'PENDING', NOW(), NOW())
       ON CONFLICT (maintenance_event_id, phase, recipient_user_id) DO UPDATE
       SET status = 'PENDING', attempted_at = NOW(), sent_at = NULL,
           provider_message_id = NULL, failure_code = NULL
       WHERE maintenance_notification_deliveries.status = 'FAILED'
       RETURNING recipient_user_id`, [eventId, phase, recipientId],
    );
    return result.rows.length === 1;
  },
  async markSent(eventId, phase, recipientId, providerMessageId) {
    await database.query(
      `UPDATE maintenance_notification_deliveries
       SET status = 'SENT', provider_message_id = $4, sent_at = NOW(), failure_code = NULL
       WHERE maintenance_event_id = $1 AND phase = $2 AND recipient_user_id = $3 AND status = 'PENDING'`,
      [eventId, phase, recipientId, providerMessageId],
    );
  },
  async markFailed(eventId, phase, recipientId, failureCode) {
    await database.query(
      `UPDATE maintenance_notification_deliveries
       SET status = 'FAILED', provider_message_id = NULL, sent_at = NULL, failure_code = $4
       WHERE maintenance_event_id = $1 AND phase = $2 AND recipient_user_id = $3 AND status = 'PENDING'`,
      [eventId, phase, recipientId, failureCode],
    );
  },
});
