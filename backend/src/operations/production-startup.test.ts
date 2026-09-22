import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../../scripts/start-production.mjs', import.meta.url));

describe('production startup entry point', () => {
  it.each([undefined, 'development', 'test'])('rejects NODE_ENV=%s before importing the server', (nodeEnv) => {
    const sensitiveValue = 'must-not-appear-in-errors';
    const environment = {
      ...process.env,
      NODE_ENV: nodeEnv,
      DATABASE_URL: `postgresql://user:${sensitiveValue}@database.example.test/customer_management`,
      JWT_SECRET: sensitiveValue.repeat(3),
    };
    if (nodeEnv === undefined) delete environment.NODE_ENV;
    const result = spawnSync(process.execPath, [script], { env: environment, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Production startup configuration is invalid.');
    expect(result.stderr).not.toContain(sensitiveValue);
  });
});
