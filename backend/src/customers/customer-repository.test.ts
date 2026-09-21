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

  it('applies search, filters, security scope, pagination, and count with the same parameterized WHERE', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_count: '0' }] });
    const repository = createCustomerRepository({ query });

    await repository.list({
      ownerScopeUserId: '11111111-1111-4111-8111-111111111111',
      query: 'Sample',
      category: 'A',
      ownerUserId: '22222222-2222-4222-8222-222222222222',
      sort: 'created_at_desc',
      limit: 50,
      offset: 100,
    });

    const itemSql = query.mock.calls[0]?.[0] as string;
    const countSql = query.mock.calls[1]?.[0] as string;
    const sharedWhere = /WHERE deleted_at IS NULL AND owner_user_id = \$1 AND name ILIKE \$2 AND category = \$3 AND owner_user_id = \$4/;
    expect(itemSql).toMatch(sharedWhere);
    expect(countSql).toMatch(sharedWhere);
    expect(itemSql).toMatch(/ORDER BY created_at DESC, id ASC[\s\S]*LIMIT \$5 OFFSET \$6/);
    expect(query).toHaveBeenNthCalledWith(1, expect.any(String), [
      '11111111-1111-4111-8111-111111111111',
      '%Sample%',
      'A',
      '22222222-2222-4222-8222-222222222222',
      50,
      100,
    ]);
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), [
      '11111111-1111-4111-8111-111111111111',
      '%Sample%',
      'A',
      '22222222-2222-4222-8222-222222222222',
    ]);
  });

  it.each([
    ['name_asc', 'name ASC, id ASC'],
    ['name_desc', 'name DESC, id ASC'],
    ['created_at_asc', 'created_at ASC, id ASC'],
    ['created_at_desc', 'created_at DESC, id ASC'],
  ] as const)('uses stable ordering for %s', async (sort, expectedOrder) => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_count: 0 }] });

    await createCustomerRepository({ query }).list({ sort, limit: 20, offset: 0 });

    expect(query.mock.calls[0]?.[0]).toContain(`ORDER BY ${expectedOrder}`);
  });

  it('keeps the client owner filter separate from the staff security scope', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_count: 0 }] });

    await createCustomerRepository({ query }).list({
      ownerScopeUserId: '11111111-1111-4111-8111-111111111111',
      ownerUserId: '22222222-2222-4222-8222-222222222222',
      limit: 20,
      offset: 0,
    });

    expect(query.mock.calls[0]?.[0]).toMatch(/owner_user_id = \$1 AND owner_user_id = \$2/);
    expect(query.mock.calls[0]?.[1]).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      20,
      0,
    ]);
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

  it('updates only supplied editable fields with a parameterized active-customer query', async () => {
    const updated = {
      id: '8a1f2d44-1234-4abc-8def-123456789abc', name: 'After', name_kana: null,
      email: null, phone: null, address: null, category: 'A',
      owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
      created_at: new Date('2026-09-01T00:00:00.000Z'), updated_at: new Date('2026-09-02T00:00:00.000Z'), deleted_at: null,
    };
    const query = vi.fn().mockResolvedValue({ rows: [updated] });
    const repository = createCustomerRepository({ query });

    await expect(repository.updateActiveById(updated.id, { name: 'After', category: 'A' })).resolves.toEqual(updated);
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/SET name = \$1, category = \$2, updated_at = NOW\(\)[\s\S]*WHERE id = \$3 AND deleted_at IS NULL/),
      ['After', 'A', updated.id],
    );
    expect(query.mock.calls[0]?.[0]).not.toContain('owner_user_id =');
    expect(query.mock.calls[0]?.[0]).not.toContain('created_at =');
    expect(query.mock.calls[0]?.[0]).not.toContain('deleted_at =');
  });

  it('logically deletes an active customer without a physical DELETE statement', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: '8a1f2d44-1234-4abc-8def-123456789abc' }] });
    const repository = createCustomerRepository({ query });
    await expect(repository.logicalDeleteActiveById('8a1f2d44-1234-4abc-8def-123456789abc')).resolves.toBe(true);
    const sql = query.mock.calls[0]?.[0] as string;
    expect(sql).toMatch(/UPDATE customers[\s\S]*SET deleted_at = NOW\(\), updated_at = NOW\(\)/);
    expect(sql).toContain('WHERE id = $1 AND deleted_at IS NULL');
    expect(sql.trimStart()).not.toMatch(/^DELETE\s/i);
  });

  it('reports no logical delete when no active customer row is updated', async () => {
    const repository = createCustomerRepository({ query: vi.fn().mockResolvedValue({ rows: [] }) });
    await expect(repository.logicalDeleteActiveById('8a1f2d44-1234-4abc-8def-123456789abc')).resolves.toBe(false);
  });
});
