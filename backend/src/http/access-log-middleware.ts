import { performance } from 'node:perf_hooks';
import type { RequestHandler } from 'express';
import type { StructuredLogWriter } from '../logging/structured-log.js';
import { requestIp } from './request-ip.js';
import { normalizedRoute } from './route-template.js';

export const createAccessLogMiddleware = (write: StructuredLogWriter): RequestHandler =>
  (request, response, next) => {
    const startedAt = performance.now();
    const route = normalizedRoute(request);

    response.once('finish', () => {
      try {
        write({
          event: 'HTTP_ACCESS',
          request_id: request.requestId,
          method: request.method,
          route,
          status_code: response.statusCode,
          duration_ms: Number((performance.now() - startedAt).toFixed(3)),
          user_id: request.authenticatedUser?.id ?? null,
          ip_address: requestIp(request),
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Access logging is outside the business transaction and cannot change the response.
      }
    });

    next();
  };
