import { describe, expect, it, vi } from 'vitest';
import { createUserRepository, type TransactionClient, type TransactionalDatabase } from './user-repository.js';

const adminId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const row = (id = otherId, role: 'staff' | 'manager' | 'admin' = 'staff', isActive = true) => ({
  id, email: `${id}@example.test`, role, is_active: isActive,
});

describe('UserRepository', () => {
  it('lists active and inactive users in the required deterministic order', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [row(otherId), row(adminId, 'admin', false)] });
    const database = { query, connect: vi.fn() } as unknown as TransactionalDatabase;
    await expect(createUserRepository(database).list()).resolves.toEqual([
      { id: otherId, email: `${otherId}@example.test`, role: 'staff', active: true },
      { id: adminId, email: `${adminId}@example.test`, role: 'admin', active: false },
    ]);
    expect(query.mock.calls[0]![0]).toContain('ORDER BY email ASC, id ASC');
    expect(query.mock.calls[0]![0]).not.toContain('password_hash');
  });

  it('locks active admins in id order before updating a role in one transaction', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: adminId }, { id: otherId }] })
      .mockResolvedValueOnce({ rows: [row(otherId, 'admin')] })
      .mockResolvedValueOnce({ rows: [row(otherId, 'staff')] })
      .mockResolvedValueOnce({ rows: [] });
    const client = { query, release: vi.fn() } as unknown as TransactionClient;
    const database = { query: vi.fn(), connect: vi.fn().mockResolvedValue(client) } as unknown as TransactionalDatabase;

    await expect(createUserRepository(database).changeRole(otherId, 'staff')).resolves.toMatchObject({ status: 'updated' });
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN',
      expect.stringContaining("WHERE role = 'admin' AND is_active = TRUE"),
      expect.stringContaining('WHERE id = $1'),
      expect.stringContaining('UPDATE users'),
      'COMMIT',
    ]);
    expect(query.mock.calls[1]![0]).toContain('ORDER BY id ASC');
    expect(query.mock.calls[1]![0]).toContain('FOR UPDATE');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rejects demotion of the last active admin and performs no update', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: adminId }] })
      .mockResolvedValueOnce({ rows: [row(adminId, 'admin')] })
      .mockResolvedValueOnce({ rows: [] });
    const client = { query, release: vi.fn() } as unknown as TransactionClient;
    const database = { query: vi.fn(), connect: vi.fn().mockResolvedValue(client) } as unknown as TransactionalDatabase;

    await expect(createUserRepository(database).changeRole(adminId, 'staff'))
      .resolves.toEqual({ status: 'last_active_admin' });
    expect(query.mock.calls.map(([sql]) => sql)).not.toContain(expect.stringContaining('UPDATE users'));
    expect(query.mock.calls.at(-1)![0]).toBe('ROLLBACK');
  });

  it('returns unchanged without an update for the same role', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: adminId }] })
      .mockResolvedValueOnce({ rows: [row(adminId, 'admin')] })
      .mockResolvedValueOnce({ rows: [] });
    const client = { query, release: vi.fn() } as unknown as TransactionClient;
    const database = { query: vi.fn(), connect: vi.fn().mockResolvedValue(client) } as unknown as TransactionalDatabase;
    await expect(createUserRepository(database).changeRole(adminId, 'admin')).resolves.toMatchObject({ status: 'unchanged' });
    expect(query.mock.calls.map(([sql]) => sql)).not.toContain(expect.stringContaining('UPDATE users'));
    expect(query.mock.calls.at(-1)![0]).toBe('COMMIT');
  });

  it('allows changing the role of an inactive user', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: adminId }] })
      .mockResolvedValueOnce({ rows: [row(otherId, 'staff', false)] })
      .mockResolvedValueOnce({ rows: [row(otherId, 'manager', false)] })
      .mockResolvedValueOnce({ rows: [] });
    const client = { query, release: vi.fn() } as unknown as TransactionClient;
    const database = { query: vi.fn(), connect: vi.fn().mockResolvedValue(client) } as unknown as TransactionalDatabase;
    await expect(createUserRepository(database).changeRole(otherId, 'manager')).resolves.toEqual({
      status: 'updated',
      user: { id: otherId, email: `${otherId}@example.test`, role: 'manager', active: false },
    });
    expect(query.mock.calls[3]![0]).toContain('UPDATE users');
    expect(query.mock.calls.at(-1)![0]).toBe('COMMIT');
  });
});
