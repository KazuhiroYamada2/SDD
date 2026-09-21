import { describe, expect, it } from 'vitest';
import { validateCustomerId } from './customer-read-validation.js';

describe('validateCustomerId', () => {
  it('accepts a UUID customer id', () => {
    expect(validateCustomerId('8a1f2d44-1234-4abc-8def-123456789abc')).toEqual({
      valid: true,
      value: '8a1f2d44-1234-4abc-8def-123456789abc',
    });
  });

  it.each([undefined, 123, 'not-a-uuid', ''])('rejects an invalid customer id', (id) => {
    expect(validateCustomerId(id)).toEqual({ valid: false, message: 'id must be a UUID.' });
  });
});
