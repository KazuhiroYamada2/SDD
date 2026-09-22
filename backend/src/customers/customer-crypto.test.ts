import { describe, expect, it } from 'vitest';
import { createCustomerCrypto, CustomerCryptoError } from './customer-crypto.js';

const configuration = (currentKeyId = 'current') => ({
  currentKeyId,
  keys: new Map([
    ['current', Buffer.alloc(32, 1)],
    ['old', Buffer.alloc(32, 2)],
  ]),
});

describe('Customer AES-256-GCM crypto', () => {
  it('encrypts and decrypts with the v1 envelope and field AAD', () => {
    const crypto = createCustomerCrypto(configuration());
    const envelope = crypto.encrypt('email', 'person@example.test');
    expect(envelope).toMatch(/^enc:v1:current:/);
    expect(envelope).not.toContain('person@example.test');
    expect(crypto.decrypt('email', envelope)).toBe('person@example.test');
    expect(() => crypto.decrypt('phone', envelope)).toThrow(CustomerCryptoError);
  });

  it('uses a fresh IV for each encryption', () => {
    const crypto = createCustomerCrypto(configuration());
    const first = crypto.encrypt('address', 'same plaintext');
    const second = crypto.encrypt('address', 'same plaintext');
    expect(first).not.toBe(second);
    expect(first.split(':')[3]).not.toBe(second.split(':')[3]);
  });

  it.each([3, 4])('fails closed when envelope part %i is tampered', (part) => {
    const crypto = createCustomerCrypto(configuration());
    const pieces = crypto.encrypt('email', 'person@example.test').split(':');
    const decoded = Buffer.from(pieces[part]!, 'base64');
    decoded[0] ^= 1;
    pieces[part] = decoded.toString('base64');
    expect(() => crypto.decrypt('email', pieces.join(':'))).toThrow(CustomerCryptoError);
  });

  it('fails closed for unknown and wrong keys', () => {
    const encrypted = createCustomerCrypto(configuration()).encrypt('phone', '000-0000');
    expect(() => createCustomerCrypto({ currentKeyId: 'old', keys: new Map([['old', Buffer.alloc(32, 2)]]) })
      .decrypt('phone', encrypted)).toThrow(CustomerCryptoError);
    const wrong = createCustomerCrypto({ currentKeyId: 'current', keys: new Map([['current', Buffer.alloc(32, 9)]]) });
    expect(() => wrong.decrypt('phone', encrypted)).toThrow(CustomerCryptoError);
  });

  it.each(['plaintext', 'enc:v1', 'enc:v1:key:not-base64:x:y', 'enc:v2:key:a:b:c'])
  ('fails closed for malformed envelope %s', (value) => {
    expect(() => createCustomerCrypto(configuration()).decrypt('email', value)).toThrow(CustomerCryptoError);
  });

  it('preserves null and only encrypts supplied update fields', () => {
    const crypto = createCustomerCrypto(configuration());
    const created = crypto.encryptCreateInput({
      name: 'Name', name_kana: null, email: 'person@example.test', phone: null,
      address: 'Address', category: null, owner_user_id: 'owner',
    });
    expect(created.name_kana).toBeNull();
    expect(created.phone).toBeNull();
    expect(created.email).toMatch(/^enc:v1:/);
    const updated = crypto.encryptUpdateInput({ email: null, address: 'New address' });
    expect(updated).toEqual({ email: null, address: expect.stringMatching(/^enc:v1:/) });
    expect(updated.phone).toBeUndefined();
  });
});
