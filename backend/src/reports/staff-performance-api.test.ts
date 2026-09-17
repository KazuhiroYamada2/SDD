import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import type { StaffPerformanceService } from './staff-performance-service.js';

const staffPerformance = {
  from: '2026-01-01',
  to: '2026-03-31',
  items: [{
    staffId: 'c0a80101-1234-4abc-8def-123456789abc',
    staffEmail: 'yamada@example.com',
    salesAmount: '3500000.00',
    salesCount: 12,
  }],
};

const createService = (): StaffPerformanceService => ({
  getStaffPerformance: vi.fn().mockResolvedValue(staffPerformance),
});

describe('GET /api/v1/reports/staff-performance', () => {
  it('returns the staff performance response DTO', async () => {
    const staffPerformanceService = createService();
    const response = await request(createApp({ staffPerformanceService }))
      .get('/api/v1/reports/staff-performance?from=2026-01-01&to=2026-03-31');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(staffPerformance);
    expect(typeof response.body.items[0].salesAmount).toBe('string');
    expect(typeof response.body.items[0].salesCount).toBe('number');
    expect(staffPerformanceService.getStaffPerformance).toHaveBeenCalledWith({ from: '2026-01-01', to: '2026-03-31' });
  });

  it.each([
    ['/api/v1/reports/staff-performance?to=2026-01-31', 'from is required.'],
    ['/api/v1/reports/staff-performance?from=2026-01-01', 'to is required.'],
    ['/api/v1/reports/staff-performance?from=2026-1-01&to=2026-01-31', 'from must be a valid YYYY-MM-DD date.'],
    ['/api/v1/reports/staff-performance?from=2026-02-30&to=2026-03-01', 'from must be a valid YYYY-MM-DD date.'],
    ['/api/v1/reports/staff-performance?from=2026-03-01&to=2026-02-28', 'from must be on or before to.'],
  ])('returns HTTP 400 for %s', async (uri, message) => {
    const staffPerformanceService = createService();
    const response = await request(createApp({ staffPerformanceService })).get(uri);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message });
    expect(staffPerformanceService.getStaffPerformance).not.toHaveBeenCalled();
  });

  it('returns HTTP 503 when the database is not configured', async () => {
    const response = await request(createApp())
      .get('/api/v1/reports/staff-performance?from=2026-01-01&to=2026-01-31');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
  });

  it('returns HTTP 500 when staff performance retrieval fails', async () => {
    const staffPerformanceService: StaffPerformanceService = {
      getStaffPerformance: vi.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const response = await request(createApp({ staffPerformanceService }))
      .get('/api/v1/reports/staff-performance?from=2026-01-01&to=2026-01-31');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve staff performance.' });
  });
});
