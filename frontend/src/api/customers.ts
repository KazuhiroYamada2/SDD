export type CreateCustomerInput = {
  name: string;
  owner_user_id: string;
  name_kana?: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: string;
};

type ApiError = {
  code?: string;
  message?: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export const registerCustomer = async (input: CreateCustomerInput) => {
  const response = await fetch(`${apiBaseUrl}/api/v1/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (response.ok) {
    return response.json();
  }

  const error = await response.json().catch((): ApiError => ({}));
  throw new Error(error.message ?? '顧客情報を登録できませんでした。');
};
