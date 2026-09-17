import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { CustomerNotFoundError, UserNotFoundError, type ActivityService } from './activity-service.js';

const customerId = '8a1f2d44-1234-4abc-8def-123456789abc';
const userId = 'c0a80101-1234-4abc-8def-123456789abc';
const activity = {
  id: 'd0a80101-1234-4abc-8def-123456789abc',
  customer_id: customerId,
  user_id: userId,
  activity_type: 'visit' as const,
  visited_at: new Date('2026-09-17T01:00:00.000Z'),
  meeting_note: '商談内容',
  next_visit_at: new Date('2026-09-24T01:00:00.000Z'),
  created_at: new Date('2026-09-17T01:00:00.000Z'),
  updated_at: new Date('2026-09-17T01:00:00.000Z'),
};

const createService = (): ActivityService => ({
  execute: vi.fn().mockResolvedValue(activity),
  findByCustomerId: vi.fn(),
});

describe('POST /api/v1/customers/:customerId/activities', () => {
  it('records a visit, meeting note, and next visit schedule', async () => {
    const activityService = createService();
    const response = await request(createApp({ activityService }))
      .post(`/api/v1/customers/${customerId}/activities`)
      .send({
        user_id: userId,
        activity_type: 'visit',
        visited_at: '2026-09-17T01:00:00.000Z',
        meeting_note: ' 商談内容 ',
        next_visit_at: '2026-09-24T01:00:00.000Z',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ...activity,
      visited_at: activity.visited_at.toISOString(),
      next_visit_at: activity.next_visit_at.toISOString(),
      created_at: activity.created_at.toISOString(),
      updated_at: activity.updated_at.toISOString(),
    });
    expect(activityService.execute).toHaveBeenCalledWith({
      customer_id: customerId,
      user_id: userId,
      activity_type: 'visit',
      visited_at: activity.visited_at,
      meeting_note: '商談内容',
      next_visit_at: activity.next_visit_at,
    });
  });

  it.each([
    ['invalid customer id', 'not-a-uuid', { user_id: userId, activity_type: 'visit' }, 'customerId must be a UUID.'],
    ['missing user id', customerId, { activity_type: 'visit' }, 'user_id must be a UUID.'],
    ['invalid activity type', customerId, { user_id: userId, activity_type: 'call' }, "activity_type must be either 'visit' or 'meeting'."],
    ['invalid visit date', customerId, { user_id: userId, activity_type: 'visit', visited_at: 'not-a-date' }, 'visited_at must be a valid date-time string.'],
    ['invalid meeting note', customerId, { user_id: userId, activity_type: 'meeting', meeting_note: 1 }, 'meeting_note must be a string.'],
  ])('returns HTTP 400 for %s', async (_caseName, id, body, message) => {
    const activityService = createService();
    const response = await request(createApp({ activityService }))
      .post(`/api/v1/customers/${id}/activities`)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message });
    expect(activityService.execute).not.toHaveBeenCalled();
  });

  it('returns HTTP 404 when the customer does not exist', async () => {
    const activityService: ActivityService = {
      execute: vi.fn().mockRejectedValue(new CustomerNotFoundError()),
      findByCustomerId: vi.fn(),
    };
    const response = await request(createApp({ activityService }))
      .post(`/api/v1/customers/${customerId}/activities`)
      .send({ user_id: userId, activity_type: 'visit' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer was not found.' });
  });

  it('returns HTTP 404 when the user does not exist', async () => {
    const activityService: ActivityService = {
      execute: vi.fn().mockRejectedValue(new UserNotFoundError()),
      findByCustomerId: vi.fn(),
    };
    const response = await request(createApp({ activityService }))
      .post(`/api/v1/customers/${customerId}/activities`)
      .send({ user_id: userId, activity_type: 'visit' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'USER_NOT_FOUND', message: 'User was not found.' });
  });

  it('returns HTTP 500 when activity creation fails', async () => {
    const activityService: ActivityService = {
      execute: vi.fn().mockRejectedValue(new Error('database unavailable')),
      findByCustomerId: vi.fn(),
    };
    const response = await request(createApp({ activityService }))
      .post(`/api/v1/customers/${customerId}/activities`)
      .send({ user_id: userId, activity_type: 'visit' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create activity.' });
  });

  it('returns HTTP 503 when the database is not configured', async () => {
    const response = await request(createApp())
      .post(`/api/v1/customers/${customerId}/activities`)
      .send({ user_id: userId, activity_type: 'visit' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
  });
});
