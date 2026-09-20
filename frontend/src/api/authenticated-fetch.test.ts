import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticatedFetch, AuthenticationRequiredError, MissingAccessTokenError } from './authenticated-fetch';

const url = '/api/v1/reports/customer-categories';
const token = 'abc';
const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('authenticatedFetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('adds the access token as a Bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await authenticatedFetch(url, token);
    expect(response.status).toBe(200);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer abc');
  });

  it.each([
    ['plain object', { 'Content-Type': 'application/json', Accept: 'application/json' }],
    ['Headers object', new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' })],
    ['header pairs', [['Content-Type', 'application/json'], ['Accept', 'application/json']]],
  ])('preserves %s headers', async (_, headers) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, {}));
    vi.stubGlobal('fetch', fetchMock);
    await authenticatedFetch(url, token, { headers: headers as HeadersInit });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sent = new Headers(options.headers);
    expect(sent.get('Content-Type')).toBe('application/json');
    expect(sent.get('Accept')).toBe('application/json');
    expect(sent.get('Authorization')).toBe('Bearer abc');
  });

  it('retains Request headers and lets init override them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    const request = new Request('https://example.test/api/v1/customers', {
      headers: { Accept: 'text/plain', 'X-Request-Id': 'request-1' },
    });
    await authenticatedFetch(request, token, { headers: { Accept: 'application/json' } });
    const [, options] = fetchMock.mock.calls[0] as [Request, RequestInit];
    const sent = new Headers(options.headers);
    expect(sent.get('Accept')).toBe('application/json');
    expect(sent.get('X-Request-Id')).toBe('request-1');
  });

  it('overwrites caller supplied Authorization with the access token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    await authenticatedFetch(url, token, { headers: { Authorization: 'Bearer other' } });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer abc');
  });

  it('identifies only the contracted Authentication 401 without storing token data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, {
      code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.',
    })));
    let caught: unknown;
    try {
      await authenticatedFetch(url, token);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AuthenticationRequiredError);
    expect((caught as Error).message).toBe('Authentication required.');
    expect(JSON.stringify(caught).includes(token)).toBe(false);
    expect('accessToken' in (caught as object)).toBe(false);
    expect('headers' in (caught as object)).toBe(false);
  });

  it.each([400, 403, 500, 503])('returns HTTP %i for domain-specific handling', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(status, { code: 'OTHER_ERROR' })));
    const response = await authenticatedFetch(url, token);
    expect(response.status).toBe(status);
  });

  it.each([
    ['different code', jsonResponse(401, { code: 'OTHER_ERROR' })],
    ['invalid JSON', new Response('invalid-json', { status: 401 })],
  ])('leaves 401 with %s to the caller and preserves its body', async (_, response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const result = await authenticatedFetch(url, token);
    expect(result).toBe(response);
    expect(await result.text()).not.toBe('');
  });

  it('does not turn network failure into an AuthenticationRequiredError', async () => {
    const failure = new TypeError('Network unavailable');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure));
    await expect(authenticatedFetch(url, token)).rejects.toBe(failure);
  });

  it.each(['', '   ', null, undefined])('rejects a missing token before fetch', async (accessToken) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(authenticatedFetch(url, accessToken as string)).rejects.toBeInstanceOf(MissingAccessTokenError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
