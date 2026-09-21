import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { loginAsE2EUser, loginAsE2EUserViaUi } from '../auth/login-helper';
import { e2eAdmin, e2eStaff } from '../fixtures/auth-users.mjs';

const authorization = (token: string) => ({ Authorization: `Bearer ${token}` });

async function openCustomerList(page: Page) {
  await page.getByRole('button', { name: '顧客一覧', exact: true }).click();
  await expect(page.getByRole('heading', { name: '顧客一覧', exact: true })).toBeVisible();
}

async function search(page: Page, query: string, category: string) {
  await page.getByLabel('顧客名', { exact: true }).fill(query);
  await page.getByLabel('分類', { exact: true }).fill(category);
  await page.getByRole('button', { name: '検索', exact: true }).click();
}

async function waitForCustomerList(page: Page, expected: Record<string, string>) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === '/api/v1/customers' &&
      Object.entries(expected).every(([key, value]) => url.searchParams.get(key) === value);
  });
}

async function expectSuccessfulCustomerList(response: Promise<import('@playwright/test').Response>) {
  expect([200, 304]).toContain((await response).status());
}

async function createPaginationCustomers(request: APIRequestContext, token: string) {
  const headers = authorization(token);
  const ids: string[] = [];
  for (let index = 1; index <= 21; index += 1) {
    const suffix = String(index).padStart(2, '0');
    const response = await request.post('/api/v1/customers', {
      headers,
      data: {
        name: `T207 Page Fixture ${suffix}`,
        owner_user_id: e2eStaff.id,
        category: 'T207Page',
      },
    });
    expect(response.status()).toBe(201);
    ids.push((await response.json() as { id: string }).id);
  }
  return ids;
}

async function deleteCustomers(request: APIRequestContext, token: string, ids: string[]) {
  const headers = authorization(token);
  for (const id of ids) {
    const response = await request.delete(`/api/v1/customers/${id}`, { headers });
    expect(response.status()).toBe(204);
  }
}

test('Customer list, search, filter, and all four sorts follow the T-205 UI contract', async ({ page }) => {
  await loginAsE2EUserViaUi(page, e2eAdmin);
  await openCustomerList(page);

  await expect(page.getByRole('table', { name: '顧客一覧' })).toBeVisible();
  await expect(page.getByText('1 / 1ページ（全5件）')).toBeVisible();
  await expect(page.getByRole('button', { name: 'D1の詳細を表示' })).toHaveCount(0);

  const filtered = waitForCustomerList(page, { page: '1', query: 'A', category: 'A', sort: 'name_asc' });
  await search(page, ' A ', ' A ');
  await expectSuccessfulCustomerList(filtered);
  await expect(page.getByText('1 / 1ページ（全2件）')).toBeVisible();
  await expect(page.getByRole('button', { name: 'A1の詳細を表示' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'A2の詳細を表示' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'B1の詳細を表示' })).toHaveCount(0);

  for (const sort of ['name_desc', 'created_at_asc', 'created_at_desc', 'name_asc']) {
    const response = waitForCustomerList(page, { page: '1', query: 'A', category: 'A', sort });
    await page.getByLabel('並び順').selectOption(sort);
    await expectSuccessfulCustomerList(response);
    await expect(page.getByText('1 / 1ページ（全2件）')).toBeVisible();
  }

  await page.getByLabel('並び順').selectOption('name_desc');
  const rows = page.getByRole('table', { name: '顧客一覧' }).getByRole('row');
  await expect(rows.nth(1)).toContainText('A2');
  await expect(rows.nth(2)).toContainText('A1');
});

test('pagination resets and preserves search state across page movement and Detail round-trip', async ({ page, request }) => {
  const { accessToken } = await loginAsE2EUser(request, e2eAdmin);
  const createdIds = await createPaginationCustomers(request, accessToken);
  try {
    await loginAsE2EUserViaUi(page, e2eAdmin);
    await openCustomerList(page);

    const firstPage = waitForCustomerList(page, {
      page: '1', page_size: '20', query: 'T207 Page Fixture', category: 'T207Page', sort: 'name_asc',
    });
    await search(page, 'T207 Page Fixture', 'T207Page');
    await expectSuccessfulCustomerList(firstPage);
    await expect(page.getByText('1 / 2ページ（全21件）')).toBeVisible();
    await expect(page.getByRole('button', { name: '前へ' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '次へ' })).toBeEnabled();

    const secondPage = waitForCustomerList(page, {
      page: '2', page_size: '20', query: 'T207 Page Fixture', category: 'T207Page', sort: 'name_asc',
    });
    await page.getByRole('button', { name: '次へ' }).click();
    await expectSuccessfulCustomerList(secondPage);
    await expect(page.getByText('2 / 2ページ（全21件）')).toBeVisible();
    await expect(page.getByRole('button', { name: 'T207 Page Fixture 21の詳細を表示' })).toBeVisible();

    await page.getByRole('button', { name: 'T207 Page Fixture 21の詳細を表示' }).click();
    await expect(page.getByRole('heading', { name: '顧客詳細', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '顧客一覧へ戻る' }).click();
    await expect(page.getByText('2 / 2ページ（全21件）')).toBeVisible();
    await expect(page.getByLabel('顧客名', { exact: true })).toHaveValue('T207 Page Fixture');
    await expect(page.getByLabel('分類', { exact: true })).toHaveValue('T207Page');

    const searchReset = waitForCustomerList(page, { page: '1', page_size: '20', sort: 'name_asc' });
    await page.getByRole('button', { name: '検索', exact: true }).click();
    await expectSuccessfulCustomerList(searchReset);
    await expect(page.getByText('1 / 2ページ（全21件）')).toBeVisible();

    const secondPageAgain = waitForCustomerList(page, { page: '2', page_size: '20', sort: 'name_asc' });
    await page.getByRole('button', { name: '次へ' }).click();
    await expectSuccessfulCustomerList(secondPageAgain);
    const previousPage = waitForCustomerList(page, { page: '1', page_size: '20' });
    await page.getByRole('button', { name: '前へ' }).click();
    await expectSuccessfulCustomerList(previousPage);
    await expect(page.getByText('1 / 2ページ（全21件）')).toBeVisible();

    const secondPageBeforeSort = waitForCustomerList(page, { page: '2', page_size: '20', sort: 'name_asc' });
    await page.getByRole('button', { name: '次へ' }).click();
    await expectSuccessfulCustomerList(secondPageBeforeSort);
    const sortReset = waitForCustomerList(page, { page: '1', page_size: '20', sort: 'name_desc' });
    await page.getByLabel('並び順').selectOption('name_desc');
    await expectSuccessfulCustomerList(sortReset);
    await expect(page.getByText('1 / 2ページ（全21件）')).toBeVisible();

    const secondPageBeforeSize = waitForCustomerList(page, { page: '2', page_size: '20', sort: 'name_desc' });
    await page.getByRole('button', { name: '次へ' }).click();
    await expectSuccessfulCustomerList(secondPageBeforeSize);
    const pageSize50 = waitForCustomerList(page, { page: '1', page_size: '50' });
    await page.getByLabel('表示件数').selectOption('50');
    await expectSuccessfulCustomerList(pageSize50);
    await expect(page.getByText('1 / 1ページ（全21件）')).toBeVisible();

    const pageSize100 = waitForCustomerList(page, { page: '1', page_size: '100' });
    await page.getByLabel('表示件数').selectOption('100');
    await expectSuccessfulCustomerList(pageSize100);
    await expect(page.getByText('1 / 1ページ（全21件）')).toBeVisible();
  } finally {
    await deleteCustomers(request, accessToken, createdIds);
  }
});

test('admin completes create, detail, edit, search, and logical delete as one business flow', async ({ page }, testInfo) => {
  const suffix = testInfo.project.name;
  const originalName = `T207 CRUD ${suffix}`;
  const updatedName = `T207 Updated ${suffix}`;

  await loginAsE2EUserViaUi(page, e2eAdmin);
  await openCustomerList(page);
  await expect(page.getByRole('table', { name: '顧客一覧' })).toBeVisible();
  await page.getByRole('button', { name: '顧客登録画面に戻る' }).click();

  await page.getByLabel('顧客名', { exact: true }).fill(originalName);
  await page.getByLabel('担当ユーザーID').fill(e2eStaff.id);
  await page.getByLabel('メールアドレス').fill(`t207-${suffix}@example.test`);
  await page.getByLabel('分類', { exact: true }).fill('T207Create');
  const createResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/customers');
  await page.getByRole('button', { name: '登録する' }).click();
  expect((await createResponse).status()).toBe(201);
  await expect(page.getByRole('heading', { name: '顧客詳細', exact: true })).toBeVisible();
  await expect(page.getByText(originalName, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '顧客登録画面に戻る' }).click();
  await openCustomerList(page);
  await search(page, originalName, 'T207Create');
  await page.getByRole('button', { name: `${originalName}の詳細を表示` }).click();
  await expect(page.getByRole('heading', { name: '顧客詳細', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '編集', exact: true }).click();
  await expect(page.getByRole('heading', { name: '顧客情報を編集', exact: true })).toBeVisible();
  await page.getByLabel('顧客名', { exact: true }).fill(updatedName);
  await page.getByLabel('分類', { exact: true }).fill('T207Updated');
  const updateResponse = page.waitForResponse((response) => response.request().method() === 'PATCH');
  await page.getByRole('button', { name: '保存する' }).click();
  expect((await updateResponse).status()).toBe(200);
  await expect(page.getByRole('heading', { name: '顧客詳細', exact: true })).toBeVisible();
  await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
  await expect(page.getByText('T207Updated', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '顧客一覧へ戻る' }).click();
  await search(page, updatedName, 'T207Updated');
  await expect(page.getByRole('button', { name: `${updatedName}の詳細を表示` })).toBeVisible();
  await page.getByRole('button', { name: `${updatedName}の詳細を表示` }).click();
  await page.getByRole('button', { name: '削除', exact: true }).click();
  await expect(page.getByRole('heading', { name: '顧客を削除', exact: true })).toBeVisible();
  const deleteResponse = page.waitForResponse((response) => response.request().method() === 'DELETE');
  await page.getByRole('button', { name: '削除する', exact: true }).click();
  expect((await deleteResponse).status()).toBe(204);
  await expect(page.getByText('該当する顧客がありません。')).toBeVisible();
  await expect(page.getByRole('button', { name: `${updatedName}の詳細を表示` })).toHaveCount(0);
});
