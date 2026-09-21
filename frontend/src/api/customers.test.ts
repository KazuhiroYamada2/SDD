import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationRequiredError } from './authenticated-fetch';
import { deleteCustomer, getCustomer, getCustomers, updateCustomer } from './customers';

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

  it('builds the supported list query safely and keeps Bearer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await getCustomers('test-access-token', {
      page: 2,
      page_size: 50,
      query: '  株式会社 サンプル  ',
      category: '  重点顧客  ',
      sort: 'created_at_desc',
    });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/customers?page=2&page_size=50&query=%E6%A0%AA%E5%BC%8F%E4%BC%9A%E7%A4%BE+%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB&category=%E9%87%8D%E7%82%B9%E9%A1%A7%E5%AE%A2&sort=created_at_desc');
    expect(url).not.toContain('owner_user_id');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-access-token');
  });

  it('omits empty filters while sending page and sort controls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await getCustomers('test-access-token', {
      page: 1,
      page_size: 20,
      query: '   ',
      category: '',
      sort: 'name_asc',
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/customers?page=1&page_size=20&sort=name_asc');
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

describe('updateCustomer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('PATCHes the encoded production detail endpoint with Bearer and editable fields only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response.items[0]), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(updateCustomer('customer/id', { name: '更新後', category: null }, 'test-access-token'))
      .resolves.toEqual(response.items[0]);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/customers/customer%2Fid');
    expect(options.method).toBe('PATCH');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-access-token');
    expect(JSON.parse(String(options.body))).toEqual({ name: '更新後', category: null });
  });

  it('keeps a 403 as a normal API error rather than an authentication error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'FORBIDDEN', message: 'Forbidden.',
    }), { status: 403, headers: { 'Content-Type': 'application/json' } })));

    await expect(updateCustomer(response.items[0].id, { name: '更新後' }, 'test-access-token'))
      .rejects.toThrow('Forbidden.');
  });
});

describe('deleteCustomer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('DELETEs the encoded production detail endpoint with Bearer and accepts 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(deleteCustomer('customer/id', 'test-access-token')).resolves.toBeUndefined();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/customers/customer%2Fid');
    expect(options.method).toBe('DELETE');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-access-token');
  });

  it('uses the Backend message without treating 403 as Authentication failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'FORBIDDEN', message: 'Forbidden.',
    }), { status: 403, headers: { 'Content-Type': 'application/json' } })));
    await expect(deleteCustomer(response.items[0].id, 'test-access-token')).rejects.toThrow('Forbidden.');
  });
});
