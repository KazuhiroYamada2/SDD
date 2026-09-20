import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../../scripts/e2e-db.mjs', import.meta.url));

describe('E2E database safety', () => {
  it.each([
    ['wrong database name', 'e2e', 'postgresql://customer_management_e2e:secret@127.0.0.1:55432/customer_management'],
    ['wrong NODE_ENV', 'development', 'postgresql://customer_management_e2e:secret@127.0.0.1:55432/customer_management_e2e'],
  ])('rejects %s before connecting', (_name, nodeEnv, databaseUrl) => {
    const result = spawnSync(process.execPath, [script, 'reset'], {
      env: { ...process.env, NODE_ENV: nodeEnv, DATABASE_URL: databaseUrl },
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('E2E DB safety check failed');
    expect(result.stderr).not.toContain('secret');
  });
});
