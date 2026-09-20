import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { login, LoginApiError } from '../api/auth';
import { AuthProvider, useAuthentication } from './AuthContext';
import { Login } from './Login';

vi.mock('../api/auth', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/auth')>(),
  login: vi.fn(),
}));

const loginMock = vi.mocked(login);
const success = {
  accessToken: 'test-token', tokenType: 'Bearer' as const, expiresIn: 1800 as const,
  user: { id: 'user-id', email: 'user@example.test', role: 'manager' as const },
};

function AuthenticationProbe() {
  const { authentication } = useAuthentication();
  return <span>{authentication === null ? '未認証' : `${authentication.accessToken} ${authentication.user.role}`}</span>;
}

function renderLogin() {
  return render(<AuthProvider><Login /><AuthenticationProbe /></AuthProvider>);
}

function fillAndSubmit(email = ' user@example.test ', password = ' test-only-password ') {
  fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));
}

describe('Login component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('has accessible email, password, and Login controls', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('trims email only, calls the API, and stores the successful authentication result', async () => {
    loginMock.mockResolvedValue(success);
    renderLogin();
    fillAndSubmit();
    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1));
    const request = loginMock.mock.calls[0][0];
    expect(request.email).toBe('user@example.test');
    expect(request.password === ' test-only-password ').toBe(true);
    expect(await screen.findByText('test-token manager')).toBeInTheDocument();
  });

  it('shows a common Login failure for 401 and keeps authentication empty', async () => {
    loginMock.mockRejectedValue(new LoginApiError('authentication'));
    renderLogin();
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('ログインに失敗しました。');
    expect(screen.getByText('未認証')).toBeInTheDocument();
  });

  it('shows an input error for 400', async () => {
    loginMock.mockRejectedValue(new LoginApiError('validation'));
    renderLogin();
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('入力内容を確認してください。');
  });

  it.each(['server', 'network'] as const)('does not display a 401 Login failure for %s errors', async (kind) => {
    loginMock.mockRejectedValue(new LoginApiError(kind));
    renderLogin();
    fillAndSubmit();
    expect(await screen.findByRole('alert')).not.toHaveTextContent('ログインに失敗しました。');
  });

  it('shows loading and blocks duplicate submissions', async () => {
    let finish!: (result: typeof success) => void;
    loginMock.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    renderLogin();
    fillAndSubmit();
    expect(screen.getByRole('status')).toHaveTextContent('ログイン中…');
    expect(screen.getByRole('button', { name: 'ログイン中…' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: 'ログイン中…' }).closest('form')!);
    expect(loginMock).toHaveBeenCalledTimes(1);
    finish(success);
    expect(await screen.findByText('test-token manager')).toBeInTheDocument();
  });
});
