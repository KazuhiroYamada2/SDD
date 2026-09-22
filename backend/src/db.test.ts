import { beforeEach, describe, expect, it, vi } from 'vitest';

const { end, Pool } = vi.hoisted(() => ({
  end: vi.fn(),
  Pool: vi.fn(),
}));

vi.mock('pg', () => ({
  Pool: class MockPool {
    readonly end = end;

    constructor(options: unknown) {
      Pool(options);
    }
  },
}));
vi.mock('./config.js', () => ({
  config: {
    databaseUrl: 'postgresql://database.example.test/customer_management',
    databaseSsl: { rejectUnauthorized: true, ca: 'test-only-rds-ca-certificate' },
  },
}));

describe('database pool', () => {
  beforeEach(() => {
    end.mockReset();
  });

  it('uses one bounded pg Pool and closes it during application shutdown', async () => {
    const { closeDatabase, database } = await import('./db.js');

    expect(Pool).toHaveBeenCalledOnce();
    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgresql://database.example.test/customer_management',
      max: 10,
      min: 0,
      idleTimeoutMillis: 10_000,
      ssl: { rejectUnauthorized: true, ca: 'test-only-rds-ca-certificate' },
    });
    expect(database).toBeDefined();

    await closeDatabase();

    expect(end).toHaveBeenCalledOnce();
  });
});
