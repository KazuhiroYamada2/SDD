import { resolve } from 'node:path';
import { backupPostgres } from '../src/operations/postgres-backup.ts';

const outputFlag = process.argv.indexOf('--output');
if (outputFlag < 0 || process.argv[outputFlag + 1] === undefined) {
  console.error('Usage: backup:postgres -- --output <path.dump>');
  process.exitCode = 1;
} else {
  const outputPath = resolve(process.argv[outputFlag + 1]);
  backupPostgres({ connectionString: process.env.DATABASE_URL, outputPath })
    .then((size) => console.log(JSON.stringify({ status: 'completed', bytes: size })))
    .catch(() => {
      console.error('PostgreSQL backup failed.');
      process.exitCode = 1;
    });
}
