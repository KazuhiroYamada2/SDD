import { describe, expect, it, vi } from 'vitest';
import type { AuthUserRepository } from './auth-user-repository.js';
import type { AuthUserCredentials } from './auth-types.js';
import { createLoginService } from './login-service.js';

const user: AuthUserCredentials = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'sales@example.com',
  password_hash: 'stored-hash',
  role: 'staff',
  is_active: true,
};

const makeDependencies = (foundUser: AuthUserCredentials | null = user) => ({
  userRepository: {
    findByEmail: vi.fn().mockResolvedValue(foundUser),
    findById: vi.fn().mockResolvedValue(null),
  } satisfies AuthUserRepository,
  verifyPassword: vi.fn().mockResolvedValue(true),
  createDummyPasswordHash: vi.fn().mockResolvedValue('dummy-hash'),
  issueAccessToken: vi.fn().mockResolvedValue('test-token'),
});

const input = { email: 'sales@example.com', password: 'test-password' };

describe('Login Service', () => {
  it('LS-01/06/07/08 authenticates an active user and returns only public user fields', async () => {
    const dependencies = makeDependencies();
    const service = createLoginService(dependencies);

    const result = await service.login(input);

    expect(dependencies.userRepository.findByEmail).toHaveBeenCalledWith(input.email);
    expect(dependencies.verifyPassword).toHaveBeenCalledWith(user.password_hash, input.password);
    expect(dependencies.issueAccessToken).toHaveBeenCalledWith(user.id);
    expect(result).toEqual({
      accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 1800,
      user: { id: user.id, email: user.email, role: user.role },
    });
    expect(result?.user).not.toHaveProperty('password_hash');
  });

  it('LS-02 verifies the dummy hash for an unknown email and reuses the generated hash', async () => {
    const dependencies = makeDependencies(null);
    const service = createLoginService(dependencies);

    expect(await service.login(input)).toBeNull();
    expect(await service.login(input)).toBeNull();

    expect(dependencies.createDummyPasswordHash).toHaveBeenCalledTimes(1);
    expect(dependencies.verifyPassword).toHaveBeenCalledTimes(2);
    expect(dependencies.verifyPassword).toHaveBeenCalledWith('dummy-hash', input.password);
    expect(dependencies.issueAccessToken).not.toHaveBeenCalled();
  });

  it('LS-03 rejects a password mismatch', async () => {
    const dependencies = makeDependencies();
    dependencies.verifyPassword.mockResolvedValue(false);

    expect(await createLoginService(dependencies).login(input)).toBeNull();
    expect(dependencies.issueAccessToken).not.toHaveBeenCalled();
  });

  it('LS-04/05 verifies an inactive user password before rejecting the login', async () => {
    const dependencies = makeDependencies({ ...user, is_active: false });

    expect(await createLoginService(dependencies).login(input)).toBeNull();
    expect(dependencies.verifyPassword).toHaveBeenCalledWith(user.password_hash, input.password);
    expect(dependencies.issueAccessToken).not.toHaveBeenCalled();
  });

  it('LS-09 propagates repository and token failures as internal errors', async () => {
    const repositoryFailure = makeDependencies();
    repositoryFailure.userRepository.findByEmail.mockRejectedValue(new Error('database unavailable'));
    await expect(createLoginService(repositoryFailure).login(input)).rejects.toThrow('database unavailable');

    const tokenFailure = makeDependencies();
    tokenFailure.issueAccessToken.mockRejectedValue(new Error('token unavailable'));
    await expect(createLoginService(tokenFailure).login(input)).rejects.toThrow('token unavailable');
  });
});
