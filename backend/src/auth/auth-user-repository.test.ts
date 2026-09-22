import { describe, expect, it, vi } from 'vitest';
import { createAuthUserRepository } from './auth-user-repository.js';

const userId = 'c0a80101-1234-4abc-8def-123456789abc';

describe('createAuthUserRepository', () => {
  it('finds login credentials by the exact email supplied to the repository', async () => {
    const user = {
      id: userId,
      email: 'Sales-A@Example.com',
      password_hash: 'test-only-stored-hash',
      role: 'staff' as const,
      is_active: true,
    };
    const query = vi.fn().mockResolvedValue({ rows: [user] });
    const repository = createAuthUserRepository({ query });

    await expect(repository.findByEmail('Sales-A@Example.com')).resolves.toEqual(user);
    expect(query).toHaveBeenCalledWith(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
      ['Sales-A@Example.com'],
    );
  });

  it('finds the current identity by id without selecting the password hash', async () => {
    const user = { id: userId, email: 'manager@example.com', role: 'manager' as const, is_active: false };
    const query = vi.fn().mockResolvedValue({ rows: [user] });
    const repository = createAuthUserRepository({ query });

    await expect(repository.findById(userId)).resolves.toEqual(user);
    expect(query).toHaveBeenCalledWith(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [userId],
    );
    expect(query.mock.calls[0]?.[0]).not.toContain('password_hash');
  });

  it('returns null when neither lookup finds a user', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = createAuthUserRepository({ query });

    await expect(repository.findByEmail('missing@example.com')).resolves.toBeNull();
    await expect(repository.findById(userId)).resolves.toBeNull();
  });
});
