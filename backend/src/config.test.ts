import { describe, expect, it } from 'vitest';
import { loadConfig, parseCustomerEncryptionConfig } from './config.js';

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

const productionEnvironment = (overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  PORT: '3000',
  DATABASE_URL: 'postgresql://production-user:credential@database.example.test/customer_management',
  DATABASE_SSL_CA_PATH: '/run/secrets/rds-ca.pem',
  JWT_SECRET: 'production-placeholder-secret-at-least-32-bytes',
  CUSTOMER_ENCRYPTION_CURRENT_KEY_ID: 'current',
  CUSTOMER_ENCRYPTION_KEYS_JSON: JSON.stringify({ current: validKey }),
  AWS_REGION: 'ap-northeast-1',
  MAINTENANCE_FROM_EMAIL: 'maintenance-sender@example.test',
  ...overrides,
});

describe('production runtime configuration', () => {
  it('accepts the Secrets Manager environment interface and enables verified RDS TLS', () => {
    const result = loadConfig(productionEnvironment(), () => 'test-only-rds-ca-certificate');
    expect(result).toMatchObject({
      nodeEnv: 'production',
      databaseSsl: { rejectUnauthorized: true, ca: 'test-only-rds-ca-certificate' },
    });
  });

  it.each([
    ['missing DATABASE_URL', { DATABASE_URL: undefined }],
    ['invalid DATABASE_URL', { DATABASE_URL: 'not-a-url' }],
    ['non-PostgreSQL URL', { DATABASE_URL: 'https://database.example.test/customer_management' }],
    ['missing JWT_SECRET', { JWT_SECRET: undefined }],
    ['short JWT_SECRET', { JWT_SECRET: 'short' }],
    ['missing current encryption key', { CUSTOMER_ENCRYPTION_CURRENT_KEY_ID: undefined }],
    ['invalid encryption key ring', { CUSTOMER_ENCRYPTION_KEYS_JSON: '{' }],
    ['missing CA path', { DATABASE_SSL_CA_PATH: undefined }],
    ['missing AWS region', { AWS_REGION: undefined }],
    ['wrong AWS region', { AWS_REGION: 'us-east-1' }],
    ['missing maintenance sender', { MAINTENANCE_FROM_EMAIL: undefined }],
    ['invalid maintenance sender', { MAINTENANCE_FROM_EMAIL: 'bad-sender' }],
  ])('rejects %s without exposing configuration values', (_name, overrides) => {
    const environment = productionEnvironment(overrides);
    let message = '';
    try { loadConfig(environment, () => 'test-only-rds-ca-certificate'); }
    catch (error) { message = (error as Error).message; }
    expect(message).not.toBe('');
    for (const value of Object.values(environment)) {
      if (value !== undefined) expect(message).not.toContain(value);
    }
  });

  it('rejects an unreadable or empty CA file without exposing its path', () => {
    const environment = productionEnvironment();
    expect(() => loadConfig(environment, () => { throw new Error('file error'); }))
      .toThrow('Production database TLS configuration is invalid.');
    expect(() => loadConfig(environment, () => ''))
      .toThrow('Production database TLS configuration is invalid.');
  });

  it('keeps local development PostgreSQL usable without RDS TLS', () => {
    const result = loadConfig(productionEnvironment({
      NODE_ENV: 'development',
      DATABASE_SSL_CA_PATH: undefined,
      JWT_SECRET: undefined,
    }));
    expect(result.databaseSsl).toBeUndefined();
    expect(result.databaseUrl).toContain('postgresql://');
  });
});
