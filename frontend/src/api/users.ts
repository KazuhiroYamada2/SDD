import type { UserRole } from '../auth/auth-types';
import { authenticatedFetch } from './authenticated-fetch';

export type ManagedUser = {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
};

type ApiError = { message?: string };
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export const getUsers = async (accessToken: string): Promise<ManagedUser[]> => {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/v1/users`, accessToken);
  if (response.ok) return response.json() as Promise<ManagedUser[]>;
  const error = await response.json().catch((): ApiError => ({}));
  throw new Error(error.message ?? 'ユーザー一覧を取得できませんでした。');
};

export const changeUserRole = async (
  userId: string,
  role: UserRole,
  accessToken: string,
): Promise<ManagedUser> => {
  const response = await authenticatedFetch(
    `${apiBaseUrl}/api/v1/users/${encodeURIComponent(userId)}/role`,
    accessToken,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    },
  );
  if (response.ok) return response.json() as Promise<ManagedUser>;
  const error = await response.json().catch((): ApiError => ({}));
  throw new Error(error.message ?? 'ユーザーのroleを変更できませんでした。');
};

