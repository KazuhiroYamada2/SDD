import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { authenticatedRequest, createAuthenticatedTestApp, testUserId } from '../test/authenticated-api.js';
import type { StructuredLogRecord } from '../logging/structured-log.js';

const collect = () => {
  const records: StructuredLogRecord[] = [];
  return { records, write: (record: StructuredLogRecord) => records.push(record) };
};

describe('HTTP access logging', () => {
  it('writes one structured record for success, health, error, and unmatched requests', async () => {
    const log = collect();
    const app = createApp({ accessLog: log.write });

    const health = await request(app).get('/health');
    const unauthorized = await request(app).get('/api/v1/customers');
    const unmatched = await request(app).get('/not-a-route?private=value');

    expect([health.status, unauthorized.status, unmatched.status]).toEqual([200, 401, 404]);
    expect(log.records).toHaveLength(3);
    expect(log.records.map((record) => record.route)).toEqual([
      '/health', '/api/v1/customers', 'UNMATCHED',
    ]);
    expect(log.records.map((record) => record.status_code)).toEqual([200, 401, 404]);
    for (const record of log.records) {
      expect(record).toMatchObject({
        event: 'HTTP_ACCESS',
        method: 'GET',
        request_id: expect.any(String),
        duration_ms: expect.any(Number),
        user_id: null,
        ip_address: expect.any(String),
        timestamp: expect.any(String),
      });
    }
    expect(log.records[0]!.request_id).toBe(health.headers['x-request-id']);
    expect(log.records[1]!.request_id).toBe(unauthorized.headers['x-request-id']);
  });

  it('uses a normalized route and the authenticated actor without logging the query', async () => {
    const log = collect();
    const app = createAuthenticatedTestApp({
      accessLog: log.write,
      customerReadService: {
        list: async () => ({ items: [], page: 1, page_size: 20, total_count: 0, total_pages: 0 }),
        findById: vi.fn(),
      },
    }, 'manager');

    const response = await authenticatedRequest(app).get('/api/v1/customers?query=private-customer');

    expect(response.status).toBe(200);
    expect(log.records).toHaveLength(1);
    expect(log.records[0]).toMatchObject({
      route: '/api/v1/customers',
      user_id: testUserId,
      request_id: response.headers['x-request-id'],
    });
    expect(JSON.stringify(log.records[0])).not.toContain('private-customer');
  });

  it('never records headers, body, token, password, or Customer PII', async () => {
    const log = collect();
    const sensitive = [
      'secret-token-value',
      'secret-cookie-value',
      'secret-password-value',
      'private@example.test',
      'Private Customer Name',
      '03-0000-0000',
      'Private Address',
    ];
    const response = await request(createApp({
      accessLog: log.write,
      loginService: { login: async () => null },
    }))
      .post('/api/v1/auth/login?query=Private%20Customer%20Name')
      .set('Authorization', `Bearer ${sensitive[0]}`)
      .set('Cookie', `session=${sensitive[1]}`)
      .send({
        email: sensitive[3],
        password: sensitive[2],
        name: sensitive[4],
        phone: sensitive[5],
        address: sensitive[6],
      });

    expect(response.status).toBe(401);
    const serialized = JSON.stringify(log.records);
    for (const value of sensitive) expect(serialized).not.toContain(value);
    expect(serialized).not.toContain('authorization');
    expect(serialized).not.toContain('cookie');
  });

  it('does not change the HTTP response when the access logger fails', async () => {
    const response = await request(createApp({
      accessLog: () => { throw new Error('unsafe internal logger failure'); },
    })).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
