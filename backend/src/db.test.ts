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
  config: { databaseUrl: 'postgresql://database.example.test/customer_management' },
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
    });
    expect(database).toBeDefined();

    await closeDatabase();

    expect(end).toHaveBeenCalledOnce();
  });
});
