import { describe, expect, it, vi } from 'vitest';
import { createStaffPerformanceRepository } from './staff-performance-repository.js';

describe('createStaffPerformanceRepository', () => {
  it('joins users and aggregates the requested period with bound parameters', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        staff_id: 'c0a80101-1234-4abc-8def-123456789abc',
        staff_email: 'yamada@example.com',
        sales_amount: '3500000.00',
        sales_count: 12,
      }],
    });
    const repository = createStaffPerformanceRepository({ query });

    await expect(repository.findStaffPerformance({ from: '2026-01-01', to: '2026-03-31' })).resolves.toEqual([
      {
        staff_id: 'c0a80101-1234-4abc-8def-123456789abc',
        staff_email: 'yamada@example.com',
        sales_amount: '3500000.00',
        sales_count: 12,
      },
    ]);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM sales_records'),
      ['2026-01-01', '2026-03-31'],
    );
    const sql = query.mock.calls[0]![0] as string;
    expect(sql).toContain('INNER JOIN users ON users.id = sales_records.user_id');
    expect(sql).toContain('sales_records.recorded_on >= $1::date');
    expect(sql).toContain('sales_records.recorded_on <= $2::date');
    expect(sql).toContain('sales_records.user_id AS staff_id');
    expect(sql).toContain('users.email AS staff_email');
    expect(sql).toContain('SUM(sales_records.amount)::TEXT AS sales_amount');
    expect(sql).toContain('COUNT(*)::INTEGER AS sales_count');
    expect(sql).toContain('GROUP BY sales_records.user_id, users.email');
    expect(sql).toContain('ORDER BY SUM(sales_records.amount) DESC, users.email ASC');
  });
});
