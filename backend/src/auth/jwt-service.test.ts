import { decodeJwt, decodeProtectedHeader, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { createJwtService } from './jwt-service.js';

const testOnlySecret = 'test-only-jwt-secret-for-t104-unit-tests-32-bytes';
const differentTestOnlySecret = 'different-test-only-jwt-secret-for-unit-tests';
const userId = 'c0a80101-1234-4abc-8def-123456789abc';
const issuedAt = new Date('2026-01-15T00:00:00.000Z');
const key = new TextEncoder().encode(testOnlySecret);

describe('createJwtService', () => {
  it('issues a 30-minute HS256 token with only sub, iat, and exp', async () => {
    const service = createJwtService({ secret: testOnlySecret, now: () => issuedAt });
    const token = await service.issueAccessToken(userId);
    const claims = decodeJwt(token);

    expect(decodeProtectedHeader(token).alg).toBe('HS256');
    expect(Object.keys(claims).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(claims.sub).toBe(userId);
    expect(claims.exp! - claims.iat!).toBe(1800);
    await expect(service.verifyAccessToken(token)).resolves.toEqual({ userId });
  });

  it('rejects a token signed with another secret and a tampered token', async () => {
    const service = createJwtService({ secret: testOnlySecret, now: () => issuedAt });
    const token = await service.issueAccessToken(userId);
    const otherService = createJwtService({ secret: differentTestOnlySecret, now: () => issuedAt });
    const [header, payload, signature] = token.split('.');
    const tampered = `${header}.${payload}.${signature!.startsWith('A') ? 'B' : 'A'}${signature!.slice(1)}`;

    await expect(otherService.verifyAccessToken(token)).rejects.toThrow();
    await expect(service.verifyAccessToken(tampered)).rejects.toThrow();
  });

  it('rejects an expired token without waiting', async () => {
    let currentTime = issuedAt;
    const service = createJwtService({ secret: testOnlySecret, now: () => currentTime });
    const token = await service.issueAccessToken(userId);

    currentTime = new Date(issuedAt.getTime() + 1800_000);
    await expect(service.verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects algorithms other than HS256', async () => {
    const service = createJwtService({ secret: testOnlySecret, now: () => issuedAt });
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS384' })
      .setSubject(userId)
      .setIssuedAt(Math.floor(issuedAt.getTime() / 1000))
      .setExpirationTime(Math.floor(issuedAt.getTime() / 1000) + 1800)
      .sign(key);

    await expect(service.verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects a missing or invalid subject', async () => {
    const service = createJwtService({ secret: testOnlySecret, now: () => issuedAt });
    const epoch = Math.floor(issuedAt.getTime() / 1000);
    const missingSubject = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(epoch)
      .setExpirationTime(epoch + 1800)
      .sign(key);
    const invalidSubject = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('not-a-uuid')
      .setIssuedAt(epoch)
      .setExpirationTime(epoch + 1800)
      .sign(key);

    await expect(service.verifyAccessToken(missingSubject)).rejects.toThrow();
    await expect(service.verifyAccessToken(invalidSubject)).rejects.toThrow();
    await expect(service.issueAccessToken('not-a-uuid')).rejects.toThrow();
  });

  it('rejects malformed tokens and tokens without an expiration claim', async () => {
    const service = createJwtService({ secret: testOnlySecret, now: () => issuedAt });
    const tokenWithoutExpiration = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt(Math.floor(issuedAt.getTime() / 1000))
      .sign(key);

    await expect(service.verifyAccessToken('malformed-test-only-token')).rejects.toThrow();
    await expect(service.verifyAccessToken(tokenWithoutExpiration)).rejects.toThrow();
  });

  it('rejects missing or short signing secrets without exposing their values', () => {
    expect(() => createJwtService({ secret: '' })).toThrow('JWT_SECRET must contain at least 32 bytes.');
    expect(() => createJwtService({ secret: 'short-test-only-key' })).toThrow('JWT_SECRET must contain at least 32 bytes.');
  });
});
