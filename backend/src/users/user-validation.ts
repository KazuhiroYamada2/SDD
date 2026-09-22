import type { UserRole } from '../auth/auth-types.js';

type ValidationResult<Value> =
  | { valid: true; value: Value }
  | { valid: false; message: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const roles: UserRole[] = ['staff', 'manager', 'admin'];

export const validateUserId = (id: unknown): ValidationResult<string> =>
  typeof id === 'string' && uuidPattern.test(id)
    ? { valid: true, value: id }
    : { valid: false, message: 'id must be a UUID.' };

export const validateRoleChange = (body: unknown): ValidationResult<UserRole> => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { valid: false, message: 'Request body must be a JSON object containing only role.' };
  }

  const fields = Object.keys(body);
  if (fields.length !== 1 || fields[0] !== 'role') {
    return { valid: false, message: 'Request body must contain only role.' };
  }

  const role = (body as { role?: unknown }).role;
  if (typeof role !== 'string' || !roles.includes(role as UserRole)) {
    return { valid: false, message: 'role must be one of staff, manager, admin.' };
  }

  return { valid: true, value: role as UserRole };
};

