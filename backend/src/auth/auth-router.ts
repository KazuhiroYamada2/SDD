import { Router } from 'express';
import type { LoginService } from './login-service.js';
import { validateLogin } from './login-validation.js';
import { auditRecordFor, recordBestEffortAudit } from '../audit/audit-recorder.js';
import { noOpAuditRepository } from '../audit/audit-repository.js';
import type { AuditRepository } from '../audit/audit-types.js';
import { noOpStructuredLog, type StructuredLogWriter } from '../logging/structured-log.js';

export const createAuthRouter = (
  loginService: LoginService | undefined,
  auditRepository: AuditRepository = noOpAuditRepository,
  operationalLog: StructuredLogWriter = noOpStructuredLog,
) => {
  const router = Router();

  router.post('/login', async (request, response) => {
    const validation = validateLogin(request.body);
    if (!validation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: validation.message });
      return;
    }

    if (loginService === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      const result = await loginService.login(validation.value, {
        recordSuccess: (userId) => auditRepository.insert(
          auditRecordFor(request, 'LOGIN_SUCCESS', 'AUTH', null, userId),
        ),
        recordFailure: () => recordBestEffortAudit(
          auditRepository,
          auditRecordFor(request, 'LOGIN_FAILURE', 'AUTH', null, null),
          operationalLog,
        ),
      });
      if (result === null) {
        response.status(401).json({ code: 'AUTHENTICATION_FAILED', message: 'Authentication failed.' });
        return;
      }
      request.authenticatedUser = { id: result.user.id, role: result.user.role };
      response.status(200).json(result);
    } catch {
      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to log in.' });
    }
  });

  return router;
};
