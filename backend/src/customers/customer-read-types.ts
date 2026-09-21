import type { Customer } from './customer-repository.js';

export type CustomerReadDto = {
  id: string;
  name: string;
  name_kana: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CustomerListResponse = {
  items: CustomerReadDto[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
};

export const toCustomerReadDto = (customer: Customer): CustomerReadDto => ({
  id: customer.id,
  name: customer.name,
  name_kana: customer.name_kana,
  email: customer.email,
  phone: customer.phone,
  address: customer.address,
  category: customer.category,
  owner_user_id: customer.owner_user_id,
  created_at: customer.created_at.toISOString(),
  updated_at: customer.updated_at.toISOString(),
  deleted_at: customer.deleted_at?.toISOString() ?? null,
});
