import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { loginAsE2EUser, loginAsE2EUserViaUi } from '../auth/login-helper';
import { e2eAdmin, e2eManager, e2eStaff } from '../fixtures/auth-users.mjs';

const ownCustomerId = '20000000-0000-4000-8000-000000000001';
const otherCustomerId = '20000000-0000-4000-8000-000000000003';
const authorization = (token: string) => ({ Authorization: `Bearer ${token}` });

async function openCustomerDetail(page: Page, customerName: string) {
  await page.getByRole('button', { name: '顧客一覧', exact: true }).click();
  await expect(page.getByRole('heading', { name: '顧客一覧', exact: true })).toBeVisible();
  const detailResponse = page.waitForResponse((response) =>
    response.request().method() === 'GET' &&
    new URL(response.url()).pathname.startsWith('/api/v1/customers/') &&
    !new URL(response.url()).pathname.endsWith('/activities'));
  await page.getByRole('button', { name: `${customerName}の詳細を表示` }).click();
  expect((await detailResponse).status()).toBe(200);
  await expect(page.getByRole('heading', { name: '顧客詳細', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '営業活動履歴', exact: true })).toBeVisible();
}

async function expectError(response: Awaited<ReturnType<APIRequestContext['get']>>, status: number, code: string) {
  expect(response.status()).toBe(status);
  expect(await response.json()).toMatchObject({ code });
}

test('unauthenticated protected API returns the common 401 contract', async ({ request }) => {
  await expectError(await request.get('/api/v1/customers'), 401, 'AUTHENTICATION_REQUIRED');
});

test('staff UI and Backend Authorization match the Role Matrix', async ({ page, request }) => {
  await loginAsE2EUserViaUi(page, e2eStaff);
  await expect(page.getByRole('button', { name: '顧客一覧', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '顧客情報を登録', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'レポート', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ユーザー管理', exact: true })).toHaveCount(0);

  await openCustomerDetail(page, 'A1');
  await expect(page.getByRole('button', { name: '編集', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '削除', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '営業活動を登録', exact: true })).toBeVisible();

  const { accessToken } = await loginAsE2EUser(request, e2eStaff);
  const headers = authorization(accessToken);
  await expectError(await request.get('/api/v1/reports/customer-categories', { headers }), 403, 'FORBIDDEN');
  await expectError(await request.delete(`/api/v1/customers/${ownCustomerId}`, { headers }), 403, 'FORBIDDEN');
  const customer = await request.get(`/api/v1/customers/${otherCustomerId}`, { headers });
  const activityGet = await request.get(`/api/v1/customers/${otherCustomerId}/activities`, { headers });
  const activityPost = await request.post(`/api/v1/customers/${otherCustomerId}/activities`, {
    headers,
    data: { user_id: e2eStaff.id, activity_type: 'visit' },
  });
  await expectError(customer, 404, 'CUSTOMER_NOT_FOUND');
  await expectError(activityGet, 404, 'CUSTOMER_NOT_FOUND');
  await expectError(activityPost, 404, 'CUSTOMER_NOT_FOUND');
  expect(await customer.json()).toEqual(await activityGet.json());
  expect(await customer.json()).toEqual(await activityPost.json());
  await expectError(await request.get('/api/v1/users', { headers }), 403, 'FORBIDDEN');
});

test('manager UI and Backend Authorization match the Role Matrix', async ({ page, request }) => {
  await loginAsE2EUserViaUi(page, e2eManager);
  await expect(page.getByRole('heading', { name: '顧客情報を登録', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'レポート', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ユーザー管理', exact: true })).toHaveCount(0);

  await openCustomerDetail(page, 'B1');
  await expect(page.getByRole('button', { name: '編集', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '削除', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '営業活動を登録', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '顧客一覧へ戻る' }).click();
  await page.getByRole('button', { name: '顧客登録画面に戻る' }).click();
  await page.getByRole('button', { name: 'レポート', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'レポート', exact: true })).toBeVisible();

  const { accessToken } = await loginAsE2EUser(request, e2eManager);
  const headers = authorization(accessToken);
  await expectError(await request.post('/api/v1/customers', { headers, data: {} }), 403, 'FORBIDDEN');
  await expectError(await request.post(`/api/v1/customers/${otherCustomerId}/activities`, {
    headers, data: {},
  }), 403, 'FORBIDDEN');
  await expectError(await request.get('/api/v1/users', { headers }), 403, 'FORBIDDEN');
});

test('admin UI exposes permitted Customer, Activity, Reports, and Users operations', async ({ page }) => {
  await loginAsE2EUserViaUi(page, e2eAdmin);
  await expect(page.getByRole('heading', { name: '顧客情報を登録', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'レポート', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ユーザー管理', exact: true })).toBeVisible();

  await openCustomerDetail(page, 'B1');
  await expect(page.getByRole('button', { name: '編集', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '削除', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '営業活動を登録', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '顧客一覧へ戻る' }).click();
  await page.getByRole('button', { name: '顧客登録画面に戻る' }).click();

  await page.getByRole('button', { name: 'ユーザー管理', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ユーザー管理', exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'ユーザー一覧' })).toBeVisible();
  await expect(page.getByLabel(`${e2eAdmin.email}のrole`)).toBeDisabled();
  await expect(page.getByLabel(`${e2eStaff.email}のrole`)).toBeEnabled();
});
