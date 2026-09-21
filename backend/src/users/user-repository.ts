import type { UserRole } from '../auth/auth-types.js';
import type { UserDto } from './user-types.js';

type QueryResult<Result> = Promise<{ rows: Result[] }>;

export type TransactionClient = {
  query<Result>(sql: string, values?: readonly unknown[]): QueryResult<Result>;
  release(): void;
};

export type TransactionalDatabase = {
  query<Result>(sql: string, values?: readonly unknown[]): QueryResult<Result>;
  connect(): Promise<TransactionClient>;
};

export type RoleChangeResult =
  | { status: 'updated' | 'unchanged'; user: UserDto }
  | { status: 'not_found' | 'last_active_admin' };

export type UserRepository = {
  list(): Promise<UserDto[]>;
  changeRole(id: string, role: UserRole): Promise<RoleChangeResult>;
};

type UserRow = {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
};

const toDto = (row: UserRow): UserDto => ({
  id: row.id,
  email: row.email,
  role: row.role,
  active: row.is_active,
});

export const createUserRepository = (database: TransactionalDatabase): UserRepository => ({
  async list() {
    const result = await database.query<UserRow>(
      `SELECT id, email, role, is_active
      FROM users
      ORDER BY email ASC, id ASC`,
    );
    return result.rows.map(toDto);
  },

  async changeRole(id, role) {
    const client = await database.connect();
    try {
      await client.query('BEGIN');

      // Serialize every role change against the same deterministically locked active-admin set.
      const activeAdmins = await client.query<{ id: string }>(
        `SELECT id
        FROM users
        WHERE role = 'admin' AND is_active = TRUE
        ORDER BY id ASC
        FOR UPDATE`,
      );
      const target = await client.query<UserRow>(
        `SELECT id, email, role, is_active
        FROM users
        WHERE id = $1
        FOR UPDATE`,
        [id],
      );
      const current = target.rows[0];
      if (current === undefined) {
        await client.query('ROLLBACK');
        return { status: 'not_found' };
      }
      if (current.role === role) {
        await client.query('COMMIT');
        return { status: 'unchanged', user: toDto(current) };
      }
      if (current.is_active && current.role === 'admin' && role !== 'admin' && activeAdmins.rows.length <= 1) {
        await client.query('ROLLBACK');
        return { status: 'last_active_admin' };
      }

      const updated = await client.query<UserRow>(
        `UPDATE users
        SET role = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, role, is_active`,
        [role, id],
      );
      await client.query('COMMIT');
      return { status: 'updated', user: toDto(updated.rows[0]!) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
});

