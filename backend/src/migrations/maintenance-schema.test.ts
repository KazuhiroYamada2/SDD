import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), 'migrations/003_create_maintenance_notifications.sql'), 'utf8');

describe('maintenance notification schema', () => {
  it('defines events, recipient deliveries, constraints, and foreign keys', () => {
    expect(sql).toContain('CREATE TABLE maintenance_events');
    expect(sql).toContain('CREATE TABLE maintenance_notification_deliveries');
    expect(sql).toContain("type IN ('PLANNED', 'EMERGENCY')");
    expect(sql).toContain("phase IN ('INITIAL', 'REMINDER', 'EMERGENCY')");
    expect(sql).toContain("status IN ('PENDING', 'SENT', 'FAILED')");
    expect(sql).toContain('PRIMARY KEY (maintenance_event_id, phase, recipient_user_id)');
    expect(sql).toContain('REFERENCES maintenance_events(id)');
    expect(sql).toContain('REFERENCES users(id)');
  });
});
