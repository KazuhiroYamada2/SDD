import { Pool } from 'pg';
import { config } from './config.js';

export const database = config.databaseUrl
  ? new Pool({ connectionString: config.databaseUrl })
  : undefined;

export const closeDatabase = async (): Promise<void> => {
  await database?.end();
};
