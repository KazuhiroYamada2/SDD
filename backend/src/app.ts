import express from 'express';
import { createCustomersRouter } from './customers/customers-router.js';
import { createCustomerRepository, type CustomerRepository } from './customers/customer-repository.js';
import { database } from './db.js';

type AppDependencies = {
  customerRepository?: CustomerRepository;
};

export const createApp = (dependencies: AppDependencies = {}) => {
  const app = express();
  const customerRepository = dependencies.customerRepository ??
    (database === undefined ? undefined : createCustomerRepository(database));

  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use('/api/v1/customers', createCustomersRouter(customerRepository));

  return app;
};
