import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActivityHistory } from './ActivityHistory';
import { renderAuthenticated } from '../test/render-authenticated';

const customerId = '8a1f2d44-1234-4abc-8def-123456789abc';
const ownerUserId = 'c0a80101-1234-4abc-8def-123456789abc';
const authentication = (role: 'staff' | 'manager' | 'admin') => ({
  accessToken: 'test-access-token',
  user: { id: ownerUserId, email: `${role}@example.test`, role },
});
const activity = {
  id: 'd0a80101-1234-4abc-8def-123456789abc',
  customer_id: customerId,
  user_id: ownerUserId,
  activity_type: 'visit',
  visited_at: '2026-09-17T01:00:00.000Z',
  meeting_note: '商談内容',
  next_visit_at: '2026-09-24T01:00:00.000Z',
  created_at: '2026-09-17T01:00:00.000Z',
  updated_at: '2026-09-17T01:00:00.000Z',
};

describe('ActivityHistory', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows activity history and accessible activity registration controls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([activity]),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAuthenticated(<ActivityHistory customerId={customerId} ownerUserId={ownerUserId} />, authentication('staff'));

    expect(await screen.findByRole('list', { name: '営業活動履歴一覧' })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/v1/customers/${customerId}/activities`);
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer test-access-token');
    expect(screen.getByText('2026-09-24T01:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByLabelText('担当ユーザーID')).toHaveValue(ownerUserId);
    expect(screen.getByLabelText('活動種別')).toBeInTheDocument();
    expect(screen.getByLabelText('訪問日時')).toBeInTheDocument();
    expect(screen.getByLabelText('商談内容')).toBeInTheDocument();
    expect(screen.getByLabelText('次回訪問予定')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '営業活動を登録' })).toBeInTheDocument();
  });

  it('registers an activity and reloads the history', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([]) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(activity) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([activity]) });
    vi.stubGlobal('fetch', fetchMock);

    renderAuthenticated(<ActivityHistory customerId={customerId} ownerUserId={ownerUserId} />, authentication('staff'));
    await screen.findByText('営業活動履歴はありません。');
    fireEvent.change(screen.getByLabelText('商談内容'), { target: { value: ' 新規商談 ' } });
    fireEvent.click(screen.getByRole('button', { name: '営業活動を登録' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [url, options] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe(`/api/v1/customers/${customerId}/activities`);
    expect(options.method).toBe('POST');
    expect(new Headers(options.headers).get('Content-Type')).toBe('application/json');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-access-token');
    expect(options.body).toBe(JSON.stringify({ user_id: ownerUserId, activity_type: 'visit', meeting_note: '新規商談' }));
    expect(await screen.findByTestId('activity-registration-success')).toHaveTextContent('営業活動を登録しました。');
  });

  it('shows an API error when activity history retrieval fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ message: 'Customer was not found.' }),
    }));

    renderAuthenticated(<ActivityHistory customerId={customerId} ownerUserId={ownerUserId} />, authentication('staff'));

    expect(await screen.findByTestId('activity-history-error')).toHaveTextContent('Customer was not found.');
  });

  it('shows an API error when activity registration fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([]) })
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'User was not found.' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderAuthenticated(<ActivityHistory customerId={customerId} ownerUserId={ownerUserId} />, authentication('staff'));
    await screen.findByText('営業活動履歴はありません。');
    fireEvent.click(screen.getByRole('button', { name: '営業活動を登録' }));

    expect(await screen.findByTestId('activity-registration-error')).toHaveTextContent('User was not found.');
  });

  it('hides activity registration controls from manager while keeping history visible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([activity]),
    }));

    renderAuthenticated(
      <ActivityHistory customerId={customerId} ownerUserId={ownerUserId} />,
      authentication('manager'),
    );

    expect(await screen.findByRole('list', { name: '営業活動履歴一覧' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '営業活動を登録' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '営業活動を登録' })).not.toBeInTheDocument();
  });
});
