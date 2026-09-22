import type { AuthenticatedUser } from '../auth/auth-types.js';
import { assertOperationAllowed, isCustomerInScope } from '../authorization/authorization-policy.js';
import { CustomerNotFoundError, CustomerScopeDeniedError } from './customer-read-service.js';
import { toCustomerReadDto, type CustomerReadDto } from './customer-read-types.js';
import type { AuditInTransaction, CustomerEditRepository, UpdateCustomerInput } from './customer-repository.js';
import type { CustomerCrypto } from './customer-crypto.js';

export type CustomerEditService = {
  update(
    id: string,
    input: UpdateCustomerInput,
    authenticatedUser: AuthenticatedUser,
    audit?: AuditInTransaction,
  ): Promise<CustomerReadDto>;
};

export const createCustomerEditService = (
  repository: CustomerEditRepository,
  customerCrypto: CustomerCrypto,
): CustomerEditService => ({
  async update(id, input, authenticatedUser, audit) {
    assertOperationAllowed(authenticatedUser, 'customer.edit');
    const customer = await repository.findActiveById(id);
    if (customer === null) throw new CustomerNotFoundError();
    if (!isCustomerInScope(authenticatedUser, customer.owner_user_id)) throw new CustomerScopeDeniedError();

    const encrypted = customerCrypto.encryptUpdateInput(input);
    const updated = audit === undefined
      ? await repository.updateActiveById(id, encrypted)
      : await repository.updateActiveById(id, encrypted, audit);
    if (updated === null) throw new CustomerNotFoundError();
    return toCustomerReadDto(customerCrypto.decryptCustomer(updated));
  },
});
