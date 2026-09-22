import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderAuthenticated } from '../test/render-authenticated';
import { CustomerDeleteConfirmation } from './CustomerDeleteConfirmation';

const customer = {
  id: '8a1f2d44-1234-4abc-8def-123456789abc', name: '株式会社サンプル',
  name_kana: null, email: null, phone: null, address: null, category: null,
  owner_user_id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z', deleted_at: null,
};

describe('CustomerDeleteConfirmation', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('confirms with DELETE and reports successful completion', async () => {
    const onDeleted = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    renderAuthenticated(<CustomerDeleteConfirmation customer={customer} onCancel={vi.fn()} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(`/api/v1/customers/${customer.id}`, expect.objectContaining({
      method: 'DELETE',
      headers: expect.any(Headers),
    }));
  });

  it('cancels without DELETE', () => {
    const onCancel = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderAuthenticated(<CustomerDeleteConfirmation customer={customer} onCancel={onCancel} onDeleted={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows API errors and keeps the authenticated confirmation screen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 403,
      clone: () => ({ json: vi.fn().mockResolvedValue({ code: 'FORBIDDEN', message: 'Forbidden.' }) }),
      json: vi.fn().mockResolvedValue({ code: 'FORBIDDEN', message: 'Forbidden.' }),
    }));
    renderAuthenticated(<CustomerDeleteConfirmation customer={customer} onCancel={vi.fn()} onDeleted={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden.');
    expect(screen.getByRole('heading', { name: '顧客を削除' })).toBeInTheDocument();
  });
});
