import type { AuthUserCredentials, AuthUserIdentity } from './auth-types.js';

export type Queryable = {
  query<Result>(sql: string, values: readonly unknown[]): Promise<{ rows: Result[] }>;
};

export type AuthUserRepository = {
  findByEmail(email: string): Promise<AuthUserCredentials | null>;
  findById(id: string): Promise<AuthUserIdentity | null>;
};

export const createAuthUserRepository = (database: Queryable): AuthUserRepository => ({
  async findByEmail(email) {
    const result = await database.query<AuthUserCredentials>(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0] ?? null;
  },
  async findById(id) {
    const result = await database.query<AuthUserIdentity>(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  },
});
