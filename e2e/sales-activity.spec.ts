import { expect, test, type Page } from '@playwright/test';

const customer = {
  id: '8a1f2d44-1234-4abc-8def-123456789abc',
  name: 'E2E営業活動テスト顧客',
  owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
};

const loginAsStaff = async (page: Page) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'e2e-activity-token',
        tokenType: 'Bearer',
        expiresIn: 1800,
        user: { id: customer.owner_user_id, email: 'activity-staff@example.test', role: 'staff' },
      }),
    });
  });
  await page.goto('/');
  await page.getByLabel('メールアドレス').fill('activity-staff@example.test');
  await page.getByLabel('パスワード').fill('e2e-only-activity-password');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page.getByRole('heading', { name: '顧客管理システム' })).toBeVisible();
};

type Activity = {
  id: string;
  customer_id: string;
  user_id: string;
  activity_type: 'visit' | 'meeting';
  visited_at: string | null;
  meeting_note: string | null;
  next_visit_at: string | null;
  created_at: string;
  updated_at: string;
};

const installActivityApi = async (page: Page, activities: Activity[]) => {
  await page.route('**/api/v1/customers', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(customer) });
  });

  await page.route(`**/api/v1/customers/${customer.id}/activities`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activities) });
      return;
    }

    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON() as {
        user_id: string;
        activity_type: 'visit' | 'meeting';
        visited_at?: string;
        meeting_note?: string;
        next_visit_at?: string;
      };
      const now = '2026-09-17T01:00:00.000Z';
      const activity: Activity = {
        id: 'd0a80101-1234-4abc-8def-123456789abc',
        customer_id: customer.id,
        user_id: input.user_id,
        activity_type: input.activity_type,
        visited_at: input.visited_at ?? null,
        meeting_note: input.meeting_note ?? null,
        next_visit_at: input.next_visit_at ?? null,
        created_at: now,
        updated_at: now,
      };
      activities.unshift(activity);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(activity) });
      return;
    }

    await route.fallback();
  });
};

test('顧客詳細から営業活動を登録し、再読み込み後もAPIに保存されている', async ({ page }) => {
  const activities: Activity[] = [];
  await installActivityApi(page, activities);

  await loginAsStaff(page);
  await page.getByLabel('顧客名', { exact: true }).fill(customer.name);
  await page.getByLabel('担当ユーザーID').fill(customer.owner_user_id);
  await page.getByRole('button', { name: '登録する' }).click();

  await expect(page.getByRole('heading', { name: '顧客詳細' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '営業活動履歴' })).toBeVisible();
  await expect(page.getByText('営業活動履歴はありません。')).toBeVisible();

  await page.getByLabel('活動種別').selectOption('visit');
  await page.getByLabel('訪問日時').fill('2026-09-17T10:00');
  await page.getByLabel('商談内容').fill('E2E商談内容');
  await page.getByLabel('次回訪問予定').fill('2026-09-24T10:00');
  await page.getByRole('button', { name: '営業活動を登録' }).click();

  await expect(page.getByText('営業活動を登録しました。')).toBeVisible();
  await expect(page.getByText('E2E商談内容')).toBeVisible();
  await expect(page.getByRole('heading', { name: '訪問' })).toBeVisible();

  await page.reload();
  const persistedActivities = await page.evaluate(async (customerId) => {
    const response = await fetch(`/api/v1/customers/${customerId}/activities`);
    return response.json();
  }, customer.id);

  await expect.poll(() => persistedActivities).toHaveLength(1);
  expect(persistedActivities[0]).toMatchObject({
    activity_type: 'visit',
    meeting_note: 'E2E商談内容',
  });
});

test('営業活動履歴の取得APIエラーを表示する', async ({ page }) => {
  await page.route('**/api/v1/customers', async (route) => {
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(customer) });
  });
  await page.route(`**/api/v1/customers/${customer.id}/activities`, async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: '営業活動履歴を取得できませんでした。' }),
    });
  });

  await loginAsStaff(page);
  await page.getByLabel('顧客名', { exact: true }).fill(customer.name);
  await page.getByLabel('担当ユーザーID').fill(customer.owner_user_id);
  await page.getByRole('button', { name: '登録する' }).click();

  await expect(page.getByRole('alert')).toHaveText('営業活動履歴を取得できませんでした。');
});
