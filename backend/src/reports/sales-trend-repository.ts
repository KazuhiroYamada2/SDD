export type SalesTrendQuery = {
  from: string;
  to: string;
};

export type MonthlySalesTotal = {
  month: string;
  sales_amount: string;
};

export type Queryable = {
  query<Result>(sql: string, values: readonly unknown[]): Promise<{ rows: Result[] }>;
};

export type SalesTrendRepository = {
  findMonthlySales(query: SalesTrendQuery): Promise<MonthlySalesTotal[]>;
};

export const createSalesTrendRepository = (database: Queryable): SalesTrendRepository => ({
  async findMonthlySales(query) {
    const result = await database.query<MonthlySalesTotal>(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', recorded_on), 'YYYY-MM') AS month,
        SUM(amount)::TEXT AS sales_amount
      FROM sales_records
      WHERE recorded_on >= $1::date
        AND recorded_on <= $2::date
      GROUP BY DATE_TRUNC('month', recorded_on)
      ORDER BY DATE_TRUNC('month', recorded_on) ASC`,
      [query.from, query.to],
    );

    return result.rows;
  },
});
