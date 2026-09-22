import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderAuthenticated } from '../test/render-authenticated';
import { CustomerEditScreen } from './CustomerEditScreen';

const customer = {
  id: '8a1f2d44-1234-4abc-8def-123456789abc', name: '株式会社サンプル',
  name_kana: 'カブシキガイシャサンプル', email: 'sales@example.com', phone: '03-1234-5678',
  address: '東京都千代田区', category: 'A', owner_user_id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z', deleted_at: null,
};

describe('CustomerEditScreen', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('shows editable business values without an owner field and PATCHes only changes', async () => {
    const onSaved = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ ...customer, category: null }) });
    vi.stubGlobal('fetch', fetchMock);
    renderAuthenticated(<CustomerEditScreen customer={customer} onCancel={vi.fn()} onSaved={onSaved} />);

    expect(screen.getByLabelText('顧客名')).toHaveValue(customer.name);
    expect(screen.getByLabelText('メールアドレス')).toHaveValue(customer.email);
    expect(screen.queryByLabelText('担当ユーザーID')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('分類'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/v1/customers/${customer.id}`);
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(String(options.body))).toEqual({ category: null });
  });

  it('cancels without an update request', () => {
    const onCancel = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderAuthenticated(<CustomerEditScreen customer={customer} onCancel={onCancel} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows save loading while PATCH is pending', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)));
    renderAuthenticated(<CustomerEditScreen customer={customer} onCancel={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('顧客名'), { target: { value: '更新後' } });
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    expect(screen.getByRole('button', { name: '保存中…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
  });

  it('shows PATCH errors and keeps the authenticated screen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: vi.fn().mockResolvedValue({ code: 'FORBIDDEN', message: 'Forbidden.' }),
    }));
    renderAuthenticated(<CustomerEditScreen customer={customer} onCancel={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('顧客名'), { target: { value: '更新後' } });
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden.');
    expect(screen.getByRole('heading', { name: '顧客情報を編集' })).toBeInTheDocument();
  });
});
