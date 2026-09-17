import { randomUUID } from 'node:crypto';

export type ActivityType = 'visit' | 'meeting';

export type Activity = {
  id: string;
  customer_id: string;
  user_id: string;
  activity_type: ActivityType;
  visited_at: Date | null;
  meeting_note: string | null;
  next_visit_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type CreateActivityInput = Omit<Activity, 'id' | 'created_at' | 'updated_at'>;

export type Queryable = {
  query<Result>(sql: string, values: readonly unknown[]): Promise<{ rows: Result[] }>;
};

export type ActivityRepository = {
  create(input: CreateActivityInput): Promise<Activity>;
};

export const createActivityRepository = (database: Queryable): ActivityRepository => ({
  async create(input) {
    const id = randomUUID();
    const result = await database.query<Activity>(
      `INSERT INTO activities (
        id, customer_id, user_id, activity_type, visited_at, meeting_note, next_visit_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, customer_id, user_id, activity_type, visited_at, meeting_note, next_visit_at,
        created_at, updated_at`,
      [
        id,
        input.customer_id,
        input.user_id,
        input.activity_type,
        input.visited_at,
        input.meeting_note,
        input.next_visit_at,
      ],
    );

    return result.rows[0]!;
  },
});
