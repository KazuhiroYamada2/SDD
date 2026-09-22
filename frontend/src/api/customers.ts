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

export type UpdateCustomerInput = Partial<Pick<
  Customer,
  'name' | 'name_kana' | 'email' | 'phone' | 'address' | 'category'
>>;

export type CustomerListResponse = {
  items: Customer[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
};

export type CustomerListSort =
  | 'name_asc'
  | 'name_desc'
  | 'created_at_asc'
  | 'created_at_desc';

export type CustomerListParameters = {
  page: number;
  page_size: 20 | 50 | 100;
  query?: string;
  category?: string;
  owner_user_id?: string;
  sort: CustomerListSort;
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

export const getCustomers = async (
  accessToken: string,
  parameters?: CustomerListParameters,
): Promise<CustomerListResponse> => {
  const search = new URLSearchParams();
  if (parameters !== undefined) {
    search.set('page', String(parameters.page));
    search.set('page_size', String(parameters.page_size));
    if (parameters.query?.trim()) search.set('query', parameters.query.trim());
    if (parameters.category?.trim()) search.set('category', parameters.category.trim());
    if (parameters.owner_user_id !== undefined) search.set('owner_user_id', parameters.owner_user_id);
    search.set('sort', parameters.sort);
  }
  const queryString = search.toString();
  const url = `${apiBaseUrl}/api/v1/customers${queryString === '' ? '' : `?${queryString}`}`;
  const response = await authenticatedFetch(url, accessToken);

  if (response.ok) {
    return response.json() as Promise<CustomerListResponse>;
  }

  const error = await response.json().catch((): ApiError => ({}));
  throw new Error(error.message ?? '顧客一覧を取得できませんでした。');
};

export const getCustomer = async (customerId: string, accessToken: string): Promise<Customer> => {
  const response = await authenticatedFetch(
    `${apiBaseUrl}/api/v1/customers/${encodeURIComponent(customerId)}`,
    accessToken,
  );

  if (response.ok) {
    return response.json() as Promise<Customer>;
  }

  const error = await response.json().catch((): ApiError => ({}));
  throw new Error(error.message ?? '顧客情報を取得できませんでした。');
};

export const updateCustomer = async (
  customerId: string,
  input: UpdateCustomerInput,
  accessToken: string,
): Promise<Customer> => {
  const response = await authenticatedFetch(
    `${apiBaseUrl}/api/v1/customers/${encodeURIComponent(customerId)}`,
    accessToken,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );

  if (response.ok) return response.json() as Promise<Customer>;
  const error = await response.json().catch((): ApiError => ({}));
  throw new Error(error.message ?? '顧客情報を更新できませんでした。');
};

export const deleteCustomer = async (customerId: string, accessToken: string): Promise<void> => {
  const response = await authenticatedFetch(
    `${apiBaseUrl}/api/v1/customers/${encodeURIComponent(customerId)}`,
    accessToken,
    { method: 'DELETE' },
  );
  if (response.status === 204) return;
  const error = await response.json().catch((): ApiError => ({}));
  throw new Error(error.message ?? '顧客情報を削除できませんでした。');
};
