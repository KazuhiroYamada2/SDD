import { authenticatedFetch } from './authenticated-fetch';

export type CreateCustomerInput = {
  name: string;
  owner_user_id: string;
  name_kana?: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: string;
};

export type Customer = {
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
  items: Customer[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
};

type ApiError = {
  code?: string;
  message?: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export const registerCustomer = async (input: CreateCustomerInput, accessToken: string): Promise<Customer> => {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/v1/customers`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (response.ok) {
    return response.json() as Promise<Customer>;
  }

  const error = await response.json().catch((): ApiError => ({}));
  throw new Error(error.message ?? '顧客情報を登録できませんでした。');
};

export const getCustomers = async (accessToken: string): Promise<CustomerListResponse> => {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/v1/customers`, accessToken);

  if (response.ok) {
    return response.json() as Promise<CustomerListResponse>;
  }

  const error = await response.json().catch((): ApiError => ({}));
  throw new Error(error.message ?? '顧客一覧を取得できませんでした。');
};
