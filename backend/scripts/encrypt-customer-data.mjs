import pg from 'pg';
import { config } from '../src/config.ts';
import { createCustomerCrypto } from '../src/customers/customer-crypto.ts';
import { migrateCustomerEncryption } from '../src/customers/customer-encryption-migration.ts';

if (!config.databaseUrl) throw new Error('DATABASE_URL is required.');

const client = new pg.Client({ connectionString: config.databaseUrl });
try {
  await client.connect();
  const result = await migrateCustomerEncryption(client, createCustomerCrypto(config.customerEncryption));
  console.log(JSON.stringify(result));
} finally {
  await client.end();
}
