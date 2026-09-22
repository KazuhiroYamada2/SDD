export type CustomerCategoryAggregate = {
  category: string;
  customer_count: number;
};

export type Queryable = {
  query<Result>(sql: string, values: readonly unknown[]): Promise<{ rows: Result[] }>;
};

export type CustomerCategoryRepository = {
  findCurrentCustomerCategories(): Promise<CustomerCategoryAggregate[]>;
};

export const createCustomerCategoryRepository = (database: Queryable): CustomerCategoryRepository => ({
  async findCurrentCustomerCategories() {
    const result = await database.query<CustomerCategoryAggregate>(
      `SELECT
        COALESCE(category, '未分類') AS category,
        COUNT(*)::INTEGER AS customer_count
      FROM customers
      WHERE deleted_at IS NULL
      GROUP BY COALESCE(category, '未分類')
      ORDER BY COUNT(*) DESC, COALESCE(category, '未分類') ASC`,
      [],
    );

    return result.rows;
  },
});
