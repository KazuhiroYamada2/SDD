import { describe, expect, it, vi } from 'vitest';
import { createActivityReferenceRepository } from './activity-reference-repository.js';

describe('createActivityReferenceRepository', () => {
  it('retrieves the customer id and owner in one parameterized query', async () => {
    const customer = {
      id: '8a1f2d44-1234-4abc-8def-123456789abc',
      owner_user_id: '11111111-1111-4111-8111-111111111111',
    };
    const query = vi.fn().mockResolvedValue({ rows: [customer] });
    const repository = createActivityReferenceRepository({ query });

    await expect(repository.findCustomerReference(customer.id)).resolves.toEqual(customer);
    expect(query).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, owner_user_id FROM customers WHERE id = $1'),
      [customer.id],
    );
  });

  it('returns null when the customer does not exist', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = createActivityReferenceRepository({ query });

    await expect(repository.findCustomerReference('8a1f2d44-1234-4abc-8def-123456789abc'))
      .resolves.toBeNull();
    expect(query).toHaveBeenCalledOnce();
  });
});
