import { Router } from 'express';
import type { CustomerRepository } from './customer-repository.js';
import { validateCreateCustomer } from './customer-validation.js';

export const createCustomersRouter = (customerRepository: CustomerRepository | undefined) => {
  const router = Router();

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
