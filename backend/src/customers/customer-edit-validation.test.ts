import { describe, expect, it } from 'vitest';
import { validateUpdateCustomer } from './customer-validation.js';

describe('validateUpdateCustomer', () => {
  it('accepts a partial update, trims strings, and preserves explicit nulls', () => {
    expect(validateUpdateCustomer({ name: '  Sample  ', email: null, category: '' })).toEqual({
      valid: true,
      value: { name: 'Sample', email: null, category: null },
    });
  });

  it.each([
    [{}, 'At least one editable customer field is required.'],
    [{ owner_user_id: '11111111-1111-4111-8111-111111111111' }, 'Request body contains an unknown or non-editable field.'],
    [{ unknown: 'value' }, 'Request body contains an unknown or non-editable field.'],
    [{ name: null }, 'name must be a non-empty string.'],
    [{ name: '  ' }, 'name must be a non-empty string.'],
    [{ email: 1 }, 'email must be a string or null.'],
    [{ email: 'invalid' }, 'email must be a valid email address.'],
  ])('rejects invalid PATCH input %#', (body, message) => {
    expect(validateUpdateCustomer(body)).toEqual({ valid: false, message });
  });
});
