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
});
