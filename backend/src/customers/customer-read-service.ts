import type { AuthenticatedUser } from '../auth/auth-types.js';
import { assertOperationAllowed, isCustomerInScope } from '../authorization/authorization-policy.js';
import type { CustomerReadRepository } from './customer-repository.js';
import { toCustomerReadDto, type CustomerListResponse, type CustomerReadDto } from './customer-read-types.js';

const defaultPage = 1;
const defaultPageSize = 20;

export const customerNotFoundResponse = Object.freeze({
  code: 'CUSTOMER_NOT_FOUND',
  message: 'Customer was not found.',
});

export class CustomerNotFoundError extends Error {
  readonly status = 404;
  readonly code = customerNotFoundResponse.code;

  constructor() {
    super(customerNotFoundResponse.message);
    this.name = 'CustomerNotFoundError';
  }
}

export type CustomerReadService = {
  list(authenticatedUser: AuthenticatedUser): Promise<CustomerListResponse>;
  findById(id: string, authenticatedUser: AuthenticatedUser): Promise<CustomerReadDto>;
};

export const createCustomerReadService = (repository: CustomerReadRepository): CustomerReadService => ({
  async list(authenticatedUser) {
    assertOperationAllowed(authenticatedUser, 'customer.read');
    const result = await repository.list({
      ...(authenticatedUser.role === 'staff' ? { ownerScopeUserId: authenticatedUser.id } : {}),
      limit: defaultPageSize,
      offset: 0,
    });

    return {
      items: result.items.map(toCustomerReadDto),
      page: defaultPage,
      page_size: defaultPageSize,
      total_count: result.totalCount,
      total_pages: Math.ceil(result.totalCount / defaultPageSize),
    };
  },
  async findById(id, authenticatedUser) {
    assertOperationAllowed(authenticatedUser, 'customer.read');
    const customer = await repository.findActiveById(id);
    if (customer === null || !isCustomerInScope(authenticatedUser, customer.owner_user_id)) {
      throw new CustomerNotFoundError();
    }

    return toCustomerReadDto(customer);
  },
});
