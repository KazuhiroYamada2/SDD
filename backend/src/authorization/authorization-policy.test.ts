import { describe, expect, it } from 'vitest';
import type { AuthenticatedUser, UserRole } from '../auth/auth-types.js';
import { assertOperationAllowed, isCustomerInScope, isOperationAllowed, type AuthorizationOperation } from './authorization-policy.js';
import { ForbiddenError } from './forbidden-error.js';

const user = (role: UserRole): AuthenticatedUser => ({ id: 'staff-user-id', role });

const matrix = {
  'customer.read': [true, true, true],
  'customer.create': [true, false, true],
  'customer.edit': [true, false, true],
  'customer.delete': [false, false, true],
  'activity.read': [true, true, true],
  'activity.create': [true, false, true],
  'reports.read': [false, true, true],
  'users.read': [false, false, true],
  'users.changeRole': [false, false, true],
} satisfies Record<AuthorizationOperation, readonly [boolean, boolean, boolean]>;
const matrixCases = (Object.keys(matrix) as AuthorizationOperation[])
  .map((operation) => [operation, matrix[operation]] as const);

describe('Authorization policy', () => {
  it.each(matrixCases)('checks %s for staff, manager, and admin', (operation, [staff, manager, admin]) => {
    expect(isOperationAllowed(user('staff'), operation)).toBe(staff);
    expect(isOperationAllowed(user('manager'), operation)).toBe(manager);
    expect(isOperationAllowed(user('admin'), operation)).toBe(admin);
  });

  it('fails closed for a role or operation outside the typed matrix at runtime', () => {
    expect(isOperationAllowed(user('staff'), 'unknown' as AuthorizationOperation)).toBe(false);
    expect(isOperationAllowed(user('unknown' as UserRole), 'customer.read')).toBe(false);
    expect(isOperationAllowed(user('__proto__' as UserRole), 'customer.read')).toBe(false);
  });

  it('throws only the common ForbiddenError for an operation denial', () => {
    expect(() => assertOperationAllowed(user('manager'), 'customer.create')).toThrow(ForbiddenError);
    expect(() => assertOperationAllowed(user('manager'), 'reports.read')).not.toThrow();
  });

  it('accepts only a staff member’s own customer', () => {
    expect(isCustomerInScope(user('staff'), 'staff-user-id')).toBe(true);
    expect(isCustomerInScope(user('staff'), 'other-user-id')).toBe(false);
  });

  it.each(['manager', 'admin'] as const)('allows %s to access any customer owner', (role) => {
    expect(isCustomerInScope(user(role), 'other-user-id')).toBe(true);
  });

  it('does not allow an unknown role into customer scope', () => {
    expect(isCustomerInScope(user('unknown' as UserRole), 'staff-user-id')).toBe(false);
  });
});
