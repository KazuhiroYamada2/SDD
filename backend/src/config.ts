import 'dotenv/config';
import type { CustomerEncryptionConfig } from './customers/customer-crypto.js';

const parsePort = (value: string | undefined): number => {
  if (value === undefined) {
    return 3000;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
};

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export const parseCustomerEncryptionConfig = (
  currentKeyIdValue: string | undefined,
  keysJsonValue: string | undefined,
): CustomerEncryptionConfig => {
  if (currentKeyIdValue === undefined || currentKeyIdValue.trim() === '' || currentKeyIdValue.includes(':')) {
    throw new Error('Customer encryption configuration is invalid.');
  }
  if (keysJsonValue === undefined || keysJsonValue.trim() === '') {
    throw new Error('Customer encryption configuration is invalid.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(keysJsonValue);
  } catch {
    throw new Error('Customer encryption configuration is invalid.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Customer encryption configuration is invalid.');
  }

  const keys = new Map<string, Buffer>();
  for (const [keyId, value] of Object.entries(parsed)) {
    if (keyId === '' || keyId.includes(':') || typeof value !== 'string' || !base64Pattern.test(value)) {
      throw new Error('Customer encryption configuration is invalid.');
    }
    const decoded = Buffer.from(value, 'base64');
    if (decoded.length !== 32 || decoded.toString('base64') !== value) {
      throw new Error('Customer encryption configuration is invalid.');
    }
    keys.set(keyId, decoded);
  }
  if (!keys.has(currentKeyIdValue)) throw new Error('Customer encryption configuration is invalid.');
  return { currentKeyId: currentKeyIdValue, keys };
};

export const config = {
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL,
  customerEncryption: parseCustomerEncryptionConfig(
    process.env.CUSTOMER_ENCRYPTION_CURRENT_KEY_ID,
    process.env.CUSTOMER_ENCRYPTION_KEYS_JSON,
  ),
};
