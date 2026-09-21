import request from 'supertest';
import { createApp } from '../app.js';
import type { AuthUserRepository } from '../auth/auth-user-repository.js';
import { createJwtService } from '../auth/jwt-service.js';

export const testUserId = '11111111-1111-4111-8111-111111111111';
export const testJwtService = createJwtService();
const token = await testJwtService.issueAccessToken(testUserId);

const authUserRepository: AuthUserRepository = {
  findByEmail: async () => null,
  findById: async (id) => id === testUserId ? {
    id: testUserId, email: 'test-staff@example.test', role: 'staff', is_active: true,
  } : null,
};

export const createAuthenticatedTestApp = (dependencies: Parameters<typeof createApp>[0] = {}) =>
  createApp({ ...dependencies, authUserRepository, jwtService: testJwtService });

export const authenticatedRequest = (app: ReturnType<typeof createApp>) => ({
  get: (path: string) => request(app).get(path).set('Authorization', `Bearer ${token}`),
  post: (path: string) => request(app).post(path).set('Authorization', `Bearer ${token}`),
});

export const testBearerHeader = () => `Bearer ${token}`;
