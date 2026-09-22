import { describe, expect, it } from 'vitest';
import type { StaffPerformanceAggregate, StaffPerformanceRepository } from './staff-performance-repository.js';
import { createStaffPerformanceService } from './staff-performance-service.js';

type UserFixture = {
  id: string;
  email: string;
};

type SalesRecordFixture = {
  user_id: string;
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

const repositoryFor = (users: UserFixture[], records: SalesRecordFixture[]): StaffPerformanceRepository => ({
  async findStaffPerformance({ from, to }) {
    const totals = new Map<string, { salesAmount: bigint; salesCount: number }>();
    records
      .filter((record) => record.recorded_on >= from && record.recorded_on <= to)
      .forEach((record) => {
        const total = totals.get(record.user_id) ?? { salesAmount: 0n, salesCount: 0 };
        totals.set(record.user_id, {
          salesAmount: total.salesAmount + toCents(record.amount),
          salesCount: total.salesCount + 1,
        });
      });

    return Array.from(totals, ([staff_id, total]): StaffPerformanceAggregate => {
      const user = users.find(({ id }) => id === staff_id)!;
      return {
        staff_id,
        staff_email: user.email,
        sales_amount: toAmount(total.salesAmount),
        sales_count: total.salesCount,
      };
    }).sort((left, right) =>
      Number(right.sales_amount) - Number(left.sales_amount) || left.staff_email.localeCompare(right.staff_email));
  },
});

const users = [
  { id: 'a0a80101-1234-4abc-8def-123456789abc', email: 'yamada@example.com' },
  { id: 'b0a80101-1234-4abc-8def-123456789abc', email: 'sato@example.com' },
  { id: 'c0a80101-1234-4abc-8def-123456789abc', email: 'tanaka@example.com' },
];

describe('createStaffPerformanceService', () => {
  it('returns one staff member with one sale using the user ID and email', async () => {
    const service = createStaffPerformanceService(repositoryFor(users, [
      { user_id: users[0]!.id, recorded_on: '2026-01-15', amount: '100.5' },
    ]));

    await expect(service.getStaffPerformance({ from: '2026-01-01', to: '2026-01-31' })).resolves.toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
      items: [{
        staffId: users[0]!.id,
        staffEmail: 'yamada@example.com',
        salesAmount: '100.50',
        salesCount: 1,
      }],
    });
  });

  it('aggregates multiple sales per staff member, orders totals and breaks ties by email', async () => {
    const service = createStaffPerformanceService(repositoryFor(users, [
      { user_id: users[0]!.id, recorded_on: '2026-01-10', amount: '125.25' },
      { user_id: users[0]!.id, recorded_on: '2026-01-20', amount: '74.75' },
      { user_id: users[1]!.id, recorded_on: '2026-01-21', amount: '200.00' },
      { user_id: users[2]!.id, recorded_on: '2026-01-22', amount: '250.00' },
    ]));

    await expect(service.getStaffPerformance({ from: '2026-01-01', to: '2026-01-31' })).resolves.toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
      items: [
        { staffId: users[2]!.id, staffEmail: 'tanaka@example.com', salesAmount: '250.00', salesCount: 1 },
        { staffId: users[1]!.id, staffEmail: 'sato@example.com', salesAmount: '200.00', salesCount: 1 },
        { staffId: users[0]!.id, staffEmail: 'yamada@example.com', salesAmount: '200.00', salesCount: 2 },
      ],
    });
  });

  it('includes both date boundaries and excludes records outside the requested period', async () => {
    const service = createStaffPerformanceService(repositoryFor(users, [
      { user_id: users[0]!.id, recorded_on: '2026-01-14', amount: '999.00' },
      { user_id: users[0]!.id, recorded_on: '2026-01-15', amount: '100.00' },
      { user_id: users[0]!.id, recorded_on: '2026-03-10', amount: '50.00' },
      { user_id: users[0]!.id, recorded_on: '2026-03-11', amount: '999.00' },
    ]));

    await expect(service.getStaffPerformance({ from: '2026-01-15', to: '2026-03-10' })).resolves.toMatchObject({
      items: [{ staffId: users[0]!.id, salesAmount: '150.00', salesCount: 2 }],
    });
  });

  it('returns an empty array when no sales records are in the requested period', async () => {
    const service = createStaffPerformanceService(repositoryFor(users, [
      { user_id: users[0]!.id, recorded_on: '2025-12-31', amount: '100.00' },
    ]));

    await expect(service.getStaffPerformance({ from: '2026-01-01', to: '2026-03-31' })).resolves.toEqual({
      from: '2026-01-01',
      to: '2026-03-31',
      items: [],
    });
  });
});
