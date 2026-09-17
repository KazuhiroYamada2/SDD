import type { Queryable } from './activity-repository.js';

export type ActivityReferenceRepository = {
  customerExists(id: string): Promise<boolean>;
  userExists(id: string): Promise<boolean>;
};

type ExistsResult = { exists: boolean };

export const createActivityReferenceRepository = (database: Queryable): ActivityReferenceRepository => ({
  async customerExists(id) {
    const result = await database.query<ExistsResult>(
      'SELECT EXISTS (SELECT 1 FROM customers WHERE id = $1) AS exists',
      [id],
    );
    return result.rows[0]?.exists ?? false;
  },
  async userExists(id) {
    const result = await database.query<ExistsResult>(
      'SELECT EXISTS (SELECT 1 FROM users WHERE id = $1) AS exists',
      [id],
    );
    return result.rows[0]?.exists ?? false;
  },
});
