import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestIdHeader = 'X-Request-ID';

export const assignRequestId: RequestHandler = (request, response, next) => {
  const requestId = randomUUID();
  request.requestId = requestId;
  response.setHeader(requestIdHeader, requestId);
  next();
};
