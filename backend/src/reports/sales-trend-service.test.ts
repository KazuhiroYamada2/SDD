import { describe, expect, it } from 'vitest';
import type { MonthlySalesTotal, SalesTrendRepository } from './sales-trend-repository.js';
import { createSalesTrendService } from './sales-trend-service.js';

type SalesRecordFixture = {
  recorded_on: string;
  amount: string;
};

const toCents = (amount: string): bigint => {
  const [integer, decimal = ''] = amount.split('.');
  return BigInt(integer) * 100n + BigInt(decimal.padEnd(2, '0'));
};

const toAmount = (cents: bigint): string => {
  const value = cents.toString().padStart(3, '0');
  return `${value.slice(0, -2)}.${value.slice(-2)}`;
};

const repositoryFor = (records: SalesRecordFixture[]): SalesTrendRepository => ({
  async findMonthlySales({ from, to }) {
    const centsByMonth = new Map<string, bigint>();
    records
      .filter((record) => record.recorded_on >= from && record.recorded_on <= to)
      .forEach((record) => {
        const month = record.recorded_on.slice(0, 7);
        centsByMonth.set(month, (centsByMonth.get(month) ?? 0n) + toCents(record.amount));
      });

    return Array.from(centsByMonth, ([month, cents]): MonthlySalesTotal => ({
      month,
      sales_amount: toAmount(cents),
    })).reverse();
  },
});

describe('createSalesTrendService', () => {
  it('returns one month and one record as a two-decimal string', async () => {
    const service = createSalesTrendService(repositoryFor([
      { recorded_on: '2026-01-15', amount: '1200000.5' },
    ]));

    await expect(service.getSalesTrend({ from: '2026-01-01', to: '2026-01-31' })).resolves.toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
      items: [{ month: '2026-01', salesAmount: '1200000.50' }],
    });
  });

  it('returns the sum of multiple records in one month', async () => {
    const service = createSalesTrendService(repositoryFor([
      { recorded_on: '2026-01-10', amount: '125.25' },
      { recorded_on: '2026-01-20', amount: '74.75' },
    ]));

    await expect(service.getSalesTrend({ from: '2026-01-01', to: '2026-01-31' })).resolves.toMatchObject({
      items: [{ month: '2026-01', salesAmount: '200.00' }],
    });
  });

  it('generates ascending months, includes both boundaries, excludes outside records, and fills a zero month', async () => {
    const service = createSalesTrendService(repositoryFor([
      { recorded_on: '2026-01-14', amount: '999.00' },
      { recorded_on: '2026-01-15', amount: '100.00' },
      { recorded_on: '2026-03-10', amount: '50.00' },
      { recorded_on: '2026-03-11', amount: '999.00' },
    ]));

    await expect(service.getSalesTrend({ from: '2026-01-15', to: '2026-03-10' })).resolves.toEqual({
      from: '2026-01-15',
      to: '2026-03-10',
      items: [
        { month: '2026-01', salesAmount: '100.00' },
        { month: '2026-02', salesAmount: '0.00' },
        { month: '2026-03', salesAmount: '50.00' },
      ],
    });
  });

  it('returns every month with zero sales when the full period has no records', async () => {
    const service = createSalesTrendService(repositoryFor([]));

    await expect(service.getSalesTrend({ from: '2026-01-15', to: '2026-03-10' })).resolves.toEqual({
      from: '2026-01-15',
      to: '2026-03-10',
      items: [
        { month: '2026-01', salesAmount: '0.00' },
        { month: '2026-02', salesAmount: '0.00' },
        { month: '2026-03', salesAmount: '0.00' },
      ],
    });
  });
});
