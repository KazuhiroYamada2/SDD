import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { validateJwtSecret } from './auth/jwt-service.js';
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

export type RuntimeConfig = {
  nodeEnv: string;
  port: number;
  databaseUrl: string | undefined;
  databaseSsl: { rejectUnauthorized: true; ca: string } | undefined;
  customerEncryption: CustomerEncryptionConfig;
};

const parseDatabaseUrl = (value: string | undefined, required: boolean): string | undefined => {
  if (value === undefined || value.trim() === '') {
    if (required) throw new Error('Production database configuration is invalid.');
    return undefined;
  }
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error('Database configuration is invalid.');
  }
  return value;
};

export const loadConfig = (
  environment: NodeJS.ProcessEnv = process.env,
  readCaFile: (path: string) => string = (path) => readFileSync(path, 'utf8'),
): RuntimeConfig => {
  const nodeEnv = environment.NODE_ENV ?? 'development';
  const production = nodeEnv === 'production';
  const databaseUrl = parseDatabaseUrl(environment.DATABASE_URL, production);

  let databaseSsl: RuntimeConfig['databaseSsl'];
  if (production) {
    validateJwtSecret(environment.JWT_SECRET);
    const caPath = environment.DATABASE_SSL_CA_PATH;
    if (caPath === undefined || caPath.trim() === '') {
      throw new Error('Production database TLS configuration is invalid.');
    }
    let ca: string;
    try {
      ca = readCaFile(caPath);
    } catch {
      throw new Error('Production database TLS configuration is invalid.');
    }
    if (ca.trim() === '') throw new Error('Production database TLS configuration is invalid.');
    databaseSsl = { rejectUnauthorized: true, ca };
  }

  return {
    nodeEnv,
    port: parsePort(environment.PORT),
    databaseUrl,
    databaseSsl,
    customerEncryption: parseCustomerEncryptionConfig(
      environment.CUSTOMER_ENCRYPTION_CURRENT_KEY_ID,
      environment.CUSTOMER_ENCRYPTION_KEYS_JSON,
    ),
  };
};

export const config = loadConfig();
