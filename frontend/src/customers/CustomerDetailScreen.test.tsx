import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderAuthenticated } from '../test/render-authenticated';
import { CustomerDetailScreen } from './CustomerDetailScreen';

const customerId = '8a1f2d44-1234-4abc-8def-123456789abc';
const customer = {
  id: customerId,
  name: '株式会社サンプル',
  name_kana: 'カブシキガイシャサンプル',
  email: 'sales@example.com',
  phone: '03-1234-5678',
  address: '東京都千代田区',
  category: '既存顧客',
  owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
  created_at: '2026-09-21T00:00:00.000Z',
  updated_at: '2026-09-21T00:00:00.000Z',
  deleted_at: null,
};

const detailFetch = () => vi.fn().mockImplementation((input: RequestInfo | URL) => {
  const url = String(input);
  return Promise.resolve({
    ok: true,
    json: vi.fn().mockResolvedValue(url.endsWith('/activities') ? [] : customer),
  });
});

describe('CustomerDetailScreen', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows loading while the production detail request is pending', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)));

    renderAuthenticated(<CustomerDetailScreen customerId={customerId} onBack={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('顧客情報を読み込み中...');
  });

  it('shows business fields and Activity history without technical fields', async () => {
    const fetchMock = detailFetch();
    vi.stubGlobal('fetch', fetchMock);

    renderAuthenticated(<CustomerDetailScreen customerId={customerId} onBack={vi.fn()} />);

    expect(await screen.findByText('株式会社サンプル')).toBeInTheDocument();
    expect(screen.getByText('カブシキガイシャサンプル')).toBeInTheDocument();
    expect(screen.getByText('sales@example.com')).toBeInTheDocument();
    expect(screen.getByText('03-1234-5678')).toBeInTheDocument();
    expect(screen.getByText('東京都千代田区')).toBeInTheDocument();
    expect(screen.getByText('既存顧客')).toBeInTheDocument();
    expect(screen.queryByText(customer.owner_user_id)).not.toBeInTheDocument();
    expect(screen.queryByText('論理削除日時')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '営業活動履歴' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['404', { ok: false, json: vi.fn().mockResolvedValue({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer was not found.' }) }, 'Customer was not found.'],
    ['500', { ok: false, json: vi.fn().mockResolvedValue({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve customer.' }) }, 'Failed to retrieve customer.'],
  ])('shows the Backend message for a %s response', async (_, response, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    renderAuthenticated(<CustomerDetailScreen customerId={customerId} onBack={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('shows a network error without replacing it with an authorization message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network request failed.')));

    renderAuthenticated(<CustomerDetailScreen customerId={customerId} onBack={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Network request failed.');
  });

  it('returns through the supplied list navigation operation', () => {
    const onBack = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)));
    renderAuthenticated(<CustomerDetailScreen customerId={customerId} onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: '顧客一覧へ戻る' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('offers the loaded customer to a real edit operation only when allowed', async () => {
    const onEdit = vi.fn();
    vi.stubGlobal('fetch', detailFetch());
    renderAuthenticated(<CustomerDetailScreen customerId={customerId} onBack={vi.fn()} canEdit onEdit={onEdit} />);

    fireEvent.click(await screen.findByRole('button', { name: '編集' }));
    expect(onEdit).toHaveBeenCalledWith(customer);
  });

  it('offers the loaded customer to a real delete operation only when allowed', async () => {
    const onDelete = vi.fn();
    vi.stubGlobal('fetch', detailFetch());
    renderAuthenticated(<CustomerDetailScreen
      customerId={customerId}
      onBack={vi.fn()}
      canDelete
      onDelete={onDelete}
    />);
    fireEvent.click(await screen.findByRole('button', { name: '削除' }));
    expect(onDelete).toHaveBeenCalledWith(customer);
  });
});
