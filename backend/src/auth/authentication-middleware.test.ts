import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { SignJWT } from 'jose';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUserRepository } from './auth-user-repository.js';
import type { AuthUserIdentity } from './auth-types.js';
import { createAuthenticationMiddleware } from './authentication-middleware.js';
import { createJwtService, type JwtService } from './jwt-service.js';

const testSecret = 'test-only-auth-middleware-secret-at-least-32-bytes';
const otherTestSecret = 'different-test-only-secret-at-least-32-bytes';
const userId = '11111111-1111-4111-8111-111111111111';
const issuedAt = new Date('2026-01-15T00:00:00.000Z');
const expected401 = { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.' };

const makeUser = (overrides: Partial<AuthUserIdentity> = {}): AuthUserIdentity => ({
  id: userId, email: 'staff@example.com', role: 'staff', is_active: true, ...overrides,
});

const makeRepository = (user: AuthUserIdentity | null = makeUser()): AuthUserRepository => ({
  findByEmail: vi.fn().mockResolvedValue(null),
  findById: vi.fn().mockResolvedValue(user),
});

const makeApp = (repository: AuthUserRepository, jwtService: JwtService) => {
  const app = express();
  app.get('/protected', createAuthenticationMiddleware({ userRepository: repository, jwtService }), (req, res) => {
    res.status(200).json(req.authenticatedUser);
  });
  const handleError: ErrorRequestHandler = (_error, _req, res, _next) => {
    res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' });
  };
  app.use(handleError);
  return app;
};

const jwtAt = (now: Date = issuedAt) => createJwtService({ secret: testSecret, now: () => now });
const tokenAt = () => jwtAt().issueAccessToken(userId);
const assert401 = (response: { status: number; body: unknown }) => {
  expect(response.status).toBe(401);
  expect(response.body).toEqual(expected401);
};

describe('Authentication middleware on a test-only protected route', () => {
  it('AM-01/02/03 calls the next handler with only the database user id and current role', async () => {
    const repository = makeRepository(makeUser({ role: 'admin' }));
    const token = await tokenAt();
    const response = await request(makeApp(repository, jwtAt()))
      .get('/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: userId, role: 'admin' });
    expect(response.body).not.toHaveProperty('email');
    expect(repository.findById).toHaveBeenCalledWith(userId);
  });

  it('uses a changed database role on the next request with the same token', async () => {
    let currentRole: AuthUserIdentity['role'] = 'staff';
    const repository: AuthUserRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockImplementation(async () => makeUser({ role: currentRole })),
    };
    const app = makeApp(repository, jwtAt());
    const token = await tokenAt();

    const first = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(first.body).toEqual({ id: userId, role: 'staff' });
    currentRole = 'manager';
    const second = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(second.body).toEqual({ id: userId, role: 'manager' });
    expect(repository.findById).toHaveBeenCalledTimes(2);
  });

  it('returns the same 401 for a missing header, wrong scheme, and Bearer without a token', async () => {
    const repository = makeRepository();
    const app = makeApp(repository, jwtAt());
    assert401(await request(app).get('/protected'));
    assert401(await request(app).get('/protected').set('Authorization', 'Basic credentials'));
    assert401(await request(app).get('/protected').set('Authorization', 'Bearer'));
    assert401(await request(app).get('/protected').set('Authorization', 'Bearer '));
    assert401(await request(app).get('/protected').set('Authorization', 'Bearer one two'));
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('reads the token only from Authorization, not a query parameter or cookie', async () => {
    const token = await tokenAt();
    const app = makeApp(makeRepository(), jwtAt());
    assert401(await request(app).get(`/protected?token=${token}`));
    assert401(await request(app).get('/protected').set('Cookie', `accessToken=${token}`));
  });

  it('returns the common 401 for malformed JWT, invalid signature, and expired JWT', async () => {
    const app = makeApp(makeRepository(), jwtAt());
    assert401(await request(app).get('/protected').set('Authorization', 'Bearer malformed'));
    const differentSignature = await createJwtService({ secret: otherTestSecret, now: () => issuedAt })
      .issueAccessToken(userId);
    assert401(await request(app).get('/protected').set('Authorization', `Bearer ${differentSignature}`));
    const expired = await tokenAt();
    const laterJwt = jwtAt(new Date(issuedAt.getTime() + 1800_000));
    assert401(await request(makeApp(makeRepository(), laterJwt)).get('/protected')
      .set('Authorization', `Bearer ${expired}`));
  });

  it('returns the common 401 for missing and invalid JWT subjects', async () => {
    const epoch = Math.floor(issuedAt.getTime() / 1000);
    const missingSubject = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(epoch)
      .setExpirationTime(epoch + 1800)
      .sign(new TextEncoder().encode(testSecret));
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('not-a-uuid')
      .setIssuedAt(epoch)
      .setExpirationTime(epoch + 1800)
      .sign(new TextEncoder().encode(testSecret));
    assert401(await request(makeApp(makeRepository(), jwtAt())).get('/protected')
      .set('Authorization', `Bearer ${missingSubject}`));
    assert401(await request(makeApp(makeRepository(), jwtAt())).get('/protected')
      .set('Authorization', `Bearer ${token}`));
  });

  it('returns the common 401 when the token user no longer exists', async () => {
    const repository = makeRepository(null);
    assert401(await request(makeApp(repository, jwtAt())).get('/protected')
      .set('Authorization', `Bearer ${await tokenAt()}`));
    expect(repository.findById).toHaveBeenCalledWith(userId);
  });

  it('rejects a user disabled after token issuance on the next request', async () => {
    let active = true;
    const repository: AuthUserRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockImplementation(async () => makeUser({ is_active: active })),
    };
    const app = makeApp(repository, jwtAt());
    const token = await tokenAt();
    expect((await request(app).get('/protected').set('Authorization', `Bearer ${token}`)).status).toBe(200);
    active = false;
    assert401(await request(app).get('/protected').set('Authorization', `Bearer ${token}`));
    expect(repository.findById).toHaveBeenCalledTimes(2);
  });

  it('passes repository failures to the error handler instead of returning 401', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findById).mockRejectedValue(new Error('database unavailable'));
    const response = await request(makeApp(repository, jwtAt())).get('/protected')
      .set('Authorization', `Bearer ${await tokenAt()}`);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' });
  });

  it('passes unexpected JWT verifier errors to the error handler', async () => {
    const jwtService: JwtService = {
      issueAccessToken: vi.fn(),
      verifyAccessToken: vi.fn().mockRejectedValue(new Error('unexpected verifier failure')),
    };
    const response = await request(makeApp(makeRepository(), jwtService)).get('/protected')
      .set('Authorization', 'Bearer test-token');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' });
  });

  it('rejects a short JWT secret as configuration failure before handling a request', () => {
    vi.stubEnv('JWT_SECRET', 'short-test-key');
    try {
      expect(() => createAuthenticationMiddleware({ userRepository: makeRepository() }))
        .toThrow('JWT_SECRET must contain at least 32 bytes.');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
