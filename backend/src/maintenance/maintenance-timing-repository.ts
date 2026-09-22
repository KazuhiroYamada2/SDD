import type { TimingDelivery, TimingEvent } from './maintenance-timing.js';

type Database = { query<T>(sql: string, values?: readonly unknown[]): Promise<{ rows: T[] }> };

export function createMaintenanceTimingRepository(database: Database) {
  return {
    async findEvent(id: string): Promise<TimingEvent | null> {
      const result = await database.query<{
        id: string; type: 'PLANNED' | 'EMERGENCY'; starts_at: Date; created_at: Date;
      }>(`SELECT id, type, starts_at, created_at FROM maintenance_events WHERE id = $1`, [id]);
      const row = result.rows[0];
      return row === undefined ? null : { id: row.id, type: row.type, startsAt: row.starts_at, createdAt: row.created_at };
    },
    async listDeliveries(eventId: string): Promise<TimingDelivery[]> {
      const result = await database.query<{
        phase: TimingDelivery['phase']; status: TimingDelivery['status']; attempted_at: Date;
        first_attempted_at: Date; sent_at: Date | null;
      }>(`SELECT phase, status, attempted_at, first_attempted_at, sent_at
          FROM maintenance_notification_deliveries
          WHERE maintenance_event_id = $1
          ORDER BY phase, recipient_user_id`, [eventId]);
      return result.rows.map((row) => ({
        phase: row.phase, status: row.status, attemptedAt: row.attempted_at,
        firstAttemptedAt: row.first_attempted_at, sentAt: row.sent_at,
      }));
    },
  };
}
