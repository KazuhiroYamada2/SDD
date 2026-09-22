import type { AuthUserRepository } from './auth-user-repository.js';
import type { UserRole } from './auth-types.js';
import { createJwtService } from './jwt-service.js';
import type { LoginInput } from './login-validation.js';
import { createDummyPasswordHash, verifyPassword } from './password-hasher.js';

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: 1800;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
};

export type LoginService = {
  login(input: LoginInput, audit?: LoginAuditContext): Promise<LoginResponse | null>;
};

export type LoginAuditContext = {
  recordSuccess(userId: string): Promise<void>;
  recordFailure(): Promise<void>;
};

export type LoginServiceDependencies = {
  userRepository: AuthUserRepository;
  verifyPassword?: typeof verifyPassword;
  createDummyPasswordHash?: typeof createDummyPasswordHash;
  issueAccessToken?: (userId: string) => Promise<string>;
};

export const createLoginService = ({
  userRepository,
  verifyPassword: verify = verifyPassword,
  createDummyPasswordHash: createDummyHash = createDummyPasswordHash,
  issueAccessToken = (userId) => createJwtService().issueAccessToken(userId),
}: LoginServiceDependencies): LoginService => {
  let dummyHashPromise: Promise<string> | undefined;
  const getDummyHash = () => (dummyHashPromise ??= createDummyHash());

  return {
    async login({ email, password }, audit) {
      // All first requests await the same initialization; unknown users then use it for verification.
      const dummyHash = await getDummyHash();
      const user = await userRepository.findByEmail(email);
      const passwordValid = await verify(user?.password_hash ?? dummyHash, password);

      if (user === null || !passwordValid || !user.is_active) {
        await audit?.recordFailure();
        return null;
      }

      await audit?.recordSuccess(user.id);

      return {
        accessToken: await issueAccessToken(user.id),
        tokenType: 'Bearer',
        expiresIn: 1800,
        user: { id: user.id, email: user.email, role: user.role },
      };
    },
  };
};
