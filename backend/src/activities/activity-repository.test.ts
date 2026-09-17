import { describe, expect, it, vi } from 'vitest';
import { createActivityRepository } from './activity-repository.js';

describe('createActivityRepository', () => {
  it('inserts an activity related to a customer and user with a parameterized query', async () => {
    const activity = {
      id: '8a1f2d44-1234-4abc-8def-123456789abc',
      customer_id: 'c0a80101-1234-4abc-8def-123456789abc',
      user_id: 'd0a80101-1234-4abc-8def-123456789abc',
      activity_type: 'visit' as const,
      visited_at: new Date('2026-09-17T01:00:00.000Z'),
      meeting_note: '商談内容',
      next_visit_at: new Date('2026-09-24T01:00:00.000Z'),
      created_at: new Date('2026-09-17T01:00:00.000Z'),
      updated_at: new Date('2026-09-17T01:00:00.000Z'),
    };
    const query = vi.fn().mockResolvedValue({ rows: [activity] });
    const repository = createActivityRepository({ query });

    await expect(repository.create({
      customer_id: activity.customer_id,
      user_id: activity.user_id,
      activity_type: activity.activity_type,
      visited_at: activity.visited_at,
      meeting_note: activity.meeting_note,
      next_visit_at: activity.next_visit_at,
    })).resolves.toEqual(activity);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('VALUES ($1, $2, $3, $4, $5, $6, $7)'),
      [
        expect.any(String),
        activity.customer_id,
        activity.user_id,
        activity.activity_type,
        activity.visited_at,
        activity.meeting_note,
        activity.next_visit_at,
      ],
    );
  });

  it('retrieves a customer activity history in descending creation order', async () => {
    const customerId = 'c0a80101-1234-4abc-8def-123456789abc';
    const activities = [{ id: '8a1f2d44-1234-4abc-8def-123456789abc' }];
    const query = vi.fn().mockResolvedValue({ rows: activities });
    const repository = createActivityRepository({ query });

    await expect(repository.findByCustomerId(customerId)).resolves.toEqual(activities);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE customer_id = $1'),
      [customerId],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY created_at DESC'),
      [customerId],
    );
  });
});
