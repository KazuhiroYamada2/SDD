import type { RequestHandler } from 'express';
import type { AuthUserRepository } from './auth-user-repository.js';
import { createJwtService, InvalidAccessTokenError, type JwtService } from './jwt-service.js';

export type AuthenticationMiddlewareDependencies = {
  userRepository: AuthUserRepository;
  jwtService?: JwtService;
};

const authenticationRequired = { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.' };
const bearerPattern = /^Bearer +([^\s]+)$/i;

export const createAuthenticationMiddleware = ({
  userRepository,
  jwtService = createJwtService(),
}: AuthenticationMiddlewareDependencies): RequestHandler => async (request, response, next) => {
  const match = bearerPattern.exec(request.get('authorization') ?? '');
  if (match === null) {
    response.status(401).json(authenticationRequired);
    return;
  }

  try {
    const { userId } = await jwtService.verifyAccessToken(match[1]!);
    const user = await userRepository.findById(userId);
    if (user === null || !user.is_active) {
      response.status(401).json(authenticationRequired);
      return;
    }

    request.authenticatedUser = { id: user.id, role: user.role };
    next();
  } catch (error) {
    if (error instanceof InvalidAccessTokenError) {
      response.status(401).json(authenticationRequired);
      return;
    }
    next(error);
  }
};
