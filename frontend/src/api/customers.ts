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
  owner_user_id: string;
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
