import { expect, type APIRequestContext } from '@playwright/test';
import { e2eManager } from '../fixtures/auth-manager.mjs';

type LoginResult = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: { id: string; email: string; role: 'manager' };
};

export async function loginAsE2EManager(request: APIRequestContext): Promise<LoginResult> {
  const response = await request.post('/api/v1/auth/login', {
    data: { email: e2eManager.email, password: e2eManager.password },
  });
  expect(response.status()).toBe(200);
  const result = await response.json() as LoginResult;
  expect(typeof result.accessToken).toBe('string');
  expect(result.accessToken.length).toBeGreaterThan(0);
  expect(result.tokenType).toBe('Bearer');
  expect(result.expiresIn).toBe(1800);
  expect(result.user).toEqual({ id: e2eManager.id, email: e2eManager.email, role: 'manager' });
  return result;
}
