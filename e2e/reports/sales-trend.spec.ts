import { expect, test, type Locator, type Page } from '@playwright/test';

const trendPath = '/api/v1/reports/sales-trend';

async function openSalesTrend(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'レポート', exact: true }).click();
  await page.getByRole('button', { name: '売上推移', exact: true }).click();
  await expect(page.getByRole('heading', { name: '売上推移' })).toBeVisible();
}

async function search(page: Page, from: string, to: string) {
  await page.getByLabel('開始日').fill(from);
  await page.getByLabel('終了日').fill(to);

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === trendPath &&
      url.searchParams.get('from') === from && url.searchParams.get('to') === to;
  });
  await page.getByRole('button', { name: '表示', exact: true }).click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).origin).toBe('http://127.0.0.1:5173');
  return page.getByRole('table', { name: '売上推移' });
}

async function expectMonth(table: Locator, month: string, amount: string) {
  const row = table.getByRole('row', { name: `${month} ${amount}`, exact: true });
  await expect(row.getByRole('cell', { name: month, exact: true })).toBeVisible();
  await expect(row.getByRole('cell', { name: amount, exact: true })).toBeVisible();
}

async function expectMonthsInOrder(table: Locator, months: string[]) {
  await expect(table.getByRole('row')).toHaveCount(months.length + 1);
  const rows = await table.getByRole('row').allTextContents();
  expect(rows.slice(1).map((row) => row.match(/2026-\d{2}/)?.[0])).toEqual(months);
}

test('ST-01 基本集計と月の昇順', async ({ page }) => {
  await openSalesTrend(page);
  const table = await search(page, '2026-01-15', '2026-03-10');

  await expectMonth(table, '2026-01', '3,000.00');
  await expectMonth(table, '2026-02', '0.00');
  await expectMonth(table, '2026-03', '2,000.00');
  await expectMonthsInOrder(table, ['2026-01', '2026-02', '2026-03']);
});

test('ST-02 売上0件の月も表に表示する', async ({ page }) => {
  await openSalesTrend(page);
  const table = await search(page, '2026-01-15', '2026-03-10');

  await expect(table.getByRole('row')).toHaveCount(4);
  await expectMonth(table, '2026-02', '0.00');
});

test('ST-03 期間の両端を含み範囲外を除外する', async ({ page }) => {
  await openSalesTrend(page);
  const table = await search(page, '2026-01-15', '2026-03-10');

  // 1/14の900を除外し1/15の1000を含む。3/10の1500を含み3/11の700を除外する。
  await expectMonth(table, '2026-01', '3,000.00');
  await expectMonth(table, '2026-03', '2,000.00');
});

test('ST-04 月途中の両端月と0件月を表示する', async ({ page }) => {
  await openSalesTrend(page);
  const table = await search(page, '2026-01-31', '2026-03-01');

  await expectMonth(table, '2026-01', '2,000.00');
  await expectMonth(table, '2026-02', '0.00');
  await expectMonth(table, '2026-03', '500.00');
  await expectMonthsInOrder(table, ['2026-01', '2026-02', '2026-03']);
});

test('ST-05 再検索で古い結果を置き換える', async ({ page }) => {
  await openSalesTrend(page);
  const firstTable = await search(page, '2026-01-15', '2026-03-10');
  await expectMonthsInOrder(firstTable, ['2026-01', '2026-02', '2026-03']);

  const secondTable = await search(page, '2026-04-01', '2026-04-30');
  await expectMonth(secondTable, '2026-04', '200.00');
  await expectMonthsInOrder(secondTable, ['2026-04']);
  await expect(secondTable.getByRole('row')).toHaveCount(2);
  for (const month of ['2026-01', '2026-02', '2026-03']) {
    await expect(secondTable.getByRole('cell', { name: month, exact: true })).toHaveCount(0);
  }
});
