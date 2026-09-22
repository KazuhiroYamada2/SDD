import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  backupPostgres,
  parsePostgresConnection,
  restorePostgres,
  type ToolRunner,
} from './postgres-backup.js';

const connectionString = 'postgresql://backup-user:sensitive-password@database.example.test:5432/customer_management';

describe('PostgreSQL backup and restore tool invocation', () => {
  it('parses PostgreSQL URLs without exposing credentials on failure', () => {
    expect(parsePostgresConnection(connectionString)).toMatchObject({
      host: 'database.example.test', port: '5432', username: 'backup-user', database: 'customer_management',
    });
    expect(() => parsePostgresConnection('https://secret@example.test/database'))
      .toThrow('PostgreSQL backup configuration is invalid.');
  });

  it('runs pg_dump in custom format with the password only in the child environment', async () => {
    const directory = await mkdtemp(join(tmpdir(), 't702-backup-test-'));
    const outputPath = join(directory, 'database.dump');
    let invocation: Parameters<ToolRunner> | undefined;
    const runner: ToolRunner = async (...parameters) => {
      invocation = parameters;
      await writeFile(outputPath, 'synthetic-non-empty-dump');
    };
    await expect(backupPostgres({ connectionString, outputPath, runner })).resolves.toBeGreaterThan(0);
    expect(invocation).toBeDefined();
    const [executable, arguments_, environment] = invocation!;
    expect(executable).toBe('pg_dump');
    expect(arguments_).toContain('--format=custom');
    expect(arguments_).not.toContain('sensitive-password');
    expect(environment.PGPASSWORD).toBe('sensitive-password');
    expect(environment.DATABASE_URL).toBeUndefined();
    expect(environment.JWT_SECRET).toBeUndefined();
    expect(environment.CUSTOMER_ENCRYPTION_KEYS_JSON).toBeUndefined();
  });

  it('runs pg_restore against the explicitly separated target database', async () => {
    let invocation: Parameters<ToolRunner> | undefined;
    const runner: ToolRunner = async (...parameters) => { invocation = parameters; };
    await restorePostgres({
      connectionString: 'postgresql://restore-user:secret@127.0.0.1:55432/customer_management_restore_t702',
      inputPath: 'database.dump',
      runner,
    });
    expect(invocation).toBeDefined();
    const [, arguments_] = invocation!;
    expect(arguments_).toContain('customer_management_restore_t702');
    expect(arguments_).toContain('--exit-on-error');
    expect(arguments_).not.toContain('secret');
  });
});
