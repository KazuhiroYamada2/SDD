import { writeFile } from 'node:fs/promises';
import pg from 'pg';
import { config } from '../src/config.ts';
import { createCustomerCrypto } from '../src/customers/customer-crypto.ts';
import { parseCustomerMigrationWorkbook } from '../src/customer-migration/customer-migration-excel.ts';
import { migrateCustomers } from '../src/customer-migration/customer-migration.ts';

const parseArguments = (values) => {
  const parsed = {};
  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index];
    const value = values[index + 1];
    if (!['--input', '--dataset-id', '--batch-size', '--reject-output'].includes(flag) || value === undefined) {
      throw new Error('Usage: migrate:customers -- --input <xlsx> --dataset-id <id> [--batch-size <integer>] [--reject-output <json>]');
    }
    parsed[flag.slice(2)] = value;
  }
  if (!parsed.input || !parsed['dataset-id']) {
    throw new Error('Usage: migrate:customers -- --input <xlsx> --dataset-id <id> [--batch-size <integer>] [--reject-output <json>]');
  }
  const batchSize = parsed['batch-size'] === undefined ? undefined : Number(parsed['batch-size']);
  return { input: parsed.input, datasetId: parsed['dataset-id'], batchSize, rejectOutput: parsed['reject-output'] };
};

const main = async () => {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required.');
  const options = parseArguments(process.argv.slice(2));
  const workbook = await parseCustomerMigrationWorkbook(options.input);
  const client = new pg.Client({ connectionString: config.databaseUrl });
  try {
    await client.connect();
    const result = await migrateCustomers(workbook, client, createCustomerCrypto(config.customerEncryption), {
      datasetId: options.datasetId,
      ...(options.batchSize === undefined ? {} : { batchSize: options.batchSize }),
    });
    if (options.rejectOutput) {
      await writeFile(options.rejectOutput, `${JSON.stringify(result.rejects, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
    }
    console.log(JSON.stringify(result));
  } finally {
    await client.end();
  }
};

main().catch(() => {
  console.error('Customer migration failed.');
  process.exitCode = 1;
});
