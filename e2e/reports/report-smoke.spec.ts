import { expect, test } from '@playwright/test';
import { loginAsE2EManagerViaUi } from '../auth/login-helper';

test('顧客分類が実DBからブラウザへ表示される', async ({ page }) => {
  await loginAsE2EManagerViaUi(page);
  await page.getByRole('button', { name: 'レポート', exact: true }).click();

  const categoryResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/v1/reports/customer-categories' &&
      response.request().method() === 'GET';
  });
  await page.getByRole('button', { name: '顧客分類', exact: true }).click();

  const response = await categoryResponse;
  expect(response.status()).toBe(200);
  expect(/^Bearer \S+$/.test((await response.request().allHeaders()).authorization ?? '')).toBe(true);
  expect(new URL(response.url()).origin).toBe('http://127.0.0.1:5173');

  const table = page.getByRole('table', { name: '顧客分類' });
  await expect(table.getByRole('row', { name: 'A 2', exact: true })).toBeVisible();
  await expect(table.getByRole('row', { name: 'B 2', exact: true })).toBeVisible();
  await expect(table.getByRole('row', { name: '未分類 1', exact: true })).toBeVisible();
});
