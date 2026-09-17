import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders an accessible customer registration form', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '顧客管理システム' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '顧客情報を登録' })).toBeInTheDocument();
    expect(screen.getByLabelText('顧客名')).toHaveAttribute('data-testid', 'customer-name-input');
    expect(screen.getByLabelText('担当ユーザーID')).toHaveAttribute('data-testid', 'owner-user-id-input');
  });

  it('shows validation errors without calling the API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    fireEvent.click(screen.getByTestId('customer-submit-button'));

    expect(screen.getByText('顧客名を入力してください。')).toBeInTheDocument();
    expect(screen.getByText('担当ユーザーIDはUUID形式で入力してください。')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits valid values to the existing customer API and shows success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn() });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    fireEvent.change(screen.getByTestId('customer-name-input'), { target: { value: '株式会社サンプル' } });
    fireEvent.change(screen.getByTestId('owner-user-id-input'), { target: { value: 'c0a80101-1234-4abc-8def-123456789abc' } });
    fireEvent.change(screen.getByTestId('customer-email-input'), { target: { value: 'sales@example.com' } });
    fireEvent.click(screen.getByTestId('customer-submit-button'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '株式会社サンプル',
        owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
        email: 'sales@example.com',
      }),
    });
    expect(await screen.findByTestId('customer-registration-success')).toHaveTextContent('顧客情報を登録しました。');
  });

  it('shows the API error message when registration fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ code: 'VALIDATION_ERROR', message: 'email must be a valid email address.' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    fireEvent.change(screen.getByTestId('customer-name-input'), { target: { value: '株式会社サンプル' } });
    fireEvent.change(screen.getByTestId('owner-user-id-input'), { target: { value: 'c0a80101-1234-4abc-8def-123456789abc' } });
    fireEvent.click(screen.getByTestId('customer-submit-button'));

    expect(await screen.findByTestId('customer-registration-error')).toHaveTextContent('email must be a valid email address.');
  });
});
