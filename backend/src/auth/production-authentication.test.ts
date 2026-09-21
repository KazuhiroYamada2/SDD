import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import type { AuthUserRepository } from './auth-user-repository.js';
import { testBearerHeader, testJwtService, testUserId } from '../test/authenticated-api.js';

const required = { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.' };
const protectedRequests = [
  ['post', '/api/v1/customers'],
  ['get', '/api/v1/customers'],
  ['get', `/api/v1/customers/${testUserId}`],
  ['patch', `/api/v1/customers/${testUserId}`],
  ['post', `/api/v1/customers/${testUserId}/activities`],
  ['get', `/api/v1/customers/${testUserId}/activities`],
  ['get', '/api/v1/reports/sales-trend'],
  ['get', '/api/v1/reports/customer-categories'],
  ['get', '/api/v1/reports/staff-performance'],
] as const;

describe('production Public and Protected API boundary', () => {
  it('rejects a missing or short JWT secret when creating the production app', () => {
    vi.stubEnv('JWT_SECRET', '');
    try {
      expect(() => createApp()).toThrow('JWT_SECRET must contain at least 32 bytes.');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('keeps health and Login public', async () => {
    const app = createApp({ loginService: { login: async () => null } });
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });
    const login = await request(app).post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: 'wrong-password' });
    expect(login.status).toBe(401);
    expect(login.body).toEqual({ code: 'AUTHENTICATION_FAILED', message: 'Authentication failed.' });
  });

  it.each(protectedRequests)('requires Authentication for %s %s', async (method, path) => {
    const app = createApp();
    const response = await request(app)[method](path);
    expect(response.status).toBe(401);
    expect(response.body).toEqual(required);
  });

  it('rejects malformed Bearer on a production business route', async () => {
    const response = await request(createApp()).get('/api/v1/reports/customer-categories')
      .set('Authorization', 'Bearer malformed');
    expect(response.status).toBe(401);
    expect(response.body).toEqual(required);
  });

  it('sets authenticatedUser from the current repository role and lets manager reach a Reports handler', async () => {
    let role: 'staff' | 'manager' = 'staff';
    const repository: AuthUserRepository = {
      findByEmail: async () => null,
      findById: vi.fn().mockImplementation(async (id: string) => ({
        id, email: 'staff@example.test', role, is_active: true,
      })),
    };
    const app = createApp({
      authUserRepository: repository,
      jwtService: testJwtService,
      customerCategoryService: { getCustomerCategories: async () => ({ items: [] }) },
    });
    app.get('/api/v1/auth-probe', (req, res) => res.json(req.authenticatedUser));

    const staff = await request(app).get('/api/v1/auth-probe').set('Authorization', testBearerHeader());
    expect(staff.status).toBe(200);
    expect(staff.body).toEqual({ id: testUserId, role: 'staff' });
    expect(staff.body).not.toHaveProperty('email');
    role = 'manager';
    const report = await request(app).get('/api/v1/reports/customer-categories')
      .set('Authorization', testBearerHeader());
    expect(report.status).toBe(200);
    expect(report.body).toEqual({ items: [] });

    const manager = await request(app).get('/api/v1/auth-probe').set('Authorization', testBearerHeader());
    expect(manager.body).toEqual({ id: testUserId, role: 'manager' });
    expect(repository.findById).toHaveBeenCalledWith(testUserId);
    expect(repository.findById).toHaveBeenCalledTimes(3);
  });
});
