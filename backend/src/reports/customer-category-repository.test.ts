import { describe, expect, it, vi } from 'vitest';
import { createCustomerCategoryRepository } from './customer-category-repository.js';

describe('createCustomerCategoryRepository', () => {
  it('counts active customers by response category in the required order', async () => {
    const rows = [
      { category: 'A', customer_count: 25 },
      { category: '未分類', customer_count: 3 },
    ];
    const query = vi.fn().mockResolvedValue({ rows });
    const repository = createCustomerCategoryRepository({ query });

    await expect(repository.findCurrentCustomerCategories()).resolves.toEqual(rows);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("COALESCE(category, '未分類') AS category"),
      [],
    );
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE deleted_at IS NULL'), []);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("GROUP BY COALESCE(category, '未分類')"), []);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY COUNT(*) DESC, COALESCE(category, '未分類') ASC"),
      [],
    );
  });
});
