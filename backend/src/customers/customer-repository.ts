import { randomUUID } from 'node:crypto';
import type { CustomerSort } from './customer-read-types.js';

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
export type UpdateCustomerInput = Partial<Pick<
  Customer,
  'name' | 'name_kana' | 'email' | 'phone' | 'address' | 'category'
>>;

export type Queryable = {
  query<Result>(sql: string, values?: readonly unknown[]): Promise<{ rows: Result[] }>;
};

export type TransactionalQueryable = Queryable & {
  connect?: () => Promise<Queryable & { release(): void }>;
};

export type AuditInTransaction = (query: Queryable) => Promise<void>;

export type CustomerRepository = {
  create(input: CreateCustomerInput): Promise<Customer>;
};

export type CustomerListCriteria = {
  ownerScopeUserId?: string;
  query?: string;
  category?: string;
  ownerUserId?: string;
  sort?: CustomerSort;
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

export type CustomerEditRepository = CustomerReadRepository & {
  updateActiveById(id: string, input: UpdateCustomerInput, audit?: AuditInTransaction): Promise<Customer | null>;
};

export type CustomerDeleteRepository = CustomerReadRepository & {
  logicalDeleteActiveById(id: string, audit?: AuditInTransaction): Promise<boolean>;
};

type CustomerPersistenceRepository = CustomerRepository & CustomerReadRepository &
  CustomerEditRepository & CustomerDeleteRepository;

const customerColumns = `id, name, name_kana, email, phone, address, category, owner_user_id,
  created_at, updated_at, deleted_at`;

const orderBy: Record<CustomerSort, string> = {
  name_asc: 'name ASC, id ASC',
  name_desc: 'name DESC, id ASC',
  created_at_asc: 'created_at ASC, id ASC',
  created_at_desc: 'created_at DESC, id ASC',
};

const runTransaction = async <Result>(
  database: TransactionalQueryable,
  operation: (query: Queryable) => Promise<Result>,
): Promise<Result> => {
  if (database.connect === undefined) throw new Error('Transactional database is required.');
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const createCustomerRepository = (database: TransactionalQueryable): CustomerPersistenceRepository => ({
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
    const clauses = ['deleted_at IS NULL'];
    const values: unknown[] = [];
    const addCondition = (columnExpression: string, value: unknown) => {
      values.push(value);
      clauses.push(`${columnExpression} $${values.length}`);
    };

    if (criteria.ownerScopeUserId !== undefined) addCondition('owner_user_id =', criteria.ownerScopeUserId);
    if (criteria.query !== undefined) addCondition('name ILIKE', `%${criteria.query}%`);
    if (criteria.category !== undefined) addCondition('category =', criteria.category);
    if (criteria.ownerUserId !== undefined) addCondition('owner_user_id =', criteria.ownerUserId);

    const limitParameter = values.length + 1;
    const offsetParameter = limitParameter + 1;
    const whereClause = `WHERE ${clauses.join(' AND ')}`;
    const sort = criteria.sort ?? 'name_asc';

    const [itemsResult, countResult] = await Promise.all([
      database.query<Customer>(
        `SELECT ${customerColumns}
        FROM customers
        ${whereClause}
        ORDER BY ${orderBy[sort]}
        LIMIT $${limitParameter} OFFSET $${offsetParameter}`,
        [...values, criteria.limit, criteria.offset],
      ),
      database.query<{ total_count: string | number }>(
        `SELECT COUNT(*) AS total_count
        FROM customers
        ${whereClause}`,
        values,
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
  async updateActiveById(id, input, audit) {
    const columnByField: Record<keyof UpdateCustomerInput, string> = {
      name: 'name',
      name_kana: 'name_kana',
      email: 'email',
      phone: 'phone',
      address: 'address',
      category: 'category',
    };
    const entries = Object.entries(input) as [keyof UpdateCustomerInput, string | null][];
    const values: unknown[] = entries.map(([, value]) => value);
    const assignments = entries.map(([field], index) => `${columnByField[field]} = $${index + 1}`);
    values.push(id);

    const update = async (query: Queryable) => {
      const result = await query.query<Customer>(
        `UPDATE customers
        SET ${assignments.join(', ')}, updated_at = NOW()
        WHERE id = $${values.length} AND deleted_at IS NULL
        RETURNING ${customerColumns}`,
        values,
      );
      const updated = result.rows[0] ?? null;
      if (updated !== null) await audit?.(query);
      return updated;
    };
    return audit === undefined ? update(database) : runTransaction(database, update);
  },
  async logicalDeleteActiveById(id, audit) {
    const logicalDelete = async (query: Queryable) => {
      const result = await query.query<{ id: string }>(
        `UPDATE customers
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id`,
        [id],
      );
      const deleted = result.rows.length === 1;
      if (deleted) await audit?.(query);
      return deleted;
    };
    return audit === undefined ? logicalDelete(database) : runTransaction(database, logicalDelete);
  },
});
