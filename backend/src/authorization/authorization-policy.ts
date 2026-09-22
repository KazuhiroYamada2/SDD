import type { AuthenticatedUser, UserRole } from '../auth/auth-types.js';
import { ForbiddenError } from './forbidden-error.js';

export type AuthorizationOperation =
  | 'customer.read'
  | 'customer.create'
  | 'customer.edit'
  | 'customer.delete'
  | 'activity.read'
  | 'activity.create'
  | 'reports.read'
  | 'users.read'
  | 'users.changeRole';

const operationPermissions: Record<UserRole, Record<AuthorizationOperation, boolean>> = {
  staff: {
    'customer.read': true,
    'customer.create': true,
    'customer.edit': true,
    'customer.delete': false,
    'activity.read': true,
    'activity.create': true,
    'reports.read': false,
    'users.read': false,
    'users.changeRole': false,
  },
  manager: {
    'customer.read': true,
    'customer.create': false,
    'customer.edit': false,
    'customer.delete': false,
    'activity.read': true,
    'activity.create': false,
    'reports.read': true,
    'users.read': false,
    'users.changeRole': false,
  },
  admin: {
    'customer.read': true,
    'customer.create': true,
    'customer.edit': true,
    'customer.delete': true,
    'activity.read': true,
    'activity.create': true,
    'reports.read': true,
    'users.read': true,
    'users.changeRole': true,
  },
};

export const isOperationAllowed = (
  authenticatedUser: AuthenticatedUser,
  operation: AuthorizationOperation,
): boolean => Object.hasOwn(operationPermissions, authenticatedUser.role) &&
  Object.hasOwn(operationPermissions[authenticatedUser.role], operation) &&
  operationPermissions[authenticatedUser.role][operation] === true;

export const assertOperationAllowed = (
  authenticatedUser: AuthenticatedUser,
  operation: AuthorizationOperation,
): void => {
  if (!isOperationAllowed(authenticatedUser, operation)) {
    throw new ForbiddenError();
  }
};

export const isCustomerInScope = (
  authenticatedUser: AuthenticatedUser,
  customerOwnerUserId: string,
): boolean => {
  switch (authenticatedUser.role) {
    case 'staff':
      return customerOwnerUserId === authenticatedUser.id;
    case 'manager':
    case 'admin':
      return true;
    default:
      return false;
  }
};
