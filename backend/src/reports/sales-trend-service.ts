import type { SalesTrendQuery, SalesTrendRepository } from './sales-trend-repository.js';

export type SalesTrendItemResponseDto = {
  month: string;
  salesAmount: string;
};

export type SalesTrendResponseDto = {
  from: string;
  to: string;
  items: SalesTrendItemResponseDto[];
};

export type SalesTrendService = {
  getSalesTrend(query: SalesTrendQuery): Promise<SalesTrendResponseDto>;
};

const monthsBetween = (from: string, to: string): string[] => {
  const [fromYear, fromMonth] = from.slice(0, 7).split('-').map(Number);
  const [toYear, toMonth] = to.slice(0, 7).split('-').map(Number);
  const months: string[] = [];

  let year = fromYear!;
  let month = fromMonth!;
  while (year < toYear! || (year === toYear! && month <= toMonth!)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    if (month === 12) {
      year += 1;
      month = 1;
    } else {
      month += 1;
    }
  }

  return months;
};

const formatSalesAmount = (amount: string): string => {
  const [integer, decimal = ''] = amount.split('.');
  return `${integer}.${decimal.padEnd(2, '0')}`;
};

export const createSalesTrendService = (repository: SalesTrendRepository): SalesTrendService => ({
  async getSalesTrend(query) {
    const monthlySales = await repository.findMonthlySales(query);
    const amountByMonth = new Map(monthlySales.map(({ month, sales_amount }) => [month, formatSalesAmount(sales_amount)]));

    return {
      from: query.from,
      to: query.to,
      items: monthsBetween(query.from, query.to).map((month) => ({
        month,
        salesAmount: amountByMonth.get(month) ?? '0.00',
      })),
    };
  },
});
