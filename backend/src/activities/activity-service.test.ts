import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth-types.js';
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
const staff: AuthenticatedUser = { id: input.user_id, role: 'staff' };
const otherOwnerId = '22222222-2222-4222-8222-222222222222';

describe('create activity service', () => {
  it('rejects a missing customer before creating an activity', async () => {
    const create = vi.fn();
    const service = createCreateActivityService({
      activityRepository: { create, findByCustomerId: vi.fn() },
      referenceRepository: {
        customerExists: vi.fn().mockResolvedValue(false),
        findCustomerReference: vi.fn(),
        userExists: vi.fn(),
      },
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
        findCustomerReference: vi.fn(),
        userExists: vi.fn().mockResolvedValue(false),
      },
    });

    await expect(service.execute(input)).rejects.toBeInstanceOf(UserNotFoundError);
    expect(create).not.toHaveBeenCalled();
  });

  it('retrieves a staff customer activity history when the customer is in scope', async () => {
    const activities = [{ id: '8a1f2d44-1234-4abc-8def-123456789abc' }];
    const findByCustomerId = vi.fn().mockResolvedValue(activities);
    const service = createCreateActivityService({
      activityRepository: { create: vi.fn(), findByCustomerId },
      referenceRepository: {
        customerExists: vi.fn(),
        findCustomerReference: vi.fn().mockResolvedValue({
          id: input.customer_id, owner_user_id: staff.id,
        }),
        userExists: vi.fn(),
      },
    });

    await expect(service.findByCustomerId(input.customer_id, staff)).resolves.toEqual(activities);
    expect(findByCustomerId).toHaveBeenCalledWith(input.customer_id);
  });

  it('hides another owner customer from staff without querying activities', async () => {
    const findByCustomerId = vi.fn();
    const service = createCreateActivityService({
      activityRepository: { create: vi.fn(), findByCustomerId },
      referenceRepository: {
        customerExists: vi.fn(),
        findCustomerReference: vi.fn().mockResolvedValue({
          id: input.customer_id, owner_user_id: otherOwnerId,
        }),
        userExists: vi.fn(),
      },
    });

    await expect(service.findByCustomerId(input.customer_id, staff))
      .rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(findByCustomerId).not.toHaveBeenCalled();
  });

  it('rejects a missing customer without querying activities', async () => {
    const findByCustomerId = vi.fn();
    const service = createCreateActivityService({
      activityRepository: { create: vi.fn(), findByCustomerId },
      referenceRepository: {
        customerExists: vi.fn(),
        findCustomerReference: vi.fn().mockResolvedValue(null),
        userExists: vi.fn(),
      },
    });

    await expect(service.findByCustomerId(input.customer_id, staff))
      .rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(findByCustomerId).not.toHaveBeenCalled();
  });

  it.each(['manager', 'admin'] as const)('lets %s read another owner customer activities', async (role) => {
    const activities = [{ id: '8a1f2d44-1234-4abc-8def-123456789abc' }];
    const findByCustomerId = vi.fn().mockResolvedValue(activities);
    const service = createCreateActivityService({
      activityRepository: { create: vi.fn(), findByCustomerId },
      referenceRepository: {
        customerExists: vi.fn(),
        findCustomerReference: vi.fn().mockResolvedValue({
          id: input.customer_id, owner_user_id: otherOwnerId,
        }),
        userExists: vi.fn(),
      },
    });

    await expect(service.findByCustomerId(input.customer_id, { id: staff.id, role }))
      .resolves.toEqual(activities);
    expect(findByCustomerId).toHaveBeenCalledWith(input.customer_id);
  });
});
