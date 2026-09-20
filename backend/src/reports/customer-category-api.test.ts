import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import type { CustomerCategoryService } from './customer-category-service.js';

const customerCategories = {
  items: [
    { category: 'A', customerCount: 25 },
    { category: '未分類', customerCount: 3 },
  ],
};

const createService = (): CustomerCategoryService => ({
  getCustomerCategories: vi.fn().mockResolvedValue(customerCategories),
});

describe('GET /api/v1/reports/customer-categories', () => {
  it('returns customer category counts as JSON numbers without period parameters', async () => {
    const customerCategoryService = createService();
    const response = await request(createApp({ customerCategoryService }))
      .get('/api/v1/reports/customer-categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(customerCategories);
    expect(typeof response.body.items[0].customerCount).toBe('number');
    expect(customerCategoryService.getCustomerCategories).toHaveBeenCalledWith();
  });

  it.each([
    '?from=2026-01-01',
    '?to=2026-01-31',
    '?from=2026-01-01&to=2026-01-31',
    '?from=',
    '?to=',
  ])('returns HTTP 400 when period parameter is supplied: %s', async (query) => {
    const customerCategoryService = createService();
    const response = await request(createApp({ customerCategoryService }))
      .get(`/api/v1/reports/customer-categories${query}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'from and to are not supported for customer categories.',
    });
    expect(customerCategoryService.getCustomerCategories).not.toHaveBeenCalled();
  });

  it('does not apply the period-only rejection to other query parameters', async () => {
    const customerCategoryService = createService();
    const response = await request(createApp({ customerCategoryService }))
      .get('/api/v1/reports/customer-categories?foo=bar');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(customerCategories);
  });

  it('returns HTTP 503 when the database is not configured', async () => {
    const response = await request(createApp()).get('/api/v1/reports/customer-categories');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
  });

  it('returns HTTP 500 when category retrieval fails', async () => {
    const customerCategoryService: CustomerCategoryService = {
      getCustomerCategories: vi.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const response = await request(createApp({ customerCategoryService }))
      .get('/api/v1/reports/customer-categories');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve customer categories.' });
  });
});
