import type { LoginRequest, LoginResponse } from '../auth/auth-types';

export type LoginErrorKind = 'validation' | 'authentication' | 'server' | 'network';

export class LoginApiError extends Error {
  constructor(public readonly kind: LoginErrorKind) {
    super({
      validation: '入力内容を確認してください。',
      authentication: 'ログインに失敗しました。',
      server: 'ログイン処理を完了できませんでした。',
      network: '通信できませんでした。時間をおいて再度お試しください。',
    }[kind]);
    this.name = 'LoginApiError';
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export async function login(input: LoginRequest): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new LoginApiError('network');
  }

  if (response.status === 200) {
    return response.json() as Promise<LoginResponse>;
  }

  const body: unknown = await response.json().catch(() => null);
  const code = typeof body === 'object' && body !== null && 'code' in body ? body.code : undefined;
  if (response.status === 400 && code === 'VALIDATION_ERROR') {
    throw new LoginApiError('validation');
  }
  if (response.status === 401 && code === 'AUTHENTICATION_FAILED') {
    throw new LoginApiError('authentication');
  }
  throw new LoginApiError('server');
}
