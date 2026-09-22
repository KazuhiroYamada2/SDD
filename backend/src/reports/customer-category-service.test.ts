import { describe, expect, it } from 'vitest';
import type { CustomerCategoryAggregate, CustomerCategoryRepository } from './customer-category-repository.js';
import { createCustomerCategoryService } from './customer-category-service.js';

type CustomerFixture = {
  category: string | null;
  deleted_at: string | null;
};

const repositoryFor = (customers: CustomerFixture[]): CustomerCategoryRepository => ({
  async findCurrentCustomerCategories() {
    const counts = new Map<string, number>();
    customers
      .filter((customer) => customer.deleted_at === null)
      .forEach((customer) => {
        const category = customer.category ?? '未分類';
        counts.set(category, (counts.get(category) ?? 0) + 1);
      });

    return Array.from(counts, ([category, customer_count]): CustomerCategoryAggregate => ({ category, customer_count }))
      .sort((left, right) => right.customer_count - left.customer_count || left.category.localeCompare(right.category));
  },
});

describe('createCustomerCategoryService', () => {
  it('returns a single category count', async () => {
    const service = createCustomerCategoryService(repositoryFor([
      { category: 'A', deleted_at: null },
      { category: 'A', deleted_at: null },
    ]));

    await expect(service.getCustomerCategories()).resolves.toEqual({
      items: [{ category: 'A', customerCount: 2 }],
    });
  });

  it('groups multiple null categories as unclassified and excludes logically deleted customers', async () => {
    const service = createCustomerCategoryService(repositoryFor([
      { category: 'A', deleted_at: null },
      { category: 'A', deleted_at: null },
      { category: 'B', deleted_at: null },
      { category: null, deleted_at: null },
      { category: null, deleted_at: null },
      { category: '削除済み', deleted_at: '2026-01-01T00:00:00.000Z' },
    ]));

    await expect(service.getCustomerCategories()).resolves.toEqual({
      items: [
        { category: 'A', customerCount: 2 },
        { category: '未分類', customerCount: 2 },
        { category: 'B', customerCount: 1 },
      ],
    });
  });

  it('returns equal counts in category ascending order', async () => {
    const service = createCustomerCategoryService(repositoryFor([
      { category: 'B', deleted_at: null },
      { category: 'A', deleted_at: null },
    ]));

    await expect(service.getCustomerCategories()).resolves.toEqual({
      items: [
        { category: 'A', customerCount: 1 },
        { category: 'B', customerCount: 1 },
      ],
    });
  });

  it('returns an empty item list when there are no active customers', async () => {
    const service = createCustomerCategoryService(repositoryFor([
      { category: 'A', deleted_at: '2026-01-01T00:00:00.000Z' },
    ]));

    await expect(service.getCustomerCategories()).resolves.toEqual({ items: [] });
  });
});
