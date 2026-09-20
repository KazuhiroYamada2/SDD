import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const customerCategories = {
  items: [
    { category: 'A', customerCount: 25 },
    { category: 'B', customerCount: 12 },
    { category: '未分類', customerCount: 3 },
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

  it('別期間の再検索開始時に旧結果を消し、失敗後も旧結果を戻さない', async () => {
    let rejectSecond!: (reason: Error) => void;
    const secondResponse = new Promise<never>((_, reject) => { rejectSecond = reject; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(salesTrend) })
      .mockReturnValueOnce(secondResponse);
    vi.stubGlobal('fetch', fetchMock);
    render(<ReportsPage onBack={vi.fn()} />);

    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('開始日'), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText('終了日'), { target: { value: '2026-04-30' } });
    fireEvent.click(screen.getByRole('button', { name: '表示' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/reports/sales-trend?from=2026-04-01&to=2026-04-30');
    expect(screen.getByRole('status')).toHaveTextContent('売上推移を読み込み中...');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    rejectSecond(new Error('New period failed.'));
    expect(await screen.findByRole('alert')).toHaveTextContent('New period failed.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('売上推移のエラー応答にmessageがない場合は専用の代替文言を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({}) }));
    render(<ReportsPage onBack={vi.fn()} />);
    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('売上推移を取得できませんでした。');
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

  it('switches to customer categories, requests the API without period parameters, and displays the response order', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(customerCategories),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<ReportsPage onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/reports/customer-categories'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: '顧客分類' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '顧客分類' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '顧客数' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'A', '25',
      'B', '12',
      '未分類', '3',
    ]);
  });

  it('shows loading while requesting customer categories', async () => {
    let resolveResponse: (value: { ok: boolean; json: () => Promise<typeof customerCategories> }) => void;
    const response = new Promise<{ ok: boolean; json: () => Promise<typeof customerCategories> }>((resolve) => {
      resolveResponse = resolve;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(response));
    render(<ReportsPage onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));

    expect(screen.getByRole('status')).toHaveTextContent('顧客分類を読み込み中...');
    resolveResponse!({ ok: true, json: vi.fn().mockResolvedValue(customerCategories) });
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('shows an empty-state message when customer categories are empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ items: [] }),
    }));
    render(<ReportsPage onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));

    expect(await screen.findByText('顧客データはありません。')).toBeInTheDocument();
  });

  it('顧客分類のエラー応答にmessageがない場合は専用の代替文言を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({}) }));
    render(<ReportsPage onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('顧客分類を取得できませんでした。');
  });

  it('顧客分類の取得中も両レポートへ切り替えられ、再訪時に重複取得しない', async () => {
    let resolveResponse!: (value: { ok: boolean; json: () => Promise<typeof customerCategories> }) => void;
    const pending = new Promise<{ ok: boolean; json: () => Promise<typeof customerCategories> }>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pending);
    vi.stubGlobal('fetch', fetchMock);
    render(<ReportsPage onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('顧客分類を読み込み中...');
    expect(screen.getByRole('button', { name: '顧客分類' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '売上推移' }));
    expect(screen.getByRole('heading', { name: '売上推移' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));
    expect(screen.getByRole('status')).toHaveTextContent('顧客分類を読み込み中...');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '営業担当者別実績' }));
    expect(screen.getByRole('heading', { name: '営業担当者別実績' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '売上推移' }));
    await act(async () => {
      resolveResponse({ ok: true, json: vi.fn().mockResolvedValue(customerCategories) });
    });
    expect(screen.getByRole('heading', { name: '売上推移' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('顧客分類へ通常再訪すると再取得し、新しい件数に置き換える', async () => {
    const updatedCategories = { items: [{ category: 'A', customerCount: 26 }] };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(customerCategories) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(updatedCategories) });
    vi.stubGlobal('fetch', fetchMock);
    render(<ReportsPage onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('25')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '売上推移' }));
    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('26')).toBeInTheDocument();
    expect(screen.queryByText('25')).not.toBeInTheDocument();
  });

  it.each([
    ['401エラー', () => Promise.resolve({ ok: false, json: vi.fn().mockResolvedValue({ message: 'Unauthorized.' }) }), 'Unauthorized.'],
    ['403エラー', () => Promise.resolve({ ok: false, json: vi.fn().mockResolvedValue({ message: 'Forbidden.' }) }), 'Forbidden.'],
    ['500エラー', () => Promise.resolve({ ok: false, json: vi.fn().mockResolvedValue({ message: 'Failed to retrieve customer categories.' }) }), 'Failed to retrieve customer categories.'],
    ['network error', () => Promise.reject(new Error('Network request failed.')), 'Network request failed.'],
  ])('顧客分類の%sを表示する', async (_, fetchResult, message) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(fetchResult));
    render(<ReportsPage onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('returns from customer categories to the existing sales trend screen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(customerCategories),
    }));
    render(<ReportsPage onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));
    await screen.findByRole('heading', { name: '顧客分類' });
    fireEvent.click(screen.getByRole('button', { name: '売上推移' }));

    expect(screen.getByRole('heading', { name: '売上推移' })).toBeInTheDocument();
    expect(screen.getByLabelText('開始日')).toBeInTheDocument();
    expect(screen.getByLabelText('終了日')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '表示' })).toBeInTheDocument();
  });
});
