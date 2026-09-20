import { expect, test, type Page } from '@playwright/test';
import { loginAsE2EManagerViaUi } from '../auth/login-helper';

const salesPath = '/api/v1/reports/sales-trend';
const categoriesPath = '/api/v1/reports/customer-categories';
const staffPath = '/api/v1/reports/staff-performance';

async function openReports(page: Page) {
  await loginAsE2EManagerViaUi(page);
  await page.getByRole('button', { name: 'レポート', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'レポート', exact: true })).toBeVisible();
}

async function search(page: Page, path: string, from: string, to: string) {
  await page.getByLabel('開始日').fill(from);
  await page.getByLabel('終了日').fill(to);
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === path &&
      url.searchParams.get('from') === from && url.searchParams.get('to') === to;
  });
  await page.getByRole('button', { name: '表示', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).origin).toBe('http://127.0.0.1:5173');
}

test('RP-01 3レポートを連続して切り替えられる', async ({ page }) => {
  await openReports(page);
  await page.getByRole('button', { name: '売上推移', exact: true }).click();
  await search(page, salesPath, '2026-01-15', '2026-03-10');
  await expect(page.getByRole('table', { name: '売上推移' })
    .getByRole('row', { name: '2026-01 3,000.00', exact: true })).toBeVisible();

  const categoriesResponse = page.waitForResponse((response) =>
    response.request().method() === 'GET' && new URL(response.url()).pathname === categoriesPath);
  await page.getByRole('button', { name: '顧客分類', exact: true }).click();
  const categoryResult = await categoriesResponse;
  expect(categoryResult.status()).toBe(200);
  expect(new URL(categoryResult.url()).origin).toBe('http://127.0.0.1:5173');
  const categoryTable = page.getByRole('table', { name: '顧客分類' });
  await expect(categoryTable.getByRole('row', { name: 'A 2', exact: true })).toBeVisible();
  await expect(categoryTable.getByRole('row', { name: 'B 2', exact: true })).toBeVisible();
  await expect(categoryTable.getByRole('row', { name: '未分類 1', exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: '売上推移' })).toHaveCount(0);

  await page.getByRole('button', { name: '営業担当者別実績', exact: true }).click();
  await search(page, staffPath, '2026-01-15', '2026-03-10');
  await expect(page.getByRole('table', { name: '営業担当者別実績' })
    .getByRole('row', { name: 'sales-a@example.com 3,500.00 3', exact: true })).toBeVisible();
  await expect(categoryTable).toHaveCount(0);

  await page.getByRole('button', { name: '売上推移', exact: true }).click();
  await expect(page.getByRole('heading', { name: '売上推移' })).toBeVisible();
  await expect(page.getByRole('table', { name: '営業担当者別実績' })).toHaveCount(0);
  await expect(categoryTable).toHaveCount(0);
  await expect(page.getByRole('button', { name: '表示', exact: true })).toBeEnabled();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('RP-02 顧客分類の取得中に切り替えても重複取得しない', async ({ page }) => {
  let categoryRequests = 0;
  page.on('request', (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === categoriesPath) {
      categoryRequests += 1;
    }
  });

  let releaseRequest!: () => void;
  const pending = new Promise<void>((resolve) => { releaseRequest = resolve; });
  let requestIntercepted!: () => void;
  const intercepted = new Promise<void>((resolve) => { requestIntercepted = resolve; });
  await page.route('**/api/v1/reports/customer-categories', async (route) => {
    requestIntercepted();
    await pending;
    await route.continue();
  });

  await openReports(page);
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === 'GET' && new URL(response.url()).pathname === categoriesPath);
  await page.getByRole('button', { name: '顧客分類', exact: true }).click();
  try {
    await intercepted;
    await expect(page.getByRole('status')).toHaveText('顧客分類を読み込み中...');
    expect(categoryRequests).toBe(1);

    await page.getByRole('button', { name: '売上推移', exact: true }).click();
    await expect(page.getByRole('heading', { name: '売上推移' })).toBeVisible();
    await page.getByRole('button', { name: '営業担当者別実績', exact: true }).click();
    await expect(page.getByRole('heading', { name: '営業担当者別実績' })).toBeVisible();
    await page.getByRole('button', { name: '顧客分類', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('顧客分類を読み込み中...');
    expect(categoryRequests).toBe(1);
  } finally {
    releaseRequest();
  }

  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).origin).toBe('http://127.0.0.1:5173');
  const table = page.getByRole('table', { name: '顧客分類' });
  await expect(table.getByRole('row', { name: 'A 2', exact: true })).toBeVisible();
  await expect(table.getByRole('row', { name: 'B 2', exact: true })).toBeVisible();
  await expect(table.getByRole('row', { name: '未分類 1', exact: true })).toBeVisible();
  expect(categoryRequests).toBe(1);
});

async function expectRejectedWithoutRequest(page: Page, path: string) {
  let apiRequests = 0;
  page.on('request', (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === path) apiRequests += 1;
  });

  const cases = [
    { from: '', to: '2026-03-10', error: '開始日を入力してください。' },
    { from: '2026-01-15', to: '', error: '終了日を入力してください。' },
    { from: '2026-03-10', to: '2026-01-15', error: '開始日は終了日以前の日付を指定してください。' },
  ];
  for (const input of cases) {
    await page.getByLabel('開始日').fill(input.from);
    await page.getByLabel('終了日').fill(input.to);
    await page.getByRole('button', { name: '表示', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText(input.error);
    expect(apiRequests).toBe(0);
  }
}

test('VL-01 売上推移の不正な期間はAPIを送信しない', async ({ page }) => {
  await openReports(page);
  await page.getByRole('button', { name: '売上推移', exact: true }).click();
  await expectRejectedWithoutRequest(page, salesPath);
  await expect(page.getByRole('table', { name: '売上推移' })).toHaveCount(0);
});

test('VL-01 営業担当者別の不正な期間はAPIを送信しない', async ({ page }) => {
  await openReports(page);
  await page.getByRole('button', { name: '営業担当者別実績', exact: true }).click();
  await expectRejectedWithoutRequest(page, staffPath);
  await expect(page.getByRole('table', { name: '営業担当者別実績' })).toHaveCount(0);
});
