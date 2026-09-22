import { Router } from 'express';
import { authorizeOperation } from '../authorization/authorization-middleware.js';
import type { CustomerRepository } from './customer-repository.js';
import type { CustomerEditService } from './customer-edit-service.js';
import type { CustomerDeleteService } from './customer-delete-service.js';
import {
  CustomerNotFoundError,
  CustomerScopeDeniedError,
  customerNotFoundResponse,
  type CustomerReadService,
} from './customer-read-service.js';
import { validateCustomerId, validateCustomerListQuery } from './customer-read-validation.js';
import { validateCreateCustomer, validateUpdateCustomer } from './customer-validation.js';
import type { CustomerCrypto } from './customer-crypto.js';
import { toCustomerReadDto } from './customer-read-types.js';
import { auditRecordFor, recordBestEffortAudit } from '../audit/audit-recorder.js';
import { noOpAuditRepository } from '../audit/audit-repository.js';
import type { AuditRepository } from '../audit/audit-types.js';
import { noOpStructuredLog, type StructuredLogWriter } from '../logging/structured-log.js';

const customerId = (params: unknown): string | undefined =>
  (params as { id?: string }).id;

export const createCustomersRouter = (
  customerRepository: CustomerRepository | undefined,
  customerReadService?: CustomerReadService,
  customerEditService?: CustomerEditService,
  customerDeleteService?: CustomerDeleteService,
  customerCrypto?: CustomerCrypto,
  auditRepository: AuditRepository = noOpAuditRepository,
  operationalLog: StructuredLogWriter = noOpStructuredLog,
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
      const result = await customerReadService.list(request.authenticatedUser!, validation.value);
      await auditRepository.insert(
        auditRecordFor(request, 'CUSTOMER_LIST', 'CUSTOMER_COLLECTION', null),
      );
      response.status(200).json(result);
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
      const result = await customerReadService.findById(validation.value, request.authenticatedUser!);
      await auditRepository.insert(
        auditRecordFor(request, 'CUSTOMER_READ', 'CUSTOMER', validation.value),
      );
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof CustomerScopeDeniedError) {
        await recordBestEffortAudit(
          auditRepository,
          auditRecordFor(request, 'AUTHORIZATION_SCOPE_DENIED', 'CUSTOMER', null),
          operationalLog,
        );
        response.status(404).json(customerNotFoundResponse);
        return;
      }
      if (error instanceof CustomerNotFoundError) {
        response.status(404).json(customerNotFoundResponse);
        return;
      }

      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve customer.' });
    }
  });

  router.post('/', authorizeOperation('customer.create'), async (request, response) => {
    const validation = validateCreateCustomer(request.body);
    if (!validation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: validation.message });
      return;
    }

    if (customerRepository === undefined || customerCrypto === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      const customer = await customerRepository.create(customerCrypto.encryptCreateInput({
        ...validation.value,
        owner_user_id: request.authenticatedUser!.role === 'staff'
          ? request.authenticatedUser!.id
          : validation.value.owner_user_id,
      }));
      response.status(201).json(toCustomerReadDto(customerCrypto.decryptCustomer(customer)));
    } catch {
      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create customer.' });
    }
  });

  router.patch('/:id', authorizeOperation('customer.edit'), async (request, response) => {
    const idValidation = validateCustomerId(customerId(request.params));
    if (!idValidation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: idValidation.message });
      return;
    }
    const bodyValidation = validateUpdateCustomer(request.body);
    if (!bodyValidation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: bodyValidation.message });
      return;
    }
    if (customerEditService === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      const result = await customerEditService.update(
        idValidation.value,
        bodyValidation.value,
        request.authenticatedUser!,
        (query) => auditRepository.insert(
          auditRecordFor(request, 'CUSTOMER_UPDATE', 'CUSTOMER', idValidation.value),
          query,
        ),
      );
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof CustomerScopeDeniedError) {
        await recordBestEffortAudit(
          auditRepository,
          auditRecordFor(request, 'AUTHORIZATION_SCOPE_DENIED', 'CUSTOMER', null),
          operationalLog,
        );
        response.status(404).json(customerNotFoundResponse);
        return;
      }
      if (error instanceof CustomerNotFoundError) {
        response.status(404).json(customerNotFoundResponse);
        return;
      }
      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update customer.' });
    }
  });

  router.delete('/:id', authorizeOperation('customer.delete'), async (request, response) => {
    const validation = validateCustomerId(customerId(request.params));
    if (!validation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: validation.message });
      return;
    }
    if (customerDeleteService === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      await customerDeleteService.deleteById(
        validation.value,
        request.authenticatedUser!,
        (query) => auditRepository.insert(
          auditRecordFor(request, 'CUSTOMER_DELETE', 'CUSTOMER', validation.value),
          query,
        ),
      );
      response.status(204).send();
    } catch (error) {
      if (error instanceof CustomerNotFoundError) {
        response.status(404).json(customerNotFoundResponse);
        return;
      }
      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete customer.' });
    }
  });

  return router;
};
