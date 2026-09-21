import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { authenticatedRequest, createAuthenticatedTestApp } from '../test/authenticated-api.js';

const forbidden = { code: 'FORBIDDEN', message: 'Forbidden.' };

describe('production Reports Authorization', () => {
  it.each([
    '/api/v1/reports/sales-trend?from=invalid',
    '/api/v1/reports/customer-categories?from=invalid',
    '/api/v1/reports/staff-performance?from=invalid',
  ])('rejects staff before validation and service for %s', async (path) => {
    const getSalesTrend = vi.fn();
    const getCustomerCategories = vi.fn();
    const getStaffPerformance = vi.fn();
    const app = createAuthenticatedTestApp({
      salesTrendService: { getSalesTrend },
      customerCategoryService: { getCustomerCategories },
      staffPerformanceService: { getStaffPerformance },
    });

    const response = await authenticatedRequest(app).get(path);

    expect(response.status).toBe(403);
    expect(response.body).toEqual(forbidden);
    expect(getSalesTrend).not.toHaveBeenCalled();
    expect(getCustomerCategories).not.toHaveBeenCalled();
    expect(getStaffPerformance).not.toHaveBeenCalled();
  });

  it('lets admin reach a Reports handler', async () => {
    const getCustomerCategories = vi.fn().mockResolvedValue({ items: [] });
    const app = createAuthenticatedTestApp({
      customerCategoryService: { getCustomerCategories },
    }, 'admin');

    const response = await authenticatedRequest(app).get('/api/v1/reports/customer-categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
    expect(getCustomerCategories).toHaveBeenCalledOnce();
  });

  it('returns Authentication 401 before Reports Authorization when no token is sent', async () => {
    const getCustomerCategories = vi.fn();
    const app = createAuthenticatedTestApp({
      customerCategoryService: { getCustomerCategories },
    });

    const response = await request(app).get('/api/v1/reports/customer-categories');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.',
    });
    expect(getCustomerCategories).not.toHaveBeenCalled();
  });
});
