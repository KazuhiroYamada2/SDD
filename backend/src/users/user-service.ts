import type { AuthenticatedUser, UserRole } from '../auth/auth-types.js';
import { assertOperationAllowed } from '../authorization/authorization-policy.js';
import type { UserRepository } from './user-repository.js';
import type { UserDto } from './user-types.js';

export class UserNotFoundError extends Error {}
export class SelfRoleChangeNotAllowedError extends Error {}
export class LastActiveAdminRequiredError extends Error {}

export const userNotFoundResponse = { code: 'USER_NOT_FOUND', message: 'User was not found.' } as const;
export const selfRoleChangeNotAllowedResponse = {
  code: 'SELF_ROLE_CHANGE_NOT_ALLOWED',
  message: 'An administrator cannot change their own role.',
} as const;
export const lastActiveAdminRequiredResponse = {
  code: 'LAST_ACTIVE_ADMIN_REQUIRED',
  message: 'At least one active admin must remain.',
} as const;

export type UserService = {
  list(authenticatedUser: AuthenticatedUser): Promise<UserDto[]>;
  changeRole(id: string, role: UserRole, authenticatedUser: AuthenticatedUser): Promise<UserDto>;
};

export const createUserService = (repository: UserRepository): UserService => ({
  async list(authenticatedUser) {
    assertOperationAllowed(authenticatedUser, 'users.read');
    return repository.list();
  },
  async changeRole(id, role, authenticatedUser) {
    assertOperationAllowed(authenticatedUser, 'users.changeRole');
    if (id === authenticatedUser.id && role !== authenticatedUser.role) {
      throw new SelfRoleChangeNotAllowedError();
    }

    const result = await repository.changeRole(id, role);
    switch (result.status) {
      case 'not_found':
        throw new UserNotFoundError();
      case 'last_active_admin':
        throw new LastActiveAdminRequiredError();
      case 'updated':
      case 'unchanged':
        return result.user;
    }
  },
});
