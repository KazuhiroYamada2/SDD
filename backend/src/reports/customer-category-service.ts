import type { CustomerCategoryRepository } from './customer-category-repository.js';

export type CustomerCategoryItemResponseDto = {
  category: string;
  customerCount: number;
};

export type CustomerCategoryResponseDto = {
  items: CustomerCategoryItemResponseDto[];
};

export type CustomerCategoryService = {
  getCustomerCategories(): Promise<CustomerCategoryResponseDto>;
};

export const createCustomerCategoryService = (repository: CustomerCategoryRepository): CustomerCategoryService => ({
  async getCustomerCategories() {
    const categories = await repository.findCurrentCustomerCategories();

    return {
      items: categories.map(({ category, customer_count }) => ({
        category,
        customerCount: customer_count,
      })),
    };
  },
});
