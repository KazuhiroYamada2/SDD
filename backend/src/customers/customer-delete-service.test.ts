import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth-types.js';
import { ForbiddenError } from '../authorization/forbidden-error.js';
import { createCustomerDeleteService } from './customer-delete-service.js';
import { CustomerNotFoundError } from './customer-read-service.js';
import type { Customer, CustomerDeleteRepository } from './customer-repository.js';

const user = (role: AuthenticatedUser['role']): AuthenticatedUser => ({
  id: '11111111-1111-4111-8111-111111111111', role,
});
const customer: Customer = {
  id: '8a1f2d44-1234-4abc-8def-123456789abc', name: 'Sample', name_kana: null,
  email: null, phone: null, address: null, category: null,
  owner_user_id: '22222222-2222-4222-8222-222222222222',
  created_at: new Date(), updated_at: new Date(), deleted_at: null,
};
const repositoryFor = (found: Customer | null, deleted = true): CustomerDeleteRepository => ({
  list: vi.fn(),
  findActiveById: vi.fn().mockResolvedValue(found),
  logicalDeleteActiveById: vi.fn().mockResolvedValue(deleted),
});

describe('createCustomerDeleteService', () => {
  it('allows admin to logically delete an active customer', async () => {
    const repository = repositoryFor(customer);
    await expect(createCustomerDeleteService(repository).deleteById(customer.id, user('admin'))).resolves.toBeUndefined();
    expect(repository.logicalDeleteActiveById).toHaveBeenCalledWith(customer.id);
  });

  it.each(['staff', 'manager'] as const)('rejects %s before customer lookup', async (role) => {
    const repository = repositoryFor(customer);
    await expect(createCustomerDeleteService(repository).deleteById(customer.id, user(role)))
      .rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.findActiveById).not.toHaveBeenCalled();
    expect(repository.logicalDeleteActiveById).not.toHaveBeenCalled();
  });

  it('returns not found without delete query for a missing or already deleted customer', async () => {
    const repository = repositoryFor(null);
    await expect(createCustomerDeleteService(repository).deleteById(customer.id, user('admin')))
      .rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(repository.logicalDeleteActiveById).not.toHaveBeenCalled();
  });

  it('returns not found when a concurrent delete makes the update affect no row', async () => {
    const repository = repositoryFor(customer, false);
    await expect(createCustomerDeleteService(repository).deleteById(customer.id, user('admin')))
      .rejects.toBeInstanceOf(CustomerNotFoundError);
  });
});
