import request from 'supertest';
import { createApp } from '../app.js';
import type { AuthUserRepository } from '../auth/auth-user-repository.js';
import type { UserRole } from '../auth/auth-types.js';
import { createJwtService } from '../auth/jwt-service.js';
import { passthroughCustomerCrypto } from './customer-crypto.js';

export const testUserId = '11111111-1111-4111-8111-111111111111';
export const testJwtService = createJwtService();
const token = await testJwtService.issueAccessToken(testUserId);

const createAuthUserRepository = (role: UserRole): AuthUserRepository => ({
  findByEmail: async () => null,
  findById: async (id) => id === testUserId ? {
    id: testUserId, email: 'test-user@example.test', role, is_active: true,
  } : null,
});

export const createAuthenticatedTestApp = (
  dependencies: Parameters<typeof createApp>[0] = {},
  role: UserRole = 'staff',
) => createApp({
  customerCrypto: passthroughCustomerCrypto,
  ...dependencies,
  authUserRepository: createAuthUserRepository(role),
  jwtService: testJwtService,
});

export const createManagerAuthenticatedTestApp = (dependencies: Parameters<typeof createApp>[0] = {}) =>
  createAuthenticatedTestApp(dependencies, 'manager');

export const authenticatedRequest = (app: ReturnType<typeof createApp>) => ({
  get: (path: string) => request(app).get(path).set('Authorization', `Bearer ${token}`),
  post: (path: string) => request(app).post(path).set('Authorization', `Bearer ${token}`),
  patch: (path: string) => request(app).patch(path).set('Authorization', `Bearer ${token}`),
  delete: (path: string) => request(app).delete(path).set('Authorization', `Bearer ${token}`),
});

export const testBearerHeader = () => `Bearer ${token}`;
