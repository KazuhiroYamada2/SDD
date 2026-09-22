import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import type { AuthUserRepository } from '../auth/auth-user-repository.js';
import {
  authenticatedRequest,
  createAuthenticatedTestApp,
  testBearerHeader,
  testJwtService,
} from '../test/authenticated-api.js';
import {
  LastActiveAdminRequiredError,
  SelfRoleChangeNotAllowedError,
  UserNotFoundError,
  type UserService,
} from '../users/user-service.js';

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const otherUserId = '22222222-2222-4222-8222-222222222222';

const requestIdOf = (response: { headers: Record<string, string | undefined> }) =>
  response.headers['x-request-id'];

const expectServerRequestId = (response: { headers: Record<string, string | undefined> }) => {
  expect(requestIdOf(response)).toMatch(uuidV4Pattern);
};

const failingUserService = (error: Error): UserService => ({
  list: vi.fn(),
  changeRole: vi.fn().mockRejectedValue(error),
});

describe('common request processing', () => {
  it('adds a server-generated UUID v4 to a successful response', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expectServerRequestId(response);
  });

  it('generates a new request ID for every request', async () => {
    const app = createApp();
    const first = await request(app).get('/health');
    const second = await request(app).get('/health');

    expectServerRequestId(first);
    expectServerRequestId(second);
    expect(requestIdOf(first)).not.toBe(requestIdOf(second));
  });

  it('ignores a client request ID without validating or echoing it', async () => {
    const clientRequestId = 'not-a-uuid-and-not-canonical';
    const response = await request(createApp()).get('/health').set('X-Request-ID', clientRequestId);

    expect(response.status).toBe(200);
    expectServerRequestId(response);
    expect(requestIdOf(response)).not.toBe(clientRequestId);
  });

  it('makes the same canonical request ID available to downstream handlers', async () => {
    const app = createApp();
    app.get('/request-context-probe', (req, res) => res.status(200).json({ requestId: req.requestId }));

    const response = await request(app).get('/request-context-probe');

    expectServerRequestId(response);
    expect(response.body).toEqual({ requestId: requestIdOf(response) });
  });

  it('keeps the existing 400 validation response and adds the header', async () => {
    const response = await request(createApp({ loginService: { login: vi.fn() } }))
      .post('/api/v1/auth/login').send({ email: '', password: 'password' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message: 'email is required.' });
    expect(response.body).not.toHaveProperty('requestId');
    expectServerRequestId(response);
  });

  it('returns the existing Login contract for malformed JSON with the header', async () => {
    const response = await request(createApp({ loginService: { login: vi.fn() } }))
      .post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{broken');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON.' });
    expect(response.body).not.toHaveProperty('requestId');
    expectServerRequestId(response);
  });

  it('returns the common malformed JSON contract before Authentication', async () => {
    const response = await request(createApp()).post('/api/v1/customers')
      .set('Content-Type', 'application/json').send('{internal parser detail');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'INVALID_REQUEST', message: 'Request body is invalid.' });
    expect(response.text).not.toContain('internal parser detail');
    expect(response.body).not.toHaveProperty('requestId');
    expectServerRequestId(response);
  });

  it('adds the header to the existing 401 contract', async () => {
    const response = await request(createApp()).get('/api/v1/customers');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.' });
    expect(response.body).not.toHaveProperty('requestId');
    expectServerRequestId(response);
  });

  it('adds the header to the existing 403 contract', async () => {
    const app = createAuthenticatedTestApp({
      customerCategoryService: { getCustomerCategories: vi.fn() },
    }, 'staff');
    const response = await authenticatedRequest(app).get('/api/v1/reports/customer-categories');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ code: 'FORBIDDEN', message: 'Forbidden.' });
    expect(response.body).not.toHaveProperty('requestId');
    expectServerRequestId(response);
  });

  it('adds the header to the existing 404 contract', async () => {
    const app = createAuthenticatedTestApp({
      userService: failingUserService(new UserNotFoundError()),
    }, 'admin');
    const response = await authenticatedRequest(app)
      .patch(`/api/v1/users/${otherUserId}/role`).send({ role: 'staff' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'USER_NOT_FOUND', message: 'User was not found.' });
    expect(response.body).not.toHaveProperty('requestId');
    expectServerRequestId(response);
  });

  it.each([
    [new SelfRoleChangeNotAllowedError(), {
      code: 'SELF_ROLE_CHANGE_NOT_ALLOWED',
      message: 'An administrator cannot change their own role.',
    }],
    [new LastActiveAdminRequiredError(), {
      code: 'LAST_ACTIVE_ADMIN_REQUIRED',
      message: 'At least one active admin must remain.',
    }],
  ])('adds the header to the existing 409 contract', async (error, body) => {
    const app = createAuthenticatedTestApp({ userService: failingUserService(error) }, 'admin');
    const response = await authenticatedRequest(app)
      .patch(`/api/v1/users/${otherUserId}/role`).send({ role: 'staff' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual(body);
    expect(response.body).not.toHaveProperty('requestId');
    expectServerRequestId(response);
  });

  it('returns a generic 500 without exposing internal details and adds the header', async () => {
    const internalDetail = 'database failed with secret credential and private customer data';
    const authUserRepository: AuthUserRepository = {
      findByEmail: async () => null,
      findById: vi.fn().mockRejectedValue(new Error(internalDetail)),
    };
    const response = await request(createApp({ authUserRepository, jwtService: testJwtService }))
      .get('/api/v1/customers').set('Authorization', testBearerHeader());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' });
    expect(response.text).not.toContain(internalDetail);
    expect(response.body).not.toHaveProperty('requestId');
    expectServerRequestId(response);
  });

  it('adds the header to the existing 503 contract', async () => {
    const response = await request(createApp()).post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: 'password' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
    expect(response.body).not.toHaveProperty('requestId');
    expectServerRequestId(response);
  });
});
