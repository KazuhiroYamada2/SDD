import type { RequestHandler } from 'express';
import { assertOperationAllowed, type AuthorizationOperation } from './authorization-policy.js';

export const authorizeOperation = (operation: AuthorizationOperation): RequestHandler =>
  (request, _response, next) => {
    if (request.authenticatedUser === undefined) {
      next(new Error('Authorization requires an authenticated user.'));
      return;
    }

    try {
      assertOperationAllowed(request.authenticatedUser, operation);
      next();
    } catch (error) {
      next(error);
    }
  };
