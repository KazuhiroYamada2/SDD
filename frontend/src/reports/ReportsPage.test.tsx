import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReportsPage } from './ReportsPage';

const salesTrend = {
  from: '2026-01-15',
  to: '2026-03-10',
  items: [
    { month: '2026-01', salesAmount: '1200000.00' },
    { month: '2026-02', salesAmount: '0.00' },
    { month: '2026-03', salesAmount: '850000.00' },
  ],
};

const fillPeriod = () => {
  fireEvent.change(screen.getByLabelText('開始日'), { target: { value: '2026-01-15' } });
  fireEvent.change(screen.getByLabelText('終了日'), { target: { value: '2026-03-10' } });
};

describe('ReportsPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the report screen with accessible sales trend controls', () => {
    render(<ReportsPage onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'レポート' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '売上推移' })).toBeInTheDocument();
    expect(screen.getByLabelText('開始日')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('終了日')).toHaveAttribute('type', 'date');
    expect(screen.getByRole('button', { name: '表示' })).toBeInTheDocument();
  });

  it.each([
    ['開始日が未入力', '', '2026-03-10', '開始日を入力してください。'],
    ['終了日が未入力', '2026-01-15', '', '終了日を入力してください。'],
    ['開始日が終了日より後', '2026-03-11', '2026-03-10', '開始日は終了日以前の日付を指定してください。'],
  ])('%sの場合はAPIを呼び出さない', (_, from, to, message) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ReportsPage onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('開始日'), { target: { value: from } });
    fireEvent.change(screen.getByLabelText('終了日'), { target: { value: to } });
    fireEvent.click(screen.getByRole('button', { name: '表示' }));

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests and displays the sales trend in API response order', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(salesTrend),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<ReportsPage onBack={vi.fn()} />);

    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/reports/sales-trend?from=2026-01-15&to=2026-03-10'));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '月' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '売上金額' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '2026-01', '1,200,000.00',
      '2026-02', '0.00',
      '2026-03', '850,000.00',
    ]);
  });

  it('shows loading and disables the display button while requesting', async () => {
    let resolveResponse: (value: { ok: boolean; json: () => Promise<typeof salesTrend> }) => void;
    const response = new Promise<{ ok: boolean; json: () => Promise<typeof salesTrend> }>((resolve) => {
      resolveResponse = resolve;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(response));
    render(<ReportsPage onBack={vi.fn()} />);

    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));

    expect(screen.getByRole('status')).toHaveTextContent('売上推移を読み込み中...');
    expect(screen.getByRole('button', { name: '表示中...' })).toBeDisabled();

    resolveResponse!({ ok: true, json: vi.fn().mockResolvedValue(salesTrend) });
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('shows an empty-state message when the API returns no items', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ from: '2026-01-01', to: '2026-01-31', items: [] }),
    }));
    render(<ReportsPage onBack={vi.fn()} />);

    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));

    expect(await screen.findByText('対象期間の売上データはありません。')).toBeInTheDocument();
  });

  it.each([
    ['400エラー', () => Promise.resolve({ ok: false, json: vi.fn().mockResolvedValue({ message: 'from is required.' }) }), 'from is required.'],
    ['500エラー', () => Promise.resolve({ ok: false, json: vi.fn().mockResolvedValue({ message: 'Failed to retrieve sales trend.' }) }), 'Failed to retrieve sales trend.'],
    ['network error', () => Promise.reject(new Error('Network request failed.')), 'Network request failed.'],
  ])('%sを表示する', async (_, fetchResult, message) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(fetchResult));
    render(<ReportsPage onBack={vi.fn()} />);

    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });
});
