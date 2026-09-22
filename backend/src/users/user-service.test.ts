import { describe, expect, it, vi } from 'vitest';
import type { UserRepository } from './user-repository.js';
import {
  LastActiveAdminRequiredError,
  SelfRoleChangeNotAllowedError,
  UserNotFoundError,
  createUserService,
} from './user-service.js';

const admin = { id: '11111111-1111-4111-8111-111111111111', role: 'admin' as const };
const user = { id: '22222222-2222-4222-8222-222222222222', email: 'a@example.test', role: 'staff' as const, active: true };

const repository = (changeResult: Awaited<ReturnType<UserRepository['changeRole']>> = { status: 'updated', user }): UserRepository => ({
  list: vi.fn().mockResolvedValue([user]),
  changeRole: vi.fn().mockResolvedValue(changeResult),
});

describe('UserService', () => {
  it('lists users for admin', async () => {
    const repo = repository();
    await expect(createUserService(repo).list(admin)).resolves.toEqual([user]);
    expect(repo.list).toHaveBeenCalledOnce();
  });

  it.each(['staff', 'manager'] as const)('rejects %s before repository access', async (role) => {
    const repo = repository();
    const service = createUserService(repo);
    await expect(service.list({ id: admin.id, role })).rejects.toMatchObject({ name: 'ForbiddenError' });
    await expect(service.changeRole(user.id, 'admin', { id: admin.id, role })).rejects.toMatchObject({ name: 'ForbiddenError' });
    expect(repo.list).not.toHaveBeenCalled();
    expect(repo.changeRole).not.toHaveBeenCalled();
  });

  it('rejects an administrator changing their own role without repository access', async () => {
    const repo = repository();
    await expect(createUserService(repo).changeRole(admin.id, 'staff', admin))
      .rejects.toBeInstanceOf(SelfRoleChangeNotAllowedError);
    expect(repo.changeRole).not.toHaveBeenCalled();
  });

  it('allows a same-role self request as a repository no-op', async () => {
    const self = { id: admin.id, email: 'admin@example.test', role: 'admin' as const, active: true };
    const repo = repository({ status: 'unchanged', user: self });
    await expect(createUserService(repo).changeRole(admin.id, 'admin', admin)).resolves.toEqual(self);
  });

  it('maps missing users and last-active-admin protection to domain errors', async () => {
    await expect(createUserService(repository({ status: 'not_found' })).changeRole(user.id, 'admin', admin))
      .rejects.toBeInstanceOf(UserNotFoundError);
    await expect(createUserService(repository({ status: 'last_active_admin' })).changeRole(user.id, 'staff', admin))
      .rejects.toBeInstanceOf(LastActiveAdminRequiredError);
  });
});

