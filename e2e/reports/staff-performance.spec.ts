import { expect, test, type Locator, type Page } from '@playwright/test';

const staffPath = '/api/v1/reports/staff-performance';

async function openStaffPerformance(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'レポート', exact: true }).click();
  await page.getByRole('button', { name: '営業担当者別実績', exact: true }).click();
  await expect(page.getByRole('heading', { name: '営業担当者別実績' })).toBeVisible();
}

async function search(page: Page, from: string, to: string) {
  await page.getByLabel('開始日').fill(from);
  await page.getByLabel('終了日').fill(to);

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === staffPath &&
      url.searchParams.get('from') === from && url.searchParams.get('to') === to;
  });
  await page.getByRole('button', { name: '表示', exact: true }).click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).origin).toBe('http://127.0.0.1:5173');
  return page.getByRole('table', { name: '営業担当者別実績' });
}

async function expectStaff(table: Locator, email: string, amount: string, count: number) {
  const row = table.getByRole('row', { name: `${email} ${amount} ${count}`, exact: true });
  await expect(row.getByRole('cell', { name: email, exact: true })).toBeVisible();
  await expect(row.getByRole('cell', { name: amount, exact: true })).toBeVisible();
  await expect(row.getByRole('cell', { name: String(count), exact: true })).toBeVisible();
}

async function expectStaffOrder(table: Locator) {
  const rows = table.getByRole('row');
  await expect(rows).toHaveCount(3);
  const dataRows = (await rows.all()).slice(1);
  const emails = await Promise.all(dataRows.map((row) => row.getByRole('cell').first().innerText()));
  expect(emails).toEqual(['sales-a@example.com', 'sales-b@example.com']);
}

test('SP-01 担当者別の金額と件数を表示する', async ({ page }) => {
  await openStaffPerformance(page);
  const table = await search(page, '2026-01-15', '2026-03-10');

  await expectStaff(table, 'sales-a@example.com', '3,500.00', 3);
  await expectStaff(table, 'sales-b@example.com', '1,500.00', 1);
});

test('SP-02 user Aの売上金額を合計する', async ({ page }) => {
  await openStaffPerformance(page);
  const table = await search(page, '2026-01-15', '2026-03-10');

  await expectStaff(table, 'sales-a@example.com', '3,500.00', 3);
});

test('SP-03 担当者ごとの売上件数を表示する', async ({ page }) => {
  await openStaffPerformance(page);
  const table = await search(page, '2026-01-15', '2026-03-10');

  await expectStaff(table, 'sales-a@example.com', '3,500.00', 3);
  await expectStaff(table, 'sales-b@example.com', '1,500.00', 1);
});

test('SP-04 金額降順と同額時のemail昇順で表示する', async ({ page }) => {
  await openStaffPerformance(page);
  const firstTable = await search(page, '2026-01-15', '2026-03-10');
  await expectStaff(firstTable, 'sales-a@example.com', '3,500.00', 3);
  await expectStaff(firstTable, 'sales-b@example.com', '1,500.00', 1);
  await expectStaffOrder(firstTable);

  const secondTable = await search(page, '2026-04-01', '2026-04-30');
  await expectStaff(secondTable, 'sales-a@example.com', '100.00', 1);
  await expectStaff(secondTable, 'sales-b@example.com', '100.00', 1);
  await expectStaffOrder(secondTable);
  await expect(secondTable.getByRole('cell', { name: '3,500.00', exact: true })).toHaveCount(0);
  await expect(secondTable.getByRole('cell', { name: '1,500.00', exact: true })).toHaveCount(0);
});

test('SP-05 期間の両端を含み範囲外を除外する', async ({ page }) => {
  await openStaffPerformance(page);
  const table = await search(page, '2026-01-15', '2026-03-10');

  // 1/14の900と3/11の700を除き、1/15の1000と3/10の1500を含む。
  await expectStaff(table, 'sales-a@example.com', '3,500.00', 3);
  await expectStaff(table, 'sales-b@example.com', '1,500.00', 1);
});

test('SP-06 売上0件の期間では担当者行を作らない', async ({ page }) => {
  await openStaffPerformance(page);
  const table = await search(page, '2026-02-01', '2026-02-28');

  await expect(page.getByText('対象期間の営業実績データはありません。')).toBeVisible();
  await expect(table).toHaveCount(0);
});
