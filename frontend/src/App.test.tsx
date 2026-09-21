import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { login } from './api/auth';
import type { UserRole } from './auth/auth-types';

vi.mock('./api/auth', async (importOriginal) => ({
  ...await importOriginal<typeof import('./api/auth')>(),
  login: vi.fn(),
}));

const loginMock = vi.mocked(login);
const renderLoggedInApp = async (role: UserRole = 'admin') => {
  loginMock.mockResolvedValue({
    accessToken: 'test-access-token', tokenType: 'Bearer', expiresIn: 1800,
    user: { id: 'test-user-id', email: 'user@example.test', role },
  });
  render(<App />);
  fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'user@example.test' } });
  fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'test-only-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));
  await screen.findByRole('heading', { name: '顧客管理システム' });
};

const submitCustomer = () => {
  fireEvent.change(screen.getByTestId('customer-name-input'), { target: { value: '株式会社サンプル' } });
  fireEvent.change(screen.getByTestId('owner-user-id-input'), { target: { value: 'c0a80101-1234-4abc-8def-123456789abc' } });
  fireEvent.click(screen.getByTestId('customer-submit-button'));
};

const customer = {
  id: '8a1f2d44-1234-4abc-8def-123456789abc',
  name: '株式会社サンプル',
  owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
};

const customerRead = {
  ...customer,
  name_kana: 'カブシキガイシャサンプル',
  email: 'sales@example.com',
  phone: '03-1234-5678',
  address: '東京都千代田区',
  category: 'A',
  created_at: '2026-09-21T00:00:00.000Z',
  updated_at: '2026-09-21T00:00:00.000Z',
  deleted_at: null,
};

const customerListResponse = {
  items: [customerRead],
  page: 1,
  page_size: 20,
  total_count: 1,
  total_pages: 1,
};

const authenticationRequired = () => new Response(JSON.stringify({
  code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.',
}), { status: 401, headers: { 'Content-Type': 'application/json' } });

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('starts with Login and renders customer registration after Login', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    cleanup();
    await renderLoggedInApp();

    expect(screen.getByRole('heading', { name: '顧客管理システム' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '顧客情報を登録' })).toBeInTheDocument();
    expect(screen.getByLabelText('顧客名')).toHaveAttribute('data-testid', 'customer-name-input');
    expect(screen.getByLabelText('担当ユーザーID')).toHaveAttribute('data-testid', 'owner-user-id-input');
  });

  it.each<UserRole>(['staff', 'manager', 'admin'])('shows the Customer list entry for %s', async (role) => {
    await renderLoggedInApp(role);

    expect(screen.getByRole('button', { name: '顧客一覧' })).toBeInTheDocument();
  });

  it('hides Customer registration from manager while keeping read navigation', async () => {
    await renderLoggedInApp('manager');

    expect(screen.queryByRole('heading', { name: '顧客情報を登録' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('customer-registration-form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '顧客一覧' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'レポート' })).toBeInTheDocument();
  });

  it.each<UserRole>(['staff', 'admin'])('keeps Customer registration available for %s', async (role) => {
    await renderLoggedInApp(role);

    expect(screen.getByRole('heading', { name: '顧客情報を登録' })).toBeInTheDocument();
    expect(screen.getByTestId('customer-registration-form')).toBeInTheDocument();
  });

  it('switches to the Customer list and returns to the unchanged registration screen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [{
          id: '8a1f2d44-1234-4abc-8def-123456789abc', name: '株式会社サンプル', name_kana: null,
          email: null, phone: null, address: null, category: 'A',
          owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
          created_at: '2026-09-21T00:00:00.000Z', updated_at: '2026-09-21T00:00:00.000Z', deleted_at: null,
        }],
        page: 1, page_size: 20, total_count: 1, total_pages: 1,
      }),
    }));
    await renderLoggedInApp('staff');

    fireEvent.click(screen.getByRole('button', { name: '顧客一覧' }));
    expect(await screen.findByRole('cell', { name: '株式会社サンプル' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '顧客登録画面に戻る' }));
    expect(screen.getByRole('heading', { name: '顧客情報を登録' })).toBeInTheDocument();
  });

  it('keeps authentication when the Customer list receives a 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ code: 'FORBIDDEN', message: 'Forbidden.' }),
    }));
    await renderLoggedInApp('staff');

    fireEvent.click(screen.getByRole('button', { name: '顧客一覧' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden.');
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ログイン' })).not.toBeInTheDocument();
  });

  it('navigates list to production detail by ID and returns to a refetched list', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/v1/customers?')) {
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(customerListResponse) });
      }
      if (url === `/api/v1/customers/${customerRead.id}`) {
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(customerRead) });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    await renderLoggedInApp('staff');

    fireEvent.click(screen.getByRole('button', { name: '顧客一覧' }));
    fireEvent.click(await screen.findByRole('button', { name: '株式会社サンプルの詳細を表示' }));

    expect(await screen.findByText('sales@example.com')).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/customers?page=1&page_size=20&sort=name_asc',
      `/api/v1/customers/${customerRead.id}`,
    ]);

    fireEvent.click(screen.getByRole('button', { name: '顧客一覧へ戻る' }));
    expect(await screen.findByRole('button', { name: '株式会社サンプルの詳細を表示' })).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/customers?page=1&page_size=20&sort=name_asc',
      `/api/v1/customers/${customerRead.id}`,
      '/api/v1/customers?page=1&page_size=20&sort=name_asc',
    ]);
  });

  it('preserves search, sort, page size, and page across a detail round trip', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === `/api/v1/customers/${customerRead.id}`) {
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(customerRead) });
      }
      const parameters = new URL(url, 'https://example.test').searchParams;
      const page = Number(parameters.get('page'));
      const pageSize = Number(parameters.get('page_size'));
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ...customerListResponse,
          page,
          page_size: pageSize,
          total_count: 60,
          total_pages: 2,
        }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    await renderLoggedInApp('staff');

    fireEvent.click(screen.getByRole('button', { name: '顧客一覧' }));
    await screen.findByRole('button', { name: '株式会社サンプルの詳細を表示' });
    fireEvent.change(screen.getByLabelText('顧客名'), { target: { value: 'Sample' } });
    fireEvent.change(screen.getByLabelText('分類'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: '検索' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText('並び順'), { target: { value: 'created_at_desc' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    fireEvent.change(screen.getByLabelText('表示件数'), { target: { value: '50' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(await screen.findByLabelText('現在のページ')).toHaveTextContent('2 / 2ページ');

    fireEvent.click(screen.getByRole('button', { name: '株式会社サンプルの詳細を表示' }));
    expect(await screen.findByText('sales@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '顧客一覧へ戻る' }));

    expect(await screen.findByLabelText('現在のページ')).toHaveTextContent('2 / 2ページ');
    expect(screen.getByLabelText('顧客名')).toHaveValue('Sample');
    expect(screen.getByLabelText('分類')).toHaveValue('A');
    expect(screen.getByLabelText('並び順')).toHaveValue('created_at_desc');
    expect(screen.getByLabelText('表示件数')).toHaveValue('50');
    const lastListUrl = [...fetchMock.mock.calls]
      .reverse()
      .map(([url]) => String(url))
      .find((url) => url.includes('/api/v1/customers?'))!;
    expect(Object.fromEntries(new URL(lastListUrl, 'https://example.test').searchParams)).toMatchObject({
      page: '2', page_size: '50', query: 'Sample', category: 'A', sort: 'created_at_desc',
    });
  });

  it.each<UserRole>(['manager', 'admin'])('lets %s navigate from the list to Customer detail', async (role) => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(customerListResponse) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(customerRead) }));
    await renderLoggedInApp(role);

    fireEvent.click(screen.getByRole('button', { name: '顧客一覧' }));
    fireEvent.click(await screen.findByRole('button', { name: '株式会社サンプルの詳細を表示' }));

    expect(await screen.findByText('sales@example.com')).toBeInTheDocument();
  });

  it.each<UserRole>(['staff', 'admin'])('lets %s edit a customer and refetch detail after save', async (role) => {
    const updated = { ...customerRead, name: '更新後顧客' };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/v1/customers?')) return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(customerListResponse) });
      if (url === `/api/v1/customers/${customerRead.id}` && options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(updated) });
      }
      if (url === `/api/v1/customers/${customerRead.id}`) {
        const detailCalls = fetchMock.mock.calls.filter(([calledUrl, calledOptions]) =>
          String(calledUrl) === url && (calledOptions as RequestInit | undefined)?.method !== 'PATCH').length;
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(detailCalls > 1 ? updated : customerRead) });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    await renderLoggedInApp(role);

    fireEvent.click(screen.getByRole('button', { name: '顧客一覧' }));
    fireEvent.click(await screen.findByRole('button', { name: '株式会社サンプルの詳細を表示' }));
    fireEvent.click(await screen.findByRole('button', { name: '編集' }));
    expect(screen.getByRole('heading', { name: '顧客情報を編集' })).toBeInTheDocument();
    expect(screen.queryByLabelText('担当ユーザーID')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('顧客名'), { target: { value: '更新後顧客' } });
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    expect(await screen.findByText('更新後顧客')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url, options]) =>
      String(url) === `/api/v1/customers/${customerRead.id}` && (options as RequestInit | undefined)?.method === 'PATCH')).toBe(true);
  });

  it('does not show Customer edit to manager', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(customerListResponse) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(customerRead) }));
    await renderLoggedInApp('manager');
    fireEvent.click(screen.getByRole('button', { name: '顧客一覧' }));
    fireEvent.click(await screen.findByRole('button', { name: '株式会社サンプルの詳細を表示' }));
    await screen.findByText('sales@example.com');
    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
  });

  it.each<UserRole>(['staff', 'manager'])('does not show Customer delete to %s', async (role) => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(customerListResponse) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(customerRead) }));
    await renderLoggedInApp(role);
    fireEvent.click(screen.getByRole('button', { name: '顧客一覧' }));
    fireEvent.click(await screen.findByRole('button', { name: '株式会社サンプルの詳細を表示' }));
    await screen.findByText('sales@example.com');
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
  });

  it('lets admin confirm deletion and returns to the Customer list after 204', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/v1/customers?')) {
        const listCalls = fetchMock.mock.calls.filter(([called]) => String(called).startsWith('/api/v1/customers?')).length;
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(listCalls > 1
          ? { ...customerListResponse, items: [], total_count: 0, total_pages: 0 }
          : customerListResponse) });
      }
      if (url === `/api/v1/customers/${customerRead.id}` && options?.method === 'DELETE') {
        return Promise.resolve({ status: 204 });
      }
      if (url === `/api/v1/customers/${customerRead.id}`) {
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(customerRead) });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    await renderLoggedInApp('admin');
    fireEvent.click(screen.getByRole('button', { name: '顧客一覧' }));
    fireEvent.click(await screen.findByRole('button', { name: '株式会社サンプルの詳細を表示' }));
    fireEvent.click(await screen.findByRole('button', { name: '削除' }));
    expect(screen.getByRole('heading', { name: '顧客を削除' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));
    expect(await screen.findByText('該当する顧客がありません。')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url, options]) =>
      String(url) === `/api/v1/customers/${customerRead.id}` && (options as RequestInit | undefined)?.method === 'DELETE')).toBe(true);
  });

  it('keeps authentication and the Backend message for a Customer detail 404', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(customerListResponse) })
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer was not found.' }),
      }));
    await renderLoggedInApp('staff');

    fireEvent.click(screen.getByRole('button', { name: '顧客一覧' }));
    fireEvent.click(await screen.findByRole('button', { name: '株式会社サンプルの詳細を表示' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Customer was not found.');
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ログイン' })).not.toBeInTheDocument();
  });

  it('returns to Login through the common flow for a Customer detail Authentication 401', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(customerListResponse) })
      .mockResolvedValueOnce(authenticationRequired()));
    await renderLoggedInApp('staff');

    fireEvent.click(screen.getByRole('button', { name: '顧客一覧' }));
    fireEvent.click(await screen.findByRole('button', { name: '株式会社サンプルの詳細を表示' }));

    expect(await screen.findByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('再度ログインしてください。');
  });

  it('switches to the report screen and returns to the customer registration screen', async () => {
    await renderLoggedInApp();

    fireEvent.click(screen.getByRole('button', { name: 'レポート' }));
    expect(screen.getByRole('heading', { name: 'レポート' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '顧客登録画面に戻る' }));
    expect(screen.getByRole('heading', { name: '顧客管理システム' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '顧客情報を登録' })).toBeInTheDocument();
  });

  it('does not render the Reports entry or screen or call a Reports API for staff', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await renderLoggedInApp('staff');

    expect(screen.queryByRole('button', { name: 'レポート' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'レポート' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '顧客情報を登録' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets admin open the Reports screen', async () => {
    await renderLoggedInApp('admin');

    fireEvent.click(screen.getByRole('button', { name: 'レポート' }));

    expect(screen.getByRole('heading', { name: 'レポート' })).toBeInTheDocument();
  });

  it('shows validation errors without calling the business API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await renderLoggedInApp();

    fireEvent.click(screen.getByTestId('customer-submit-button'));

    expect(screen.getByText('顧客名を入力してください。')).toBeInTheDocument();
    expect(screen.getByText('担当ユーザーIDはUUID形式で入力してください。')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits valid values with Bearer to the existing customer API and shows success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: '8a1f2d44-1234-4abc-8def-123456789abc',
          name: '株式会社サンプル',
          owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([]) });
    vi.stubGlobal('fetch', fetchMock);
    await renderLoggedInApp();

    fireEvent.change(screen.getByTestId('customer-name-input'), { target: { value: '株式会社サンプル' } });
    fireEvent.change(screen.getByTestId('owner-user-id-input'), { target: { value: 'c0a80101-1234-4abc-8def-123456789abc' } });
    fireEvent.change(screen.getByTestId('customer-email-input'), { target: { value: 'sales@example.com' } });
    fireEvent.click(screen.getByTestId('customer-submit-button'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/customers');
    expect(options.method).toBe('POST');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-access-token');
    expect(new Headers(options.headers).get('Content-Type')).toBe('application/json');
    expect(options.body).toBe(JSON.stringify({
        name: '株式会社サンプル',
        owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
        email: 'sales@example.com',
      }));
    expect(await screen.findByRole('heading', { name: '顧客詳細' })).toBeInTheDocument();
  });

  it('shows the API error message when registration fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ code: 'VALIDATION_ERROR', message: 'email must be a valid email address.' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await renderLoggedInApp();

    fireEvent.change(screen.getByTestId('customer-name-input'), { target: { value: '株式会社サンプル' } });
    fireEvent.change(screen.getByTestId('owner-user-id-input'), { target: { value: 'c0a80101-1234-4abc-8def-123456789abc' } });
    fireEvent.click(screen.getByTestId('customer-submit-button'));

    expect(await screen.findByTestId('customer-registration-error')).toHaveTextContent('email must be a valid email address.');
  });

  it('logs out from the business screen without calling a Backend logout API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await renderLoggedInApp();
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '顧客管理システム' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers Logout from the report screen and returns to the original screen after another Login', async () => {
    await renderLoggedInApp();
    fireEvent.click(screen.getByRole('button', { name: 'レポート' }));
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'user@example.test' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'test-only-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(await screen.findByRole('heading', { name: '顧客管理システム' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'レポート' })).not.toBeInTheDocument();
  });

  it('returns to Login when the Provider is recreated after a browser reload', async () => {
    await renderLoggedInApp();
    cleanup();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '顧客管理システム' })).not.toBeInTheDocument();
  });

  it('returns to Login with one common notice for a customer Authentication 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(authenticationRequired()));
    await renderLoggedInApp();
    submitCustomer();
    expect(await screen.findByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('認証の有効期限が切れたか、認証状態が無効です。再度ログインしてください。');
    expect(screen.queryByRole('button', { name: 'ログアウト' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'user@example.test' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'test-only-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(await screen.findByRole('heading', { name: '顧客管理システム' })).toBeInTheDocument();
    expect(screen.queryByText('認証の有効期限が切れたか、認証状態が無効です。再度ログインしてください。')).not.toBeInTheDocument();
  });

  it('returns to Login when activity history receives an Authentication 401', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(customer) })
      .mockResolvedValueOnce(authenticationRequired()));
    await renderLoggedInApp();
    submitCustomer();
    expect(await screen.findByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('再度ログインしてください。');
  });

  it('returns to Login when activity registration receives an Authentication 401', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(customer) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([]) })
      .mockResolvedValueOnce(authenticationRequired()));
    await renderLoggedInApp();
    submitCustomer();
    await screen.findByText('営業活動履歴はありません。');
    fireEvent.click(screen.getByRole('button', { name: '営業活動を登録' }));
    expect(await screen.findByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('再度ログインしてください。');
  });

  it.each(['売上推移', '顧客分類', '営業担当者別実績'])('returns to Login for an Authentication 401 from %s', async (report) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(authenticationRequired()));
    await renderLoggedInApp();
    fireEvent.click(screen.getByRole('button', { name: 'レポート' }));
    if (report !== '売上推移') fireEvent.click(screen.getByRole('button', { name: report }));
    if (report !== '顧客分類') {
      fireEvent.change(screen.getByLabelText('開始日'), { target: { value: '2026-01-01' } });
      fireEvent.change(screen.getByLabelText('終了日'), { target: { value: '2026-03-31' } });
      fireEvent.click(screen.getByRole('button', { name: '表示' }));
    }
    expect(await screen.findByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('再度ログインしてください。');
  });

  it.each([400, 403, 404, 500, 503])('keeps authentication for a customer HTTP %i', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'BUSINESS_ERROR', message: 'Business request failed.',
    }), { status, headers: { 'Content-Type': 'application/json' } })));
    await renderLoggedInApp();
    submitCustomer();
    expect(await screen.findByTestId('customer-registration-error')).toHaveTextContent('Business request failed.');
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ログイン' })).not.toBeInTheDocument();
  });

  it('keeps authentication on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network request failed.')));
    await renderLoggedInApp();
    submitCustomer();
    expect(await screen.findByTestId('customer-registration-error')).toHaveTextContent('Network request failed.');
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
  });
});
