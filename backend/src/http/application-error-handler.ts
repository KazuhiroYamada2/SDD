import type { ErrorRequestHandler } from 'express';
import { ForbiddenError, forbiddenResponse } from '../authorization/forbidden-error.js';

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

export const handleApplicationError: ErrorRequestHandler = (error, request, response, next) => {
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
    response.status(error.status).json(forbiddenResponse);
    return;
  }

  response.status(500).json(internalServerErrorResponse);
};
