import { describe, expect, it } from 'vitest';
import { parseCustomerEncryptionConfig } from './config.js';

const validKey = Buffer.alloc(32, 4).toString('base64');

describe('Customer encryption configuration', () => {
  it('parses the current key and key ring', () => {
    const result = parseCustomerEncryptionConfig('current', JSON.stringify({ current: validKey }));
    expect(result.currentKeyId).toBe('current');
    expect(result.keys.get('current')).toHaveLength(32);
  });

  it.each([
    [undefined, undefined],
    ['', JSON.stringify({ current: validKey })],
    ['current', undefined],
    ['current', '{'],
    ['current', '[]'],
    ['missing', JSON.stringify({ current: validKey })],
    ['current', JSON.stringify({ current: 'not-base64' })],
    ['current', JSON.stringify({ current: Buffer.alloc(31).toString('base64') })],
  ])('rejects invalid configuration without exposing values', (keyId, keys) => {
    expect(() => parseCustomerEncryptionConfig(keyId, keys)).toThrow('Customer encryption configuration is invalid.');
  });
});
