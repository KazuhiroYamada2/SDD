import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { testAuthentication } from '../test/render-authenticated';
import {
  CustomerList,
  initialCustomerListState,
  type CustomerListState,
} from './CustomerList';

const customer = {
  id: '8a1f2d44-1234-4abc-8def-123456789abc',
  name: '株式会社サンプル',
  name_kana: null,
  email: null,
  phone: null,
  address: null,
  category: '重点顧客',
  owner_user_id: 'other-owner-id',
  created_at: '2026-09-21T00:00:00.000Z',
  updated_at: '2026-09-21T00:00:00.000Z',
  deleted_at: null,
};

const renderList = (
  onSelectCustomer = vi.fn(),
  initialState: Partial<CustomerListState> = {},
) => {
  function Harness() {
    const [listState, setListState] = useState<CustomerListState>({
      ...initialCustomerListState,
      ...initialState,
    });
    return <CustomerList
      onBack={vi.fn()}
      onSelectCustomer={onSelectCustomer}
      listState={listState}
      setListState={setListState}
    />;
  }

  return render(
    <AuthProvider initialAuthentication={{
      ...testAuthentication,
      user: { ...testAuthentication.user, role: 'staff' },
    }}>
      <Harness />
    </AuthProvider>,
  );
};

describe('CustomerList', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows returned names and categories without filtering by owner in the Frontend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [customer], page: 1, page_size: 20, total_count: 1, total_pages: 1,
      }),
    }));

    renderList();

    expect(await screen.findByRole('table', { name: '顧客一覧' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '株式会社サンプル' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '重点顧客' })).toBeInTheDocument();
    expect(screen.queryByText('other-owner-id')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/owner/i)).not.toBeInTheDocument();
  });

  it('uses the selected customer ID for the real detail operation', async () => {
    const onSelectCustomer = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [customer], page: 1, page_size: 20, total_count: 1, total_pages: 1,
      }),
    }));
    renderList(onSelectCustomer);

    fireEvent.click(await screen.findByRole('button', { name: '株式会社サンプルの詳細を表示' }));

    expect(onSelectCustomer).toHaveBeenCalledWith(customer.id);
  });

  it('shows loading while the list request is pending', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)));

    renderList();

    expect(screen.getByRole('status')).toHaveTextContent('顧客一覧を読み込み中...');
  });

  it('shows the normal empty state for an empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [], page: 1, page_size: 20, total_count: 0, total_pages: 0,
      }),
    }));

    renderList();

    expect(await screen.findByText('該当する顧客がありません。')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the existing API error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ code: 'INTERNAL_SERVER_ERROR', message: '顧客一覧を取得できませんでした。' }),
    }));

    renderList();

    expect(await screen.findByRole('alert')).toHaveTextContent('顧客一覧を取得できませんでした。');
  });

  it('applies trimmed query and category only on Search and resets page to 1', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [customer], page: 1, page_size: 20, total_count: 1, total_pages: 1,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    renderList(vi.fn(), { page: 3 });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('顧客名'), { target: { value: '  サンプル  ' } });
    fireEvent.change(screen.getByLabelText('分類'), { target: { value: '  重点顧客  ' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '検索' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const url = fetchMock.mock.calls[1]?.[0] as string;
    const parameters = new URLSearchParams(url.split('?')[1]);
    expect(parameters.get('page')).toBe('1');
    expect(parameters.get('query')).toBe('サンプル');
    expect(parameters.get('category')).toBe('重点顧客');
    expect(parameters.has('owner_user_id')).toBe(false);
  });

  it('resets page to 1 when sort or page size changes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [customer], page: 1, page_size: 20, total_count: 1, total_pages: 1,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    renderList(vi.fn(), { page: 2 });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('並び順'), { target: { value: 'created_at_desc' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    let parameters = new URLSearchParams((fetchMock.mock.calls[1]?.[0] as string).split('?')[1]);
    expect(parameters.get('page')).toBe('1');
    expect(parameters.get('sort')).toBe('created_at_desc');

    fireEvent.change(screen.getByLabelText('表示件数'), { target: { value: '50' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    parameters = new URLSearchParams((fetchMock.mock.calls[2]?.[0] as string).split('?')[1]);
    expect(parameters.get('page')).toBe('1');
    expect(parameters.get('page_size')).toBe('50');
    expect(parameters.get('sort')).toBe('created_at_desc');
  });

  it('moves forward and back while preserving applied conditions', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const parameters = new URL(url, 'https://example.test').searchParams;
      const page = Number(parameters.get('page'));
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({
          items: [customer], page, page_size: 50, total_count: 120, total_pages: 3,
        }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderList(vi.fn(), {
      queryInput: 'Sample',
      categoryInput: 'A',
      appliedQuery: 'Sample',
      appliedCategory: 'A',
      sort: 'name_desc',
      pageSize: 50,
    });

    expect(await screen.findByLabelText('現在のページ')).toHaveTextContent('1 / 3ページ');
    expect(screen.getByRole('button', { name: '前へ' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(await screen.findByLabelText('現在のページ')).toHaveTextContent('2 / 3ページ');

    let parameters = new URLSearchParams((fetchMock.mock.calls[1]?.[0] as string).split('?')[1]);
    expect(Object.fromEntries(parameters)).toMatchObject({
      page: '2', page_size: '50', query: 'Sample', category: 'A', sort: 'name_desc',
    });
    expect(screen.getByRole('button', { name: '前へ' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '前へ' }));
    expect(await screen.findByLabelText('現在のページ')).toHaveTextContent('1 / 3ページ');
    parameters = new URLSearchParams((fetchMock.mock.calls[2]?.[0] as string).split('?')[1]);
    expect(Object.fromEntries(parameters)).toMatchObject({
      page: '1', page_size: '50', query: 'Sample', category: 'A', sort: 'name_desc',
    });
  });

  it('disables Next on the last page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [customer], page: 3, page_size: 20, total_count: 41, total_pages: 3,
      }),
    }));
    renderList(vi.fn(), { page: 3 });

    expect(await screen.findByLabelText('現在のページ')).toHaveTextContent('3 / 3ページ');
    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled();
  });
});
