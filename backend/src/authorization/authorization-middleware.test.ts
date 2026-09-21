import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUserRepository } from '../auth/auth-user-repository.js';
import type { UserRole } from '../auth/auth-types.js';
import { createAuthenticationMiddleware } from '../auth/authentication-middleware.js';
import { createJwtService } from '../auth/jwt-service.js';
import { authorizeOperation } from './authorization-middleware.js';
import type { AuthorizationOperation } from './authorization-policy.js';
import { handleForbiddenError } from './forbidden-error-handler.js';

const userId = '11111111-1111-4111-8111-111111111111';
const jwtService = createJwtService({ secret: 'test-only-authorization-secret-at-least-32-bytes' });
const token = await jwtService.issueAccessToken(userId);
const bearer = `Bearer ${token}`;

const makeApp = (currentRole: () => UserRole, operation: AuthorizationOperation = 'reports.read') => {
  const userRepository: AuthUserRepository = {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockImplementation(async (id: string) => ({
      id, email: 'test-user@example.test', role: currentRole(), is_active: true,
    })),
  };
  const handler = vi.fn();
  const app = express();
  app.get('/protected',
    createAuthenticationMiddleware({ userRepository, jwtService }),
    authorizeOperation(operation),
    (req, res) => {
      handler();
      res.status(200).json(req.authenticatedUser);
    });
  app.use(handleForbiddenError);
  return { app, userRepository, handler };
};

describe('Authentication → Authorization on a test-only route', () => {
  it('stops an unauthenticated request with the Authentication 401 before Authorization', async () => {
    const { app, userRepository, handler } = makeApp(() => 'staff');
    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.',
    });
    expect(userRepository.findById).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns the exact common 403 after authenticating a staff user for reports', async () => {
    const { app, userRepository, handler } = makeApp(() => 'staff');
    const response = await request(app).get('/protected').set('Authorization', bearer);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ code: 'FORBIDDEN', message: 'Forbidden.' });
    expect(Object.keys(response.body).sort()).toEqual(['code', 'message']);
    expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(userId);
    expect(handler).not.toHaveBeenCalled();
  });

  it.each(['manager', 'admin'] as const)('lets an authenticated %s reach the handler', async (role) => {
    const { app, userRepository, handler } = makeApp(() => role);
    const response = await request(app).get('/protected').set('Authorization', bearer);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: userId, role });
    expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(userId);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('uses the current repository role from Authentication on the next request with the same JWT', async () => {
    let role: UserRole = 'staff';
    const { app, userRepository, handler } = makeApp(() => role);

    const denied = await request(app).get('/protected').set('Authorization', bearer);
    expect(denied.status).toBe(403);
    role = 'manager';
    const allowed = await request(app).get('/protected').set('Authorization', bearer);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toEqual({ id: userId, role: 'manager' });
    expect(userRepository.findById).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('uses the supplied operation instead of deriving it from the test route', async () => {
    const { app, handler } = makeApp(() => 'manager', 'customer.create');
    const response = await request(app).get('/protected').set('Authorization', bearer);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ code: 'FORBIDDEN', message: 'Forbidden.' });
    expect(handler).not.toHaveBeenCalled();
  });
});
