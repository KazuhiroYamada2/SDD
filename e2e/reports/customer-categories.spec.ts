import { expect, test, type Locator, type Page, type Response } from '@playwright/test';

const categoriesPath = '/api/v1/reports/customer-categories';

async function openReports(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'レポート', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'レポート' })).toBeVisible();
}

async function visitCategories(page: Page, allowNotModified = false) {
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === categoriesPath;
  });
  await page.getByRole('button', { name: '顧客分類', exact: true }).click();

  const response = await responsePromise;
  const url = new URL(response.url());
  if (allowNotModified) {
    expect([200, 304]).toContain(response.status());
  } else {
    expect(response.status()).toBe(200);
  }
  expect(url.origin).toBe('http://127.0.0.1:5173');
  expect(url.search).toBe('');
  return page.getByRole('table', { name: '顧客分類' });
}

async function expectCategory(table: Locator, category: string, count: number) {
  const row = table.getByRole('row', { name: `${category} ${count}`, exact: true });
  await expect(row.getByRole('cell', { name: category, exact: true })).toBeVisible();
  await expect(row.getByRole('cell', { name: String(count), exact: true })).toBeVisible();
}

test('CC-01 有効顧客を分類別に集計する', async ({ page }) => {
  await openReports(page);
  const table = await visitCategories(page);

  await expectCategory(table, 'A', 2);
  await expectCategory(table, 'B', 2);
  await expectCategory(table, '未分類', 1);
});

test('CC-02 論理削除したA顧客を除外する', async ({ page }) => {
  await openReports(page);
  const table = await visitCategories(page);

  await expectCategory(table, 'A', 2);
  await expect(table.getByRole('row', { name: 'A 3', exact: true })).toHaveCount(0);
});

test('CC-03 NULL分類を未分類として表示する', async ({ page }) => {
  await openReports(page);
  const table = await visitCategories(page);

  await expectCategory(table, '未分類', 1);
  await expect(table.getByRole('cell', { name: 'null', exact: true })).toHaveCount(0);
});

test('CC-04 件数降順、同数時は分類昇順で表示する', async ({ page }) => {
  await openReports(page);
  const table = await visitCategories(page);

  const rows = table.getByRole('row');
  await expect(rows).toHaveCount(4);
  const dataRows = (await rows.all()).slice(1);
  const displayedCategories = await Promise.all(
    dataRows.map((row) => row.getByRole('cell').first().innerText()),
  );
  expect(displayedCategories).toEqual(['A', 'B', '未分類']);
  await expectCategory(table, 'A', 2);
  await expectCategory(table, 'B', 2);
  await expectCategory(table, '未分類', 1);
});

test('CC-05 再訪時に実APIを再取得して同じ結果を表示する', async ({ page }) => {
  let categoryRequests = 0;
  const categoryResponses: Response[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === categoriesPath) categoryRequests += 1;
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (response.request().method() === 'GET' && url.pathname === categoriesPath) {
      categoryResponses.push(response);
    }
  });

  await openReports(page);
  const firstTable = await visitCategories(page);
  await expectCategory(firstTable, 'A', 2);
  await expectCategory(firstTable, 'B', 2);
  await expectCategory(firstTable, '未分類', 1);
  expect(categoryRequests).toBe(1);

  await page.getByRole('button', { name: '売上推移', exact: true }).click();
  await expect(page.getByRole('heading', { name: '売上推移' })).toBeVisible();

  const secondTable = await visitCategories(page, true);
  await expectCategory(secondTable, 'A', 2);
  await expectCategory(secondTable, 'B', 2);
  await expectCategory(secondTable, '未分類', 1);
  expect(categoryRequests).toBe(2);
  expect(categoryResponses).toHaveLength(2);
  expect(categoryResponses[0].status()).toBe(200);
  const secondResponse = categoryResponses[1];
  expect([200, 304]).toContain(secondResponse.status());
  const requestHeaders = await secondResponse.request().allHeaders();
  const responseHeaders = await secondResponse.allHeaders();
  if (secondResponse.status() === 304 && requestHeaders['if-none-match'] && responseHeaders.etag) {
    expect(requestHeaders['if-none-match']).toBe(responseHeaders.etag);
  }
});
