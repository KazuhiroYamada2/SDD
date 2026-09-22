import { afterEach, describe, expect, it, vi } from 'vitest';
import { login, LoginApiError } from './auth';

const input = { email: 'user@example.test', password: ' test-only-password ' };
const success = {
  accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 1800,
  user: { id: 'user-id', email: input.email, role: 'manager' },
};

const response = (status: number, body: unknown) => ({
  status,
  json: vi.fn().mockResolvedValue(body),
});

describe('Login API client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the 200 Login response and sends JSON without changing the password', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, success));
    vi.stubGlobal('fetch', fetchMock);

    expect(await login(input)).toEqual(success);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/auth/login');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    const body = JSON.parse(options.body as string) as typeof input;
    expect(body.email).toBe(input.email);
    expect(body.password === input.password).toBe(true);
  });

  it('classifies 400 VALIDATION_ERROR as input validation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(400, { code: 'VALIDATION_ERROR', message: 'email is required.' })));
    await expect(login(input)).rejects.toMatchObject({ kind: 'validation' });
  });

  it('classifies 401 AUTHENTICATION_FAILED without exposing its cause', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, { code: 'AUTHENTICATION_FAILED', message: 'Authentication failed.' })));
    await expect(login(input)).rejects.toMatchObject({ kind: 'authentication', message: 'ログインに失敗しました。' });
  });

  it.each([500, 503])('keeps HTTP %i separate from invalid credentials', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(status, { code: 'INTERNAL_SERVER_ERROR' })));
    await expect(login(input)).rejects.toMatchObject({ kind: 'server' });
  });

  it('keeps network failure separate from invalid credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')));
    await expect(login(input)).rejects.toMatchObject({ kind: 'network' });
  });

  it('uses a typed error without returning Backend internal messages', () => {
    expect(new LoginApiError('validation').message).toBe('入力内容を確認してください。');
  });
});
