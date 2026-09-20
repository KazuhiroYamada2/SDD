import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReportsPage } from './ReportsPage';

const performance = {
  from: '2026-01-01',
  to: '2026-03-31',
  items: [
    { staffId: 'id-yamada', staffEmail: 'yamada@example.com', salesAmount: '3500000.00', salesCount: 12 },
    { staffId: 'id-sato', staffEmail: 'sato@example.com', salesAmount: '2200000.00', salesCount: 8 },
  ],
};

const openReport = () => {
  render(<ReportsPage onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '営業担当者別実績' }));
};

const fillPeriod = (from = '2026-01-01', to = '2026-03-31') => {
  fireEvent.change(screen.getByLabelText('開始日'), { target: { value: from } });
  fireEvent.change(screen.getByLabelText('終了日'), { target: { value: to } });
};

describe('営業担当者別実績レポート', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('切替操作と関連付けられた日付入力・表示ボタンを表示し、開いただけでは取得しない', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ReportsPage onBack={vi.fn()} />);
    const switchButton = screen.getByRole('button', { name: '営業担当者別実績' });
    expect(switchButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(switchButton);

    expect(switchButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: '営業担当者別実績' })).toBeInTheDocument();
    expect(screen.getByLabelText('開始日')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('終了日')).toHaveAttribute('type', 'date');
    expect(screen.getByRole('button', { name: '表示' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '売上推移' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['開始日なし', '', '2026-03-31', '開始日を入力してください。'],
    ['終了日なし', '2026-01-01', '', '終了日を入力してください。'],
    ['期間逆転', '2026-04-01', '2026-03-31', '開始日は終了日以前の日付を指定してください。'],
  ])('%sではAPIを呼ばない', (_, from, to, message) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    openReport();
    fillPeriod(from, to);
    fireEvent.click(screen.getByRole('button', { name: '表示' }));

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('正しい期間でAPIを呼び、レスポンス順に金額と整数件数を表へ表示する', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(performance) });
    vi.stubGlobal('fetch', fetchMock);
    openReport();
    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/reports/staff-performance?from=2026-01-01&to=2026-03-31'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('table', { name: '営業担当者別実績' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['営業担当者', '売上金額', '売上件数']);
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'yamada@example.com', '3,500,000.00', '12',
      'sato@example.com', '2,200,000.00', '8',
    ]);
  });

  it('取得中はstatusを表示し、表示ボタンを無効化する', async () => {
    let resolveResponse!: (value: { ok: boolean; json: () => Promise<typeof performance> }) => void;
    const pending = new Promise<{ ok: boolean; json: () => Promise<typeof performance> }>((resolve) => { resolveResponse = resolve; });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending));
    openReport();
    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));

    expect(screen.getByRole('status')).toHaveTextContent('営業担当者別実績を読み込み中...');
    expect(screen.getByRole('button', { name: '表示中...' })).toBeDisabled();
    resolveResponse({ ok: true, json: vi.fn().mockResolvedValue(performance) });
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('0件ではメッセージを表示し、空の表は表示しない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ ...performance, items: [] }) }));
    openReport();
    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));

    expect(await screen.findByText('対象期間の営業実績データはありません。')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it.each([
    ['400', 'from is required.'],
    ['401', 'Unauthorized.'],
    ['403', 'Forbidden.'],
    ['500', 'Failed to retrieve staff performance.'],
  ])('API %s時にalertでエラーを表示する', async (_, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({ message }) }));
    openReport();
    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('通信エラーをalertで表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network request failed.')));
    openReport();
    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network request failed.');
  });

  it('エラー応答にmessageがない場合は営業担当者別実績の代替文言を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({}) }));
    openReport();
    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('営業担当者別実績を取得できませんでした。');
  });

  it('別のレポートを経由して開き直すと前回のエラーを表示しない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network request failed.')));
    openReport();
    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network request failed.');

    fireEvent.click(screen.getByRole('button', { name: '売上推移' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '営業担当者別実績' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('売上推移へ戻り、再び開くと前回の実績やエラーを残さない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(performance) }));
    openReport();
    fillPeriod();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '売上推移' }));
    expect(screen.getByRole('heading', { name: '売上推移' })).toBeInTheDocument();
    expect(screen.getByLabelText('開始日')).toBeInTheDocument();
    expect(screen.queryByText('yamada@example.com')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '営業担当者別実績' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByLabelText('開始日')).toHaveValue('');
  });

  it('顧客分類へ移動して既存の取得結果を表示できる', async () => {
    const categories = { items: [{ category: 'A', customerCount: 2 }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(categories) }));
    openReport();
    fireEvent.click(screen.getByRole('button', { name: '顧客分類' }));

    expect(await screen.findByRole('table', { name: '顧客分類' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['A', '2']);
    expect(screen.queryByRole('heading', { name: '営業担当者別実績' })).not.toBeInTheDocument();
  });
});
