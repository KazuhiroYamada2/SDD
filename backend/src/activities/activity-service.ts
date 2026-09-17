import type { Activity, ActivityRepository, CreateActivityInput } from './activity-repository.js';
import type { ActivityReferenceRepository } from './activity-reference-repository.js';

export class CustomerNotFoundError extends Error {}
export class UserNotFoundError extends Error {}

export type CreateActivityService = {
  execute(input: CreateActivityInput): Promise<Activity>;
};

export type FindActivitiesService = {
  findByCustomerId(customerId: string): Promise<Activity[]>;
};

export type ActivityService = CreateActivityService & FindActivitiesService;

export const createCreateActivityService = (dependencies: {
  activityRepository: ActivityRepository;
  referenceRepository: ActivityReferenceRepository;
}): ActivityService => ({
  async execute(input) {
    if (!await dependencies.referenceRepository.customerExists(input.customer_id)) {
      throw new CustomerNotFoundError();
    }

    if (!await dependencies.referenceRepository.userExists(input.user_id)) {
      throw new UserNotFoundError();
    }

    return dependencies.activityRepository.create(input);
  },
  async findByCustomerId(customerId) {
    if (!await dependencies.referenceRepository.customerExists(customerId)) {
      throw new CustomerNotFoundError();
    }

    return dependencies.activityRepository.findByCustomerId(customerId);
  },
});
