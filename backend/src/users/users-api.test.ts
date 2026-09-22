import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { authenticatedRequest, createAuthenticatedTestApp, testUserId } from '../test/authenticated-api.js';
import {
  LastActiveAdminRequiredError,
  SelfRoleChangeNotAllowedError,
  UserNotFoundError,
  type UserService,
} from './user-service.js';

const otherId = '22222222-2222-4222-8222-222222222222';
const users = [
  { id: otherId, email: 'a@example.test', role: 'staff' as const, active: true },
  { id: testUserId, email: 'z@example.test', role: 'admin' as const, active: false },
];
const service = (): UserService => ({
  list: vi.fn().mockResolvedValue(users),
  changeRole: vi.fn().mockResolvedValue({ ...users[0], role: 'manager' }),
});

describe('Users production API', () => {
  it('requires Authentication', async () => {
    const response = await request(createApp({ userService: service() })).get('/api/v1/users');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.' });
  });

  it.each(['staff', 'manager'] as const)('rejects %s before the Users service', async (role) => {
    const userService = service();
    const app = createAuthenticatedTestApp({ userService }, role);
    const list = await authenticatedRequest(app).get('/api/v1/users');
    const change = await authenticatedRequest(app).patch(`/api/v1/users/${otherId}/role`).send({ role: 'admin' });
    expect(list.status).toBe(403);
    expect(change.status).toBe(403);
    expect(list.body).toEqual({ code: 'FORBIDDEN', message: 'Forbidden.' });
    expect(userService.list).not.toHaveBeenCalled();
    expect(userService.changeRole).not.toHaveBeenCalled();
  });

  it('returns only the public user fields to admin', async () => {
    const app = createAuthenticatedTestApp({ userService: service() }, 'admin');
    const response = await authenticatedRequest(app).get('/api/v1/users');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(users);
    expect(Object.keys(response.body[0])).toEqual(['id', 'email', 'role', 'active']);
  });

  it('changes another user role for admin', async () => {
    const userService = service();
    const app = createAuthenticatedTestApp({ userService }, 'admin');
    const response = await authenticatedRequest(app).patch(`/api/v1/users/${otherId}/role`).send({ role: 'manager' });
    expect(response.status).toBe(200);
    expect(response.body.role).toBe('manager');
    expect(userService.changeRole).toHaveBeenCalledWith(
      otherId,
      'manager',
      { id: testUserId, role: 'admin' },
      expect.any(Function),
    );
  });

  it.each([
    ['not-a-uuid', { role: 'staff' }, 'id must be a UUID.'],
    [otherId, {}, 'Request body must contain only role.'],
    [otherId, { role: 'owner' }, 'role must be one of staff, manager, admin.'],
    [otherId, { role: 'staff', email: 'x@example.test' }, 'Request body must contain only role.'],
  ])('rejects invalid role changes', async (id, body, message) => {
    const userService = service();
    const app = createAuthenticatedTestApp({ userService }, 'admin');
    const response = await authenticatedRequest(app).patch(`/api/v1/users/${id}/role`).send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message });
    expect(userService.changeRole).not.toHaveBeenCalled();
  });

  it.each([
    [new UserNotFoundError(), 404, { code: 'USER_NOT_FOUND', message: 'User was not found.' }],
    [new SelfRoleChangeNotAllowedError(), 409, { code: 'SELF_ROLE_CHANGE_NOT_ALLOWED', message: 'An administrator cannot change their own role.' }],
    [new LastActiveAdminRequiredError(), 409, { code: 'LAST_ACTIVE_ADMIN_REQUIRED', message: 'At least one active admin must remain.' }],
  ])('maps role change domain errors', async (error, status, body) => {
    const userService = service();
    vi.mocked(userService.changeRole).mockRejectedValue(error);
    const app = createAuthenticatedTestApp({ userService }, 'admin');
    const response = await authenticatedRequest(app).patch(`/api/v1/users/${otherId}/role`).send({ role: 'staff' });
    expect(response.status).toBe(status);
    expect(response.body).toEqual(body);
  });
});
