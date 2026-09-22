import type { AuthenticatedUser } from '../auth/auth-types.js';
import { assertOperationAllowed } from '../authorization/authorization-policy.js';
import { CustomerNotFoundError } from './customer-read-service.js';
import type { AuditInTransaction, CustomerDeleteRepository } from './customer-repository.js';

export type CustomerDeleteService = {
  deleteById(id: string, authenticatedUser: AuthenticatedUser, audit?: AuditInTransaction): Promise<void>;
};

export const createCustomerDeleteService = (repository: CustomerDeleteRepository): CustomerDeleteService => ({
  async deleteById(id, authenticatedUser, audit) {
    assertOperationAllowed(authenticatedUser, 'customer.delete');
    const customer = await repository.findActiveById(id);
    if (customer === null) throw new CustomerNotFoundError();
    const deleted = audit === undefined
      ? await repository.logicalDeleteActiveById(id)
      : await repository.logicalDeleteActiveById(id, audit);
    if (!deleted) throw new CustomerNotFoundError();
  },
});
