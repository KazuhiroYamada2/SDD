import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { e2eManager } from '../fixtures/auth-manager.mjs';

type E2EUser = {
  id: string;
  email: string;
  password: string;
  role: 'staff' | 'manager' | 'admin';
};

type LoginResult = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: { id: string; email: string; role: 'staff' | 'manager' | 'admin' };
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

export async function loginAsE2EManagerViaUi(page: Page): Promise<void> {
  await loginAsE2EUserViaUi(page, e2eManager as E2EUser);
}

export async function loginAsE2EUser(request: APIRequestContext, user: E2EUser): Promise<LoginResult> {
  const response = await request.post('/api/v1/auth/login', {
    data: { email: user.email, password: user.password },
  });
  expect(response.status()).toBe(200);
  const result = await response.json() as LoginResult;
  expect(result.user).toEqual({ id: user.id, email: user.email, role: user.role });
  return result;
}

export async function loginAsE2EUserViaUi(page: Page, user: E2EUser): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ログイン', exact: true })).toBeVisible();
  await page.getByLabel('メールアドレス').fill(user.email);
  await page.getByLabel('パスワード').fill(user.password);
  const loginResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST' &&
    new URL(response.url()).pathname === '/api/v1/auth/login');
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page.getByRole('heading', { name: '顧客管理システム', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ログイン', exact: true })).toHaveCount(0);
}
