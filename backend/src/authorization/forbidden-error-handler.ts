import type { ErrorRequestHandler } from 'express';
import { ForbiddenError, forbiddenResponse } from './forbidden-error.js';

export const handleForbiddenError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (error instanceof ForbiddenError) {
    response.status(error.status).json(forbiddenResponse);
    return;
  }
  next(error);
};
