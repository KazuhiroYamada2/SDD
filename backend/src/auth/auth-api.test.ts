import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import type { AuthUserRepository } from './auth-user-repository.js';
import type { AuthUserCredentials } from './auth-types.js';
import { createJwtService } from './jwt-service.js';
import { createLoginService, type LoginService } from './login-service.js';
import { hashPassword } from './password-hasher.js';

const loginPath = '/api/v1/auth/login';
const testSecret = 'test-only-login-api-secret-with-at-least-32-bytes';
const testPassword = 'test-only-password';
const userId = '11111111-1111-4111-8111-111111111111';
let user: AuthUserCredentials;

beforeAll(async () => {
  user = {
    id: userId,
    email: 'Sales@Example.com',
    password_hash: await hashPassword(testPassword),
    role: 'manager',
    is_active: true,
  };
});

const createRealService = (active = true): LoginService => {
  const repository: AuthUserRepository = {
    findByEmail: async (email) => email === user.email ? { ...user, is_active: active } : null,
    findById: async () => null,
  };
  const jwt = createJwtService({ secret: testSecret });
  return createLoginService({ userRepository: repository, issueAccessToken: jwt.issueAccessToken });
};

describe('POST /api/v1/auth/login', () => {
  it('returns a JWT and public user fields for valid credentials', async () => {
    const response = await request(createApp({ loginService: createRealService() }))
      .post(loginPath).send({ email: user.email, password: testPassword });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accessToken: expect.any(String), tokenType: 'Bearer', expiresIn: 1800,
      user: { id: user.id, email: user.email, role: user.role },
    });
    expect(response.body.user).not.toHaveProperty('password_hash');
    await expect(createJwtService({ secret: testSecret }).verifyAccessToken(response.body.accessToken))
      .resolves.toEqual({ userId });
  });

  it('trims email but preserves its case and never trims password', async () => {
    const app = createApp({ loginService: createRealService() });
    const trimmedEmail = await request(app).post(loginPath)
      .send({ email: `  ${user.email}  `, password: testPassword });
    expect(trimmedEmail.status).toBe(200);

    const changedCase = await request(app).post(loginPath)
      .send({ email: user.email.toLowerCase(), password: testPassword });
    expect(changedCase.status).toBe(401);

    const paddedPassword = await request(app).post(loginPath)
      .send({ email: user.email, password: ` ${testPassword} ` });
    expect(paddedPassword.status).toBe(401);
  });

  it('returns the same 401 contract for unknown email, wrong password, and inactive user', async () => {
    const cases = [
      { service: createRealService(), email: 'unknown@example.com', password: testPassword },
      { service: createRealService(), email: user.email, password: 'wrong-password' },
      { service: createRealService(false), email: user.email, password: testPassword },
    ];
    for (const loginCase of cases) {
      const response = await request(createApp({ loginService: loginCase.service }))
        .post(loginPath).send({ email: loginCase.email, password: loginCase.password });
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ code: 'AUTHENTICATION_FAILED', message: 'Authentication failed.' });
    }
  });

  it.each([
    ['missing body', undefined],
    ['non-object body', []],
    ['missing email', { password: testPassword }],
    ['missing password', { email: 'sales@example.com' }],
    ['non-string email', { email: 123, password: testPassword }],
    ['non-string password', { email: 'sales@example.com', password: 123 }],
    ['empty email', { email: '', password: testPassword }],
    ['whitespace email', { email: '   ', password: testPassword }],
    ['long email', { email: 'a'.repeat(255), password: testPassword }],
    ['empty password', { email: 'sales@example.com', password: '' }],
    ['long password', { email: 'sales@example.com', password: 'p'.repeat(1025) }],
  ])('returns 400 VALIDATION_ERROR for %s', async (_label, body) => {
    const loginService: LoginService = { login: vi.fn() };
    const requestBuilder = request(createApp({ loginService })).post(loginPath);
    const response = body === undefined ? await requestBuilder : await requestBuilder.send(body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR', message: expect.any(String) });
    expect(loginService.login).not.toHaveBeenCalled();
  });

  it('returns the existing validation DTO for malformed JSON', async () => {
    const response = await request(createApp({ loginService: { login: vi.fn() } }))
      .post(loginPath).set('Content-Type', 'application/json').send('{broken');
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR', message: expect.any(String) });
  });

  it('does not turn unexpected Login Service failures into 401', async () => {
    const response = await request(createApp({ loginService: { login: vi.fn().mockRejectedValue(new Error('internal detail')) } }))
      .post(loginPath).send({ email: 'sales@example.com', password: testPassword });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to log in.' });
  });

  it('returns 503 when the database is not configured', async () => {
    const response = await request(createApp()).post(loginPath)
      .send({ email: 'sales@example.com', password: testPassword });
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
  });
});
