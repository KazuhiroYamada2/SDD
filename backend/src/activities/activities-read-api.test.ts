import { describe, expect, it, vi } from 'vitest';
import { authenticatedRequest, createAuthenticatedTestApp } from '../test/authenticated-api.js';
import { CustomerNotFoundError, type ActivityService } from './activity-service.js';

const customerId = '8a1f2d44-1234-4abc-8def-123456789abc';
const activities = [
  {
    id: 'd0a80101-1234-4abc-8def-123456789abc',
    customer_id: customerId,
    user_id: 'c0a80101-1234-4abc-8def-123456789abc',
    activity_type: 'meeting' as const,
    visited_at: new Date('2026-09-18T01:00:00.000Z'),
    meeting_note: '新しい商談内容',
    next_visit_at: new Date('2026-09-25T01:00:00.000Z'),
    created_at: new Date('2026-09-18T01:00:00.000Z'),
    updated_at: new Date('2026-09-18T01:00:00.000Z'),
  },
  {
    id: 'e0a80101-1234-4abc-8def-123456789abc',
    customer_id: customerId,
    user_id: 'c0a80101-1234-4abc-8def-123456789abc',
    activity_type: 'visit' as const,
    visited_at: new Date('2026-09-17T01:00:00.000Z'),
    meeting_note: '以前の訪問記録',
    next_visit_at: null,
    created_at: new Date('2026-09-17T01:00:00.000Z'),
    updated_at: new Date('2026-09-17T01:00:00.000Z'),
  },
];

const createService = (): ActivityService => ({
  execute: vi.fn(),
  findByCustomerId: vi.fn().mockResolvedValue(activities),
});

describe('GET /api/v1/customers/:customerId/activities', () => {
  it('returns a customer activity history in newest-first order', async () => {
    const activityService = createService();
    const response = await authenticatedRequest(createAuthenticatedTestApp({ activityService }))
      .get(`/api/v1/customers/${customerId}/activities`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(activities.map((activity) => ({
      ...activity,
      visited_at: activity.visited_at === null ? null : activity.visited_at.toISOString(),
      next_visit_at: activity.next_visit_at === null ? null : activity.next_visit_at.toISOString(),
      created_at: activity.created_at.toISOString(),
      updated_at: activity.updated_at.toISOString(),
    })));
    expect(activityService.findByCustomerId).toHaveBeenCalledWith(customerId);
  });

  it('returns HTTP 400 for an invalid customer id', async () => {
    const activityService = createService();
    const response = await authenticatedRequest(createAuthenticatedTestApp({ activityService }))
      .get('/api/v1/customers/not-a-uuid/activities');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message: 'customerId must be a UUID.' });
    expect(activityService.findByCustomerId).not.toHaveBeenCalled();
  });

  it('returns HTTP 404 when the customer does not exist', async () => {
    const activityService: ActivityService = {
      execute: vi.fn(),
      findByCustomerId: vi.fn().mockRejectedValue(new CustomerNotFoundError()),
    };
    const response = await authenticatedRequest(createAuthenticatedTestApp({ activityService }))
      .get(`/api/v1/customers/${customerId}/activities`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer was not found.' });
  });

  it('returns HTTP 500 when retrieval fails', async () => {
    const activityService: ActivityService = {
      execute: vi.fn(),
      findByCustomerId: vi.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const response = await authenticatedRequest(createAuthenticatedTestApp({ activityService }))
      .get(`/api/v1/customers/${customerId}/activities`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve activities.' });
  });

  it('returns HTTP 503 when the database is not configured', async () => {
    const response = await authenticatedRequest(createAuthenticatedTestApp())
      .get(`/api/v1/customers/${customerId}/activities`);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
  });
});
