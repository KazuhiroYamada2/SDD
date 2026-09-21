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

export type CustomerListCriteria = {
  ownerScopeUserId?: string;
  limit: number;
  offset: number;
};

export type CustomerListResult = {
  items: Customer[];
  totalCount: number;
};

export type CustomerReadRepository = {
  list(criteria: CustomerListCriteria): Promise<CustomerListResult>;
  findActiveById(id: string): Promise<Customer | null>;
};

type CustomerPersistenceRepository = CustomerRepository & CustomerReadRepository;

const customerColumns = `id, name, name_kana, email, phone, address, category, owner_user_id,
  created_at, updated_at, deleted_at`;

export const createCustomerRepository = (database: Queryable): CustomerPersistenceRepository => ({
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
  async list(criteria) {
    const ownerFilter = criteria.ownerScopeUserId === undefined
      ? { clause: '', values: [] as unknown[] }
      : { clause: ' AND owner_user_id = $1', values: [criteria.ownerScopeUserId] as unknown[] };
    const limitParameter = ownerFilter.values.length + 1;
    const offsetParameter = limitParameter + 1;
    const whereClause = `WHERE deleted_at IS NULL${ownerFilter.clause}`;

    const [itemsResult, countResult] = await Promise.all([
      database.query<Customer>(
        `SELECT ${customerColumns}
        FROM customers
        ${whereClause}
        ORDER BY name ASC, id ASC
        LIMIT $${limitParameter} OFFSET $${offsetParameter}`,
        [...ownerFilter.values, criteria.limit, criteria.offset],
      ),
      database.query<{ total_count: string | number }>(
        `SELECT COUNT(*) AS total_count
        FROM customers
        ${whereClause}`,
        ownerFilter.values,
      ),
    ]);

    return {
      items: itemsResult.rows,
      totalCount: Number(countResult.rows[0]?.total_count ?? 0),
    };
  },
  async findActiveById(id) {
    const result = await database.query<Customer>(
      `SELECT ${customerColumns}
      FROM customers
      WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ?? null;
  },
});
