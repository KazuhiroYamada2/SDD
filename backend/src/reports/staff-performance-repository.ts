export type StaffPerformanceQuery = {
  from: string;
  to: string;
};

export type StaffPerformanceAggregate = {
  staff_id: string;
  staff_email: string;
  sales_amount: string;
  sales_count: number;
};

export type Queryable = {
  query<Result>(sql: string, values: readonly unknown[]): Promise<{ rows: Result[] }>;
};

export type StaffPerformanceRepository = {
  findStaffPerformance(query: StaffPerformanceQuery): Promise<StaffPerformanceAggregate[]>;
};

export const createStaffPerformanceRepository = (database: Queryable): StaffPerformanceRepository => ({
  async findStaffPerformance(query) {
    const result = await database.query<StaffPerformanceAggregate>(
      `SELECT
        sales_records.user_id AS staff_id,
        users.email AS staff_email,
        SUM(sales_records.amount)::TEXT AS sales_amount,
        COUNT(*)::INTEGER AS sales_count
      FROM sales_records
      INNER JOIN users ON users.id = sales_records.user_id
      WHERE sales_records.recorded_on >= $1::date
        AND sales_records.recorded_on <= $2::date
      GROUP BY sales_records.user_id, users.email
      ORDER BY SUM(sales_records.amount) DESC, users.email ASC`,
      [query.from, query.to],
    );

    return result.rows;
  },
});
