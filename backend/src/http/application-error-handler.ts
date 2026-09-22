import type { ErrorRequestHandler } from 'express';
import { ForbiddenError, forbiddenResponse } from '../authorization/forbidden-error.js';
import { auditRecordFor, recordBestEffortAudit } from '../audit/audit-recorder.js';
import { noOpAuditRepository } from '../audit/audit-repository.js';
import type { AuditRepository } from '../audit/audit-types.js';
import { noOpStructuredLog, type StructuredLogWriter } from '../logging/structured-log.js';

const invalidRequestResponse = Object.freeze({
  code: 'INVALID_REQUEST',
  message: 'Request body is invalid.',
});

const malformedLoginResponse = Object.freeze({
  code: 'VALIDATION_ERROR',
  message: 'Request body must be valid JSON.',
});

const internalServerErrorResponse = Object.freeze({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Internal server error.',
});

const isMalformedJson = (error: unknown): boolean =>
  error instanceof SyntaxError &&
  'status' in error && error.status === 400 &&
  'type' in error && error.type === 'entity.parse.failed';

export const createApplicationErrorHandler = (
  auditRepository: AuditRepository = noOpAuditRepository,
  operationalLog: StructuredLogWriter = noOpStructuredLog,
): ErrorRequestHandler => async (error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (isMalformedJson(error)) {
    const responseBody = request.method === 'POST' && request.path === '/api/v1/auth/login'
      ? malformedLoginResponse
      : invalidRequestResponse;
    response.status(400).json(responseBody);
    return;
  }

  if (error instanceof ForbiddenError) {
    await recordBestEffortAudit(
      auditRepository,
      auditRecordFor(request, 'AUTHORIZATION_DENIED', 'AUTHORIZATION', null),
      operationalLog,
    );
    response.status(error.status).json(forbiddenResponse);
    return;
  }

  response.status(500).json(internalServerErrorResponse);
};

export const handleApplicationError = createApplicationErrorHandler();
