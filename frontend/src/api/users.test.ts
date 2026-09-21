import { afterEach, describe, expect, it, vi } from 'vitest';
import { changeUserRole, getUsers } from './users';

describe('Users API client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gets users with Bearer Authentication', async () => {
    const users = [{ id: 'user-1', email: 'a@example.test', role: 'staff', active: true }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(users), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(getUsers('token')).resolves.toEqual(users);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/users', expect.objectContaining({
      headers: expect.any(Headers),
    }));
    expect((fetchMock.mock.calls[0]![1].headers as Headers).get('Authorization')).toBe('Bearer token');
  });

  it('patches only role for an encoded user id', async () => {
    const updated = { id: 'user/id', email: 'a@example.test', role: 'manager', active: false };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(updated), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(changeUserRole('user/id', 'manager', 'token')).resolves.toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/user%2Fid/role', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ role: 'manager' }),
    }));
  });

  it('surfaces a 409 Backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'LAST_ACTIVE_ADMIN_REQUIRED', message: 'At least one active admin must remain.',
    }), { status: 409, headers: { 'Content-Type': 'application/json' } })));
    await expect(changeUserRole('user-1', 'staff', 'token'))
      .rejects.toThrow('At least one active admin must remain.');
  });
});

