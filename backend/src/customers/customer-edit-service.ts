import type { AuthenticatedUser } from '../auth/auth-types.js';
import { assertOperationAllowed, isCustomerInScope } from '../authorization/authorization-policy.js';
import { CustomerNotFoundError } from './customer-read-service.js';
import { toCustomerReadDto, type CustomerReadDto } from './customer-read-types.js';
import type { CustomerEditRepository, UpdateCustomerInput } from './customer-repository.js';

export type CustomerEditService = {
  update(id: string, input: UpdateCustomerInput, authenticatedUser: AuthenticatedUser): Promise<CustomerReadDto>;
};

export const createCustomerEditService = (repository: CustomerEditRepository): CustomerEditService => ({
  async update(id, input, authenticatedUser) {
    assertOperationAllowed(authenticatedUser, 'customer.edit');
    const customer = await repository.findActiveById(id);
    if (customer === null || !isCustomerInScope(authenticatedUser, customer.owner_user_id)) {
      throw new CustomerNotFoundError();
    }

    const updated = await repository.updateActiveById(id, input);
    if (updated === null) throw new CustomerNotFoundError();
    return toCustomerReadDto(updated);
  },
});
