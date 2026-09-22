import { describe, expect, it, vi } from 'vitest';
import { authenticatedRequest, createManagerAuthenticatedTestApp } from '../test/authenticated-api.js';
import type { SalesTrendService } from './sales-trend-service.js';

const salesTrend = {
  from: '2026-01-15',
  to: '2026-03-10',
  items: [
    { month: '2026-01', salesAmount: '1200000.00' },
    { month: '2026-02', salesAmount: '0.00' },
    { month: '2026-03', salesAmount: '850000.00' },
  ],
};

const createService = (): SalesTrendService => ({
  getSalesTrend: vi.fn().mockResolvedValue(salesTrend),
});

describe('GET /api/v1/reports/sales-trend', () => {
  it('returns the sales trend response DTO', async () => {
    const salesTrendService = createService();
    const response = await authenticatedRequest(createManagerAuthenticatedTestApp({ salesTrendService }))
      .get('/api/v1/reports/sales-trend?from=2026-01-15&to=2026-03-10');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(salesTrend);
    expect(salesTrendService.getSalesTrend).toHaveBeenCalledWith({ from: '2026-01-15', to: '2026-03-10' });
  });

  it.each([
    ['/api/v1/reports/sales-trend?to=2026-01-31', 'from is required.'],
    ['/api/v1/reports/sales-trend?from=2026-01-01', 'to is required.'],
    ['/api/v1/reports/sales-trend?from=2026-1-01&to=2026-01-31', 'from must be a valid YYYY-MM-DD date.'],
    ['/api/v1/reports/sales-trend?from=2026-02-30&to=2026-03-01', 'from must be a valid YYYY-MM-DD date.'],
    ['/api/v1/reports/sales-trend?from=2026-03-01&to=2026-02-28', 'from must be on or before to.'],
  ])('returns HTTP 400 for %s', async (uri, message) => {
    const salesTrendService = createService();
    const response = await authenticatedRequest(createManagerAuthenticatedTestApp({ salesTrendService })).get(uri);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message });
    expect(salesTrendService.getSalesTrend).not.toHaveBeenCalled();
  });

  it('returns HTTP 503 when the database is not configured', async () => {
    const response = await authenticatedRequest(createManagerAuthenticatedTestApp())
      .get('/api/v1/reports/sales-trend?from=2026-01-01&to=2026-01-31');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
  });

  it('returns HTTP 500 when sales trend retrieval fails', async () => {
    const salesTrendService: SalesTrendService = {
      getSalesTrend: vi.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const response = await authenticatedRequest(createManagerAuthenticatedTestApp({ salesTrendService }))
      .get('/api/v1/reports/sales-trend?from=2026-01-01&to=2026-01-31');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve sales trend.' });
  });
});
