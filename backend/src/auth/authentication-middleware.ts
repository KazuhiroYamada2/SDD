import type { RequestHandler } from 'express';
import type { AuthUserRepository } from './auth-user-repository.js';
import { createJwtService, InvalidAccessTokenError, type JwtService } from './jwt-service.js';
import { auditRecordFor, recordBestEffortAudit } from '../audit/audit-recorder.js';
import { noOpAuditRepository } from '../audit/audit-repository.js';
import type { AuditRepository } from '../audit/audit-types.js';
import { noOpStructuredLog, type StructuredLogWriter } from '../logging/structured-log.js';

export type AuthenticationMiddlewareDependencies = {
  userRepository: AuthUserRepository;
  jwtService?: JwtService;
  auditRepository?: AuditRepository;
  operationalLog?: StructuredLogWriter;
};

const authenticationRequired = { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.' };
const bearerPattern = /^Bearer +([^\s]+)$/i;

export const createAuthenticationMiddleware = ({
  userRepository,
  jwtService = createJwtService(),
  auditRepository = noOpAuditRepository,
  operationalLog = noOpStructuredLog,
}: AuthenticationMiddlewareDependencies): RequestHandler => async (request, response, next) => {
  const reject = async () => {
    await recordBestEffortAudit(
      auditRepository,
      auditRecordFor(request, 'AUTHENTICATION_REQUIRED', 'AUTHORIZATION', null, null),
      operationalLog,
    );
    response.status(401).json(authenticationRequired);
  };
  const match = bearerPattern.exec(request.get('authorization') ?? '');
  if (match === null) {
    await reject();
    return;
  }

  try {
    const { userId } = await jwtService.verifyAccessToken(match[1]!);
    const user = await userRepository.findById(userId);
    if (user === null || !user.is_active) {
      await reject();
      return;
    }

    request.authenticatedUser = { id: user.id, role: user.role };
    next();
  } catch (error) {
    if (error instanceof InvalidAccessTokenError) {
      await reject();
      return;
    }
    next(error);
  }
};
