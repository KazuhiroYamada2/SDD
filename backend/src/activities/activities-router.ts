import { Router } from 'express';
import { authorizeOperation } from '../authorization/authorization-middleware.js';
import { CustomerNotFoundError, UserNotFoundError, type ActivityService } from './activity-service.js';
import { validateCreateActivity } from './activity-validation.js';

const customerId = (params: unknown): string | undefined =>
  (params as { customerId?: string }).customerId;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createActivitiesRouter = (activityService: ActivityService | undefined) => {
  const router = Router({ mergeParams: true });

  router.post('/', authorizeOperation('activity.create'), async (request, response) => {
    const validation = validateCreateActivity({
      customerId: customerId(request.params),
      body: request.body,
    });
    if (!validation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: validation.message });
      return;
    }

    if (activityService === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      const activity = await activityService.execute(validation.value, request.authenticatedUser!);
      response.status(201).json(activity);
    } catch (error) {
      if (error instanceof CustomerNotFoundError) {
        response.status(404).json({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer was not found.' });
        return;
      }
      if (error instanceof UserNotFoundError) {
        response.status(404).json({ code: 'USER_NOT_FOUND', message: 'User was not found.' });
        return;
      }

      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create activity.' });
    }
  });

  router.get('/', authorizeOperation('activity.read'), async (request, response) => {
    const id = customerId(request.params);
    if (typeof id !== 'string' || !uuidPattern.test(id)) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: 'customerId must be a UUID.' });
      return;
    }

    if (activityService === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      response.status(200).json(await activityService.findByCustomerId(id, request.authenticatedUser!));
    } catch (error) {
      if (error instanceof CustomerNotFoundError) {
        response.status(404).json({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer was not found.' });
        return;
      }

      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve activities.' });
    }
  });

  return router;
};
