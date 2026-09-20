import { describe, expect, it } from 'vitest';
import { createDummyPasswordHash, hashPassword, verifyPassword } from './password-hasher.js';

const testPassword = 'test-only-password-for-hash-check';

describe('password hasher', () => {
  it('hashes with Argon2id and verifies only the matching password', async () => {
    const encodedHash = await hashPassword(testPassword);

    expect(encodedHash.startsWith('$argon2id$')).toBe(true);
    const parameters = Object.fromEntries(
      encodedHash.split('$')[3]!.split(',').map((entry) => entry.split('=')),
    );
    expect(parameters).toEqual({ m: '19456', t: '2', p: '1' });
    await expect(verifyPassword(encodedHash, testPassword)).resolves.toBe(true);
    await expect(verifyPassword(encodedHash, 'different-test-only-password')).resolves.toBe(false);
  });

  it('uses a separate salt for each hash of the same password', async () => {
    const first = await hashPassword(testPassword);
    const second = await hashPassword(testPassword);

    expect(first === second).toBe(false);
    await expect(verifyPassword(first, testPassword)).resolves.toBe(true);
    await expect(verifyPassword(second, testPassword)).resolves.toBe(true);
  });

  it('provides a valid dummy hash for future unknown-email verification', async () => {
    const dummyHash = await createDummyPasswordHash();

    expect(dummyHash.startsWith('$argon2id$')).toBe(true);
    await expect(verifyPassword(dummyHash, 'not-the-random-dummy-password')).resolves.toBe(false);
  });
});
