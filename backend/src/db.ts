import { Pool } from 'pg';
import { config } from './config.js';

export const database = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      min: 0,
      idleTimeoutMillis: 10_000,
      ...(config.databaseSsl === undefined ? {} : { ssl: config.databaseSsl }),
    })
  : undefined;

export const closeDatabase = async (): Promise<void> => {
  await database?.end();
};
