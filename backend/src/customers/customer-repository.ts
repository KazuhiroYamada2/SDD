import { randomUUID } from 'node:crypto';

export type Customer = {
  id: string;
  name: string;
  name_kana: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
  owner_user_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type CreateCustomerInput = Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

export type Queryable = {
  query<Result>(sql: string, values: readonly unknown[]): Promise<{ rows: Result[] }>;
};

export type CustomerRepository = {
  create(input: CreateCustomerInput): Promise<Customer>;
};

export const createCustomerRepository = (database: Queryable): CustomerRepository => ({
  async create(input) {
    const id = randomUUID();
    const result = await database.query<Customer>(
      `INSERT INTO customers (
        id, name, name_kana, email, phone, address, category, owner_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, name_kana, email, phone, address, category, owner_user_id,
        created_at, updated_at, deleted_at`,
      [
        id,
        input.name,
        input.name_kana,
        input.email,
        input.phone,
        input.address,
        input.category,
        input.owner_user_id,
      ],
    );

    return result.rows[0]!;
  },
});
