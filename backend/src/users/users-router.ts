import { Router } from 'express';
import { authorizeOperation } from '../authorization/authorization-middleware.js';
import {
  LastActiveAdminRequiredError,
  SelfRoleChangeNotAllowedError,
  UserNotFoundError,
  lastActiveAdminRequiredResponse,
  selfRoleChangeNotAllowedResponse,
  userNotFoundResponse,
  type UserService,
} from './user-service.js';
import { validateRoleChange, validateUserId } from './user-validation.js';
import { auditRecordFor } from '../audit/audit-recorder.js';
import { noOpAuditRepository } from '../audit/audit-repository.js';
import type { AuditRepository } from '../audit/audit-types.js';

const userId = (params: unknown): string | undefined => (params as { id?: string }).id;

export const createUsersRouter = (
  service?: UserService,
  auditRepository: AuditRepository = noOpAuditRepository,
) => {
  const router = Router();

  router.get('/', authorizeOperation('users.read'), async (request, response) => {
    if (service === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }
    try {
      response.status(200).json(await service.list(request.authenticatedUser!));
    } catch {
      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve users.' });
    }
  });

  router.patch('/:id/role', authorizeOperation('users.changeRole'), async (request, response) => {
    const idValidation = validateUserId(userId(request.params));
    if (!idValidation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: idValidation.message });
      return;
    }
    const bodyValidation = validateRoleChange(request.body);
    if (!bodyValidation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: bodyValidation.message });
      return;
    }
    if (service === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      const result = await service.changeRole(
        idValidation.value,
        bodyValidation.value,
        request.authenticatedUser!,
        (query) => auditRepository.insert(
          auditRecordFor(request, 'USER_ROLE_CHANGE', 'USER', idValidation.value),
          query,
        ),
      );
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        response.status(404).json(userNotFoundResponse);
        return;
      }
      if (error instanceof SelfRoleChangeNotAllowedError) {
        response.status(409).json(selfRoleChangeNotAllowedResponse);
        return;
      }
      if (error instanceof LastActiveAdminRequiredError) {
        response.status(409).json(lastActiveAdminRequiredResponse);
        return;
      }
      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to change user role.' });
    }
  });

  return router;
};
