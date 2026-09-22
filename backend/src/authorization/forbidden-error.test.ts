import { describe, expect, it } from 'vitest';
import { ForbiddenError, forbiddenResponse } from './forbidden-error.js';

describe('ForbiddenError', () => {
  it('exposes only the common 403 contract for an operation denial', () => {
    const error = new ForbiddenError();

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Forbidden.');
    expect(forbiddenResponse).toEqual({ code: 'FORBIDDEN', message: 'Forbidden.' });
    expect(forbiddenResponse).not.toHaveProperty('role');
    expect(forbiddenResponse).not.toHaveProperty('owner');
    expect(forbiddenResponse).not.toHaveProperty('operation');
  });
});
