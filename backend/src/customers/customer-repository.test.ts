import { describe, expect, it, vi } from 'vitest';
import { createCustomerRepository } from './customer-repository.js';

describe('createCustomerRepository', () => {
  it('inserts customer data with a parameterized query', async () => {
    const customer = {
      id: '8a1f2d44-1234-4abc-8def-123456789abc',
      name: '株式会社サンプル',
      name_kana: null,
      email: null,
      phone: null,
      address: null,
      category: null,
      owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };
    const query = vi.fn().mockResolvedValue({ rows: [customer] });
    const repository = createCustomerRepository({ query });

    await expect(repository.create({
      name: customer.name,
      name_kana: null,
      email: null,
      phone: null,
      address: null,
      category: null,
      owner_user_id: customer.owner_user_id,
    })).resolves.toEqual(customer);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('VALUES ($1, $2, $3, $4, $5, $6, $7, $8)'),
      [
        expect.any(String),
        customer.name,
        null,
        null,
        null,
        null,
        null,
        customer.owner_user_id,
      ],
    );
  });

  it('lists active customers with the staff owner scope in SQL and counts the same scope', async () => {
    const customer = {
      id: '8a1f2d44-1234-4abc-8def-123456789abc',
      name: '株式会社サンプル',
      name_kana: null,
      email: null,
      phone: null,
      address: null,
      category: null,
      owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
      created_at: new Date('2026-09-13T00:00:00.000Z'),
      updated_at: new Date('2026-09-13T00:00:00.000Z'),
      deleted_at: null,
    };
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [customer] })
      .mockResolvedValueOnce({ rows: [{ total_count: '1' }] });
    const repository = createCustomerRepository({ query });

    await expect(repository.list({ ownerScopeUserId: customer.owner_user_id, limit: 20, offset: 0 }))
      .resolves.toEqual({ items: [customer], totalCount: 1 });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/WHERE deleted_at IS NULL AND owner_user_id = \$1[\s\S]*ORDER BY name ASC, id ASC/),
      [customer.owner_user_id, 20, 0],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE deleted_at IS NULL AND owner_user_id = $1'),
      [customer.owner_user_id],
    );
  });

  it('lists all active customers without a role or owner condition for manager and admin scope', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_count: 0 }] });
    const repository = createCustomerRepository({ query });

    await expect(repository.list({ limit: 20, offset: 0 })).resolves.toEqual({ items: [], totalCount: 0 });

    const itemSql = query.mock.calls[0]?.[0] as string;
    const countSql = query.mock.calls[1]?.[0] as string;
    expect(itemSql).toContain('WHERE deleted_at IS NULL');
    expect(itemSql).not.toContain('owner_user_id =');
    expect(countSql).toContain('WHERE deleted_at IS NULL');
    expect(countSql).not.toContain('owner_user_id =');
    expect(query).toHaveBeenNthCalledWith(1, expect.any(String), [20, 0]);
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), []);
  });

  it('retrieves one active customer in a single parameterized query', async () => {
    const customer = {
      id: '8a1f2d44-1234-4abc-8def-123456789abc',
      name: '株式会社サンプル',
      name_kana: null,
      email: null,
      phone: null,
      address: null,
      category: null,
      owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
      created_at: new Date('2026-09-13T00:00:00.000Z'),
      updated_at: new Date('2026-09-13T00:00:00.000Z'),
      deleted_at: null,
    };
    const query = vi.fn().mockResolvedValue({ rows: [customer] });
    const repository = createCustomerRepository({ query });

    await expect(repository.findActiveById(customer.id)).resolves.toEqual(customer);
    expect(query).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND deleted_at IS NULL'),
      [customer.id],
    );
  });

  it('returns null when an active customer cannot be found', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = createCustomerRepository({ query });

    await expect(repository.findActiveById('8a1f2d44-1234-4abc-8def-123456789abc')).resolves.toBeNull();
  });
});
