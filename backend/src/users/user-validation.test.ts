import { describe, expect, it } from 'vitest';
import { validateRoleChange, validateUserId } from './user-validation.js';

describe('user validation', () => {
  it('accepts a UUID and each supported role', () => {
    expect(validateUserId('11111111-1111-4111-8111-111111111111').valid).toBe(true);
    for (const role of ['staff', 'manager', 'admin']) {
      expect(validateRoleChange({ role })).toEqual({ valid: true, value: role });
    }
  });

  it.each([
    [{}, 'Request body must contain only role.'],
    [{ role: 'owner' }, 'role must be one of staff, manager, admin.'],
    [{ role: 'staff', email: 'x@example.test' }, 'Request body must contain only role.'],
    [null, 'Request body must be a JSON object containing only role.'],
  ])('rejects an invalid role change %#', (body, message) => {
    expect(validateRoleChange(body)).toEqual({ valid: false, message });
  });

  it('rejects a malformed user id', () => {
    expect(validateUserId('not-a-uuid')).toEqual({ valid: false, message: 'id must be a UUID.' });
  });
});

