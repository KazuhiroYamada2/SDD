import { describe, expect, it, vi } from 'vitest';
import type { CreateActivityInput } from './activity-repository.js';
import { CustomerNotFoundError, UserNotFoundError, createCreateActivityService } from './activity-service.js';

const input: CreateActivityInput = {
  customer_id: '8a1f2d44-1234-4abc-8def-123456789abc',
  user_id: 'c0a80101-1234-4abc-8def-123456789abc',
  activity_type: 'visit',
  visited_at: null,
  meeting_note: null,
  next_visit_at: null,
};

describe('create activity service', () => {
  it('rejects a missing customer before creating an activity', async () => {
    const create = vi.fn();
    const service = createCreateActivityService({
      activityRepository: { create, findByCustomerId: vi.fn() },
      referenceRepository: { customerExists: vi.fn().mockResolvedValue(false), userExists: vi.fn() },
    });

    await expect(service.execute(input)).rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a missing user before creating an activity', async () => {
    const create = vi.fn();
    const service = createCreateActivityService({
      activityRepository: { create, findByCustomerId: vi.fn() },
      referenceRepository: {
        customerExists: vi.fn().mockResolvedValue(true),
        userExists: vi.fn().mockResolvedValue(false),
      },
    });

    await expect(service.execute(input)).rejects.toBeInstanceOf(UserNotFoundError);
    expect(create).not.toHaveBeenCalled();
  });

  it('retrieves a customer activity history after confirming the customer exists', async () => {
    const activities = [{ id: '8a1f2d44-1234-4abc-8def-123456789abc' }];
    const findByCustomerId = vi.fn().mockResolvedValue(activities);
    const service = createCreateActivityService({
      activityRepository: { create: vi.fn(), findByCustomerId },
      referenceRepository: {
        customerExists: vi.fn().mockResolvedValue(true),
        userExists: vi.fn(),
      },
    });

    await expect(service.findByCustomerId(input.customer_id)).resolves.toEqual(activities);
    expect(findByCustomerId).toHaveBeenCalledWith(input.customer_id);
  });
});
