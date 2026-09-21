import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationRequiredError } from './authenticated-fetch';
import { getCustomer, getCustomers } from './customers';

const response = {
  items: [{
    id: '8a1f2d44-1234-4abc-8def-123456789abc',
    name: '株式会社サンプル',
    name_kana: 'カブシキガイシャサンプル',
    email: 'sales@example.com',
    phone: '03-1234-5678',
    address: '東京都',
    category: 'A',
    owner_user_id: 'c0a80101-1234-4abc-8def-123456789abc',
    created_at: '2026-09-21T00:00:00.000Z',
    updated_at: '2026-09-21T00:00:00.000Z',
    deleted_at: null,
  }],
  page: 1,
  page_size: 20,
  total_count: 1,
  total_pages: 1,
};

describe('getCustomers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests the production list endpoint with Bearer and no query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCustomers('test-access-token')).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/customers');
    expect(url).not.toContain('?');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-access-token');
  });

  it('passes the contracted Authentication 401 to the common authentication flow', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required.',
    }), { status: 401, headers: { 'Content-Type': 'application/json' } })));

    await expect(getCustomers('test-access-token')).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });
});

describe('getCustomer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests the encoded production detail endpoint with Bearer and parses the DTO', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response.items[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCustomer('customer/id', 'test-access-token')).resolves.toEqual(response.items[0]);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/customers/customer%2Fid');
    expect(url).not.toContain('?');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-access-token');
  });

  it('uses the Backend message for a Customer not found response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'CUSTOMER_NOT_FOUND',
      message: 'Customer was not found.',
    }), { status: 404, headers: { 'Content-Type': 'application/json' } })));

    await expect(getCustomer(response.items[0].id, 'test-access-token'))
      .rejects.toThrow('Customer was not found.');
  });

  it('passes the contracted Authentication 401 to the common authentication flow', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required.',
    }), { status: 401, headers: { 'Content-Type': 'application/json' } })));

    await expect(getCustomer(response.items[0].id, 'test-access-token'))
      .rejects.toBeInstanceOf(AuthenticationRequiredError);
  });
});
