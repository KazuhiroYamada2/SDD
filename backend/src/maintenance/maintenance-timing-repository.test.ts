import { describe, expect, it, vi } from 'vitest';
import { createMaintenanceTimingRepository } from './maintenance-timing-repository.js';

describe('maintenance timing repository', () => {
  it('loads first and latest attempt timestamps without recipient email', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'event', type: 'EMERGENCY', starts_at: new Date(2), created_at: new Date(1) }] })
      .mockResolvedValueOnce({ rows: [{ phase: 'EMERGENCY', status: 'SENT', attempted_at: new Date(3), first_attempted_at: new Date(2), sent_at: new Date(4) }] });
    const repository = createMaintenanceTimingRepository({ query });
    await expect(repository.findEvent('event')).resolves.toMatchObject({ id: 'event', type: 'EMERGENCY' });
    await expect(repository.listDeliveries('event')).resolves.toEqual([{
      phase: 'EMERGENCY', status: 'SENT', attemptedAt: new Date(3), firstAttemptedAt: new Date(2), sentAt: new Date(4),
    }]);
    expect(query.mock.calls[1]![0]).not.toContain('email');
  });
});
