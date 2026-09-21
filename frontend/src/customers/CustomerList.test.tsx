import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { testAuthentication } from '../test/render-authenticated';
import { CustomerList } from './CustomerList';

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

const renderList = (onSelectCustomer = vi.fn()) => render(
  <AuthProvider initialAuthentication={{
    ...testAuthentication,
    user: { ...testAuthentication.user, role: 'staff' },
  }}>
    <CustomerList onBack={vi.fn()} onSelectCustomer={onSelectCustomer} />
  </AuthProvider>,
);

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
});
