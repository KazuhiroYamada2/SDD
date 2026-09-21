import type { AuthenticatedUser } from '../auth/auth-types.js';
import { assertOperationAllowed } from '../authorization/authorization-policy.js';
import { CustomerNotFoundError } from './customer-read-service.js';
import type { CustomerDeleteRepository } from './customer-repository.js';

export type CustomerDeleteService = {
  deleteById(id: string, authenticatedUser: AuthenticatedUser): Promise<void>;
};

export const createCustomerDeleteService = (repository: CustomerDeleteRepository): CustomerDeleteService => ({
  async deleteById(id, authenticatedUser) {
    assertOperationAllowed(authenticatedUser, 'customer.delete');
    const customer = await repository.findActiveById(id);
    if (customer === null) throw new CustomerNotFoundError();
    if (!await repository.logicalDeleteActiveById(id)) throw new CustomerNotFoundError();
  },
});
