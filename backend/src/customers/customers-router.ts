import { Router } from 'express';
import { authorizeOperation } from '../authorization/authorization-middleware.js';
import type { CustomerRepository } from './customer-repository.js';
import {
  CustomerNotFoundError,
  customerNotFoundResponse,
  type CustomerReadService,
} from './customer-read-service.js';
import { validateCustomerId, validateCustomerListQuery } from './customer-read-validation.js';
import { validateCreateCustomer } from './customer-validation.js';

const customerId = (params: unknown): string | undefined =>
  (params as { id?: string }).id;

export const createCustomersRouter = (
  customerRepository: CustomerRepository | undefined,
  customerReadService?: CustomerReadService,
) => {
  const router = Router();

  router.get('/', authorizeOperation('customer.read'), async (request, response) => {
    const validation = validateCustomerListQuery(request.query);
    if (!validation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: validation.message });
      return;
    }

    if (customerReadService === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      response.status(200).json(
        await customerReadService.list(request.authenticatedUser!, validation.value),
      );
    } catch {
      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve customers.' });
    }
  });

  router.get('/:id', authorizeOperation('customer.read'), async (request, response) => {
    const validation = validateCustomerId(customerId(request.params));
    if (!validation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: validation.message });
      return;
    }

    if (customerReadService === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      response.status(200).json(
        await customerReadService.findById(validation.value, request.authenticatedUser!),
      );
    } catch (error) {
      if (error instanceof CustomerNotFoundError) {
        response.status(404).json(customerNotFoundResponse);
        return;
      }

      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve customer.' });
    }
  });

  router.post('/', async (request, response) => {
    const validation = validateCreateCustomer(request.body);
    if (!validation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: validation.message });
      return;
    }

    if (customerRepository === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      const customer = await customerRepository.create(validation.value);
      response.status(201).json(customer);
    } catch {
      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create customer.' });
    }
  });

  return router;
};
