import { describe, expect, it, vi } from 'vitest';
import { createMaintenanceRepository } from './maintenance-repository.js';

describe('maintenance repository idempotency', () => {
  it('uses the event, phase, recipient conflict key and retries only FAILED records', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ recipient_user_id: 'u1' }] });
    const claimed = await createMaintenanceRepository({ query }).claimDelivery('event', 'INITIAL', 'u1');
    expect(claimed).toBe(true);
    expect(query.mock.calls[0]![0]).toContain('ON CONFLICT (maintenance_event_id, phase, recipient_user_id)');
    expect(query.mock.calls[0]![0]).toContain("status = 'FAILED'");
  });
});
