import type { Queryable } from './activity-repository.js';

export type ActivityReferenceRepository = {
  customerExists(id: string): Promise<boolean>;
  findCustomerReference(id: string): Promise<CustomerReference | null>;
  userExists(id: string): Promise<boolean>;
};

type ExistsResult = { exists: boolean };
export type CustomerReference = { id: string; owner_user_id: string };

export const createActivityReferenceRepository = (database: Queryable): ActivityReferenceRepository => ({
  async customerExists(id) {
    const result = await database.query<ExistsResult>(
      'SELECT EXISTS (SELECT 1 FROM customers WHERE id = $1) AS exists',
      [id],
    );
    return result.rows[0]?.exists ?? false;
  },
  async findCustomerReference(id) {
    const result = await database.query<CustomerReference>(
      'SELECT id, owner_user_id FROM customers WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  },
  async userExists(id) {
    const result = await database.query<ExistsResult>(
      'SELECT EXISTS (SELECT 1 FROM users WHERE id = $1) AS exists',
      [id],
    );
    return result.rows[0]?.exists ?? false;
  },
});
