import { mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { spawn } from 'node:child_process';

export type PostgresConnection = {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
};

export type ToolRunner = (
  executable: string,
  arguments_: readonly string[],
  environment: NodeJS.ProcessEnv,
) => Promise<void>;

export const parsePostgresConnection = (connectionString: string | undefined): PostgresConnection => {
  if (connectionString === undefined || connectionString.trim() === '') {
    throw new Error('PostgreSQL backup configuration is invalid.');
  }
  try {
    const url = new URL(connectionString);
    const database = decodeURIComponent(url.pathname.slice(1));
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname === '' ||
        url.username === '' || database === '') throw new Error();
    return {
      host: url.hostname,
      port: url.port || '5432',
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
    };
  } catch {
    throw new Error('PostgreSQL backup configuration is invalid.');
  }
};

export const runPostgresTool: ToolRunner = (executable, arguments_, environment) =>
  new Promise((resolve, reject) => {
    const child = spawn(executable, [...arguments_], {
      env: environment,
      stdio: ['ignore', 'ignore', 'ignore'],
      windowsHide: true,
    });
    child.once('error', () => reject(new Error('PostgreSQL client tool could not be started.')));
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error('PostgreSQL client tool failed.'));
    });
  });

const toolEnvironment = (connection: PostgresConnection): NodeJS.ProcessEnv => {
  const environment: NodeJS.ProcessEnv = { ...process.env, PGPASSWORD: connection.password };
  delete environment.DATABASE_URL;
  delete environment.JWT_SECRET;
  delete environment.CUSTOMER_ENCRYPTION_KEYS_JSON;
  return environment;
};

const connectionArguments = (connection: PostgresConnection): string[] => [
  '--host', connection.host,
  '--port', connection.port,
  '--username', connection.username,
  '--dbname', connection.database,
];

export const backupPostgres = async ({
  connectionString,
  outputPath,
  executable = process.env.PG_DUMP_PATH ?? 'pg_dump',
  runner = runPostgresTool,
}: {
  connectionString: string | undefined;
  outputPath: string;
  executable?: string;
  runner?: ToolRunner;
}): Promise<number> => {
  const connection = parsePostgresConnection(connectionString);
  await mkdir(dirname(outputPath), { recursive: true });
  await runner(executable, [
    ...connectionArguments(connection),
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--file', outputPath,
  ], toolEnvironment(connection));
  const result = await stat(outputPath);
  if (!result.isFile() || result.size === 0) throw new Error('PostgreSQL backup artifact is empty.');
  return result.size;
};

export const restorePostgres = async ({
  connectionString,
  inputPath,
  executable = process.env.PG_RESTORE_PATH ?? 'pg_restore',
  runner = runPostgresTool,
}: {
  connectionString: string | undefined;
  inputPath: string;
  executable?: string;
  runner?: ToolRunner;
}): Promise<void> => {
  const connection = parsePostgresConnection(connectionString);
  await runner(executable, [
    ...connectionArguments(connection),
    '--exit-on-error',
    '--no-owner',
    '--no-privileges',
    inputPath,
  ], toolEnvironment(connection));
};
