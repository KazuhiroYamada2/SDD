import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth-types.js';
import { ForbiddenError } from '../authorization/forbidden-error.js';
import { createCustomerEditService } from './customer-edit-service.js';
import { passthroughCustomerCrypto } from '../test/customer-crypto.js';
import { CustomerNotFoundError } from './customer-read-service.js';
import type { Customer, CustomerEditRepository } from './customer-repository.js';

const staff: AuthenticatedUser = { id: '11111111-1111-4111-8111-111111111111', role: 'staff' };
const otherOwnerId = '22222222-2222-4222-8222-222222222222';
const customer: Customer = {
  id: '8a1f2d44-1234-4abc-8def-123456789abc', name: 'Before', name_kana: null,
  email: null, phone: null, address: null, category: null, owner_user_id: staff.id,
  created_at: new Date('2026-09-01T00:00:00.000Z'), updated_at: new Date('2026-09-01T00:00:00.000Z'), deleted_at: null,
};

const repositoryFor = (found: Customer | null = customer): CustomerEditRepository => ({
  list: vi.fn(),
  findActiveById: vi.fn().mockResolvedValue(found),
  updateActiveById: vi.fn().mockImplementation(async (_id, input) => found === null ? null : ({
    ...found,
    ...input,
    updated_at: new Date('2026-09-02T00:00:00.000Z'),
  })),
});

describe('createCustomerEditService', () => {
  it('encrypts only changed protected fields and preserves omitted ciphertext', async () => {
    const existing = { ...customer, email: 'enc:v1:existing-email', phone: 'enc:v1:existing-phone' };
    const repository = repositoryFor(existing);
    const encryptUpdateInput = vi.fn(() => ({ email: 'enc:v1:new-email' }));
    const crypto = { ...passthroughCustomerCrypto, encryptUpdateInput };

    await createCustomerEditService(repository, crypto).update(existing.id, { email: 'new@example.test' }, staff);

    expect(encryptUpdateInput).toHaveBeenCalledWith({ email: 'new@example.test' });
    expect(repository.updateActiveById).toHaveBeenCalledWith(existing.id, { email: 'enc:v1:new-email' });
    expect(repository.updateActiveById).not.toHaveBeenCalledWith(existing.id, expect.objectContaining({ phone: expect.anything() }));
  });
  it('allows staff to update an owned customer', async () => {
    const repository = repositoryFor();
    const result = await createCustomerEditService(repository, passthroughCustomerCrypto).update(customer.id, { name: 'After' }, staff);
    expect(result.name).toBe('After');
    expect(repository.updateActiveById).toHaveBeenCalledWith(customer.id, { name: 'After' });
  });

  it('hides another staff-owned customer and does not update it', async () => {
    const repository = repositoryFor({ ...customer, owner_user_id: otherOwnerId });
    await expect(createCustomerEditService(repository, passthroughCustomerCrypto).update(customer.id, { name: 'After' }, staff))
      .rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(repository.updateActiveById).not.toHaveBeenCalled();
  });

  it('rejects manager before customer lookup', async () => {
    const repository = repositoryFor();
    await expect(createCustomerEditService(repository, passthroughCustomerCrypto).update(customer.id, { name: 'After' }, { ...staff, role: 'manager' }))
      .rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.findActiveById).not.toHaveBeenCalled();
    expect(repository.updateActiveById).not.toHaveBeenCalled();
  });

  it('allows admin to update another owner customer', async () => {
    const repository = repositoryFor({ ...customer, owner_user_id: otherOwnerId });
    await expect(createCustomerEditService(repository, passthroughCustomerCrypto).update(customer.id, { category: 'A' }, { ...staff, role: 'admin' }))
      .resolves.toMatchObject({ category: 'A', owner_user_id: otherOwnerId });
  });

  it('returns the same not-found error for a missing or deleted customer', async () => {
    const repository = repositoryFor(null);
    await expect(createCustomerEditService(repository, passthroughCustomerCrypto).update(customer.id, { name: 'After' }, staff))
      .rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(repository.updateActiveById).not.toHaveBeenCalled();
  });
});
