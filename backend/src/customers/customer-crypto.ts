import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { CreateCustomerInput, Customer, UpdateCustomerInput } from './customer-repository.js';

export const encryptedCustomerFields = ['name_kana', 'email', 'phone', 'address'] as const;
export type EncryptedCustomerField = typeof encryptedCustomerFields[number];

export type CustomerEncryptionConfig = {
  currentKeyId: string;
  keys: ReadonlyMap<string, Buffer>;
};

export class CustomerCryptoError extends Error {
  constructor() {
    super('Customer data encryption operation failed.');
    this.name = 'CustomerCryptoError';
  }
}

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const decodeBase64 = (value: string): Buffer => {
  if (value.length === 0 || !base64Pattern.test(value)) throw new CustomerCryptoError();
  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64') !== value) throw new CustomerCryptoError();
  return decoded;
};

const aadFor = (field: EncryptedCustomerField) => Buffer.from(`customer:v1:${field}`, 'utf8');

export type CustomerCrypto = {
  encrypt(field: EncryptedCustomerField, plaintext: string): string;
  decrypt(field: EncryptedCustomerField, envelope: string): string;
  encryptCreateInput(input: CreateCustomerInput): CreateCustomerInput;
  encryptUpdateInput(input: UpdateCustomerInput): UpdateCustomerInput;
  decryptCustomer(customer: Customer): Customer;
  validateEnvelope(field: EncryptedCustomerField, envelope: string): void;
};

export const createCustomerCrypto = (configuration: CustomerEncryptionConfig): CustomerCrypto => {
  const currentKey = configuration.keys.get(configuration.currentKeyId);
  if (currentKey === undefined || currentKey.length !== 32) throw new CustomerCryptoError();

  const decrypt = (field: EncryptedCustomerField, envelope: string): string => {
    try {
      const parts = envelope.split(':');
      if (parts.length !== 6 || parts[0] !== 'enc' || parts[1] !== 'v1' || parts[2] === '') {
        throw new CustomerCryptoError();
      }
      const [, , keyId, ivValue, tagValue, ciphertextValue] = parts;
      const key = configuration.keys.get(keyId!);
      if (key === undefined || key.length !== 32) throw new CustomerCryptoError();
      const iv = decodeBase64(ivValue!);
      const tag = decodeBase64(tagValue!);
      const ciphertext = decodeBase64(ciphertextValue!);
      if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) throw new CustomerCryptoError();
      const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
      decipher.setAAD(aadFor(field));
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
      throw new CustomerCryptoError();
    }
  };

  const encrypt = (field: EncryptedCustomerField, plaintext: string): string => {
    try {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', currentKey, iv, { authTagLength: 16 });
      cipher.setAAD(aadFor(field));
      const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return ['enc', 'v1', configuration.currentKeyId, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
    } catch {
      throw new CustomerCryptoError();
    }
  };

  return {
    encrypt,
    decrypt,
    encryptCreateInput(input) {
      const encrypted = { ...input };
      for (const field of encryptedCustomerFields) {
        encrypted[field] = input[field] === null ? null : encrypt(field, input[field]);
      }
      return encrypted;
    },
    encryptUpdateInput(input) {
      const encrypted = { ...input };
      for (const field of encryptedCustomerFields) {
        if (input[field] !== undefined) {
          encrypted[field] = input[field] === null ? null : encrypt(field, input[field]);
        }
      }
      return encrypted;
    },
    decryptCustomer(customer) {
      const decrypted = { ...customer };
      for (const field of encryptedCustomerFields) {
        decrypted[field] = customer[field] === null ? null : decrypt(field, customer[field]);
      }
      return decrypted;
    },
    validateEnvelope(field, envelope) {
      void decrypt(field, envelope);
    },
  };
};
