import { errors, SignJWT, jwtVerify } from 'jose';

const ACCESS_TOKEN_LIFETIME_SECONDS = 1800;
const MIN_SECRET_BYTES = 32;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type JwtService = {
  issueAccessToken(userId: string): Promise<string>;
  verifyAccessToken(token: string): Promise<{ userId: string }>;
};

export type JwtServiceOptions = {
  secret?: string;
  now?: () => Date;
};

export class InvalidAccessTokenError extends Error {
  constructor() {
    super('Invalid access token.');
    this.name = 'InvalidAccessTokenError';
  }
}

export const validateJwtSecret = (secret: string | undefined): string => {
  if (secret === undefined || secret.trim() === '' || Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error('JWT_SECRET must contain at least 32 bytes.');
  }
  return secret;
};

export const createJwtService = ({
  secret = process.env.JWT_SECRET,
  now = () => new Date(),
}: JwtServiceOptions = {}): JwtService => {
  const key = new TextEncoder().encode(validateJwtSecret(secret));

  return {
    async issueAccessToken(userId) {
      if (!uuidPattern.test(userId)) {
        throw new Error('User ID must be a UUID.');
      }

      const issuedAt = Math.floor(now().getTime() / 1000);
      return new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + ACCESS_TOKEN_LIFETIME_SECONDS)
        .sign(key);
    },
    async verifyAccessToken(token) {
      try {
        const { payload } = await jwtVerify(token, key, {
          algorithms: ['HS256'],
          requiredClaims: ['sub', 'iat', 'exp'],
          currentDate: now(),
        });

        if (typeof payload.sub !== 'string' || !uuidPattern.test(payload.sub)) {
          throw new InvalidAccessTokenError();
        }

        return { userId: payload.sub };
      } catch (error) {
        if (error instanceof errors.JOSEError) {
          throw new InvalidAccessTokenError();
        }
        throw error;
      }
    },
  };
};
