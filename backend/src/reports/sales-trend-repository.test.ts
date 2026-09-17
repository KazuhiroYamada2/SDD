import { describe, expect, it, vi } from 'vitest';
import { createSalesTrendRepository } from './sales-trend-repository.js';

describe('createSalesTrendRepository', () => {
  it('retrieves monthly totals within the inclusive date range in month order', async () => {
    const rows = [{ month: '2026-01', sales_amount: '1200000.00' }];
    const query = vi.fn().mockResolvedValue({ rows });
    const repository = createSalesTrendRepository({ query });

    await expect(repository.findMonthlySales({ from: '2026-01-15', to: '2026-03-10' })).resolves.toEqual(rows);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM sales_records'),
      ['2026-01-15', '2026-03-10'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('recorded_on >= $1::date'),
      ['2026-01-15', '2026-03-10'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('recorded_on <= $2::date'),
      ['2026-01-15', '2026-03-10'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("TO_CHAR(DATE_TRUNC('month', recorded_on), 'YYYY-MM')"),
      ['2026-01-15', '2026-03-10'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY DATE_TRUNC('month', recorded_on) ASC"),
      ['2026-01-15', '2026-03-10'],
    );
  });
});
