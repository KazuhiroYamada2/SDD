import type { Activity, ActivityRepository, CreateActivityInput } from './activity-repository.js';
import type { ActivityReferenceRepository } from './activity-reference-repository.js';
import type { AuthenticatedUser } from '../auth/auth-types.js';
import { isCustomerInScope } from '../authorization/authorization-policy.js';

export class CustomerNotFoundError extends Error {}
export class UserNotFoundError extends Error {}

export type CreateActivityService = {
  execute(input: CreateActivityInput, authenticatedUser: AuthenticatedUser): Promise<Activity>;
};

export type FindActivitiesService = {
  findByCustomerId(customerId: string, authenticatedUser: AuthenticatedUser): Promise<Activity[]>;
};

export type ActivityService = CreateActivityService & FindActivitiesService;

export const createCreateActivityService = (dependencies: {
  activityRepository: ActivityRepository;
  referenceRepository: ActivityReferenceRepository;
}): ActivityService => ({
  async execute(input, authenticatedUser) {
    const customer = await dependencies.referenceRepository.findCustomerReference(input.customer_id);
    if (customer === null || !isCustomerInScope(authenticatedUser, customer.owner_user_id)) {
      throw new CustomerNotFoundError();
    }

    if (!await dependencies.referenceRepository.userExists(input.user_id)) {
      throw new UserNotFoundError();
    }

    return dependencies.activityRepository.create(input);
  },
  async findByCustomerId(customerId, authenticatedUser) {
    const customer = await dependencies.referenceRepository.findCustomerReference(customerId);
    if (customer === null || !isCustomerInScope(authenticatedUser, customer.owner_user_id)) {
      throw new CustomerNotFoundError();
    }

    return dependencies.activityRepository.findByCustomerId(customerId);
  },
});
