import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuthentication } from './AuthContext';

const loginResult = {
  accessToken: 'test-token', tokenType: 'Bearer' as const, expiresIn: 1800 as const,
  user: { id: 'user-id', email: 'user@example.test', role: 'manager' as const },
};

function StateProbe() {
  const { authentication, setAuthentication, clearAuthentication, authenticationNotice, requireReauthentication } = useAuthentication();
  return <>
    <output>{authentication === null ? '未認証' : `${authentication.accessToken} ${authentication.user.email} ${authentication.user.role}`}</output>
    <button onClick={() => setAuthentication(loginResult)}>設定</button>
    <button onClick={clearAuthentication}>解除</button>
    <button onClick={() => requireReauthentication('test-token')}>現在のtokenで401</button>
    <button onClick={() => requireReauthentication('old-token')}>古いtokenで401</button>
    {authenticationNotice && <span>{authenticationNotice}</span>}
  </>;
}

describe('AuthProvider', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('starts unauthenticated, stores token and user in React state, and clears them', () => {
    render(<AuthProvider><StateProbe /></AuthProvider>);
    expect(screen.getByText('未認証')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '設定' }));
    expect(screen.getByText('test-token user@example.test manager')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '解除' }));
    expect(screen.getByText('未認証')).toBeInTheDocument();
  });

  it('does not read or write persistent storage and resets after remount', () => {
    window.localStorage.setItem('accessToken', 'stored-token');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { unmount } = render(<AuthProvider><StateProbe /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: '設定' }));
    unmount();
    render(<AuthProvider><StateProbe /></AuthProvider>);
    expect(screen.getByText('未認証')).toBeInTheDocument();
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('clears only the session whose token received Authentication 401', () => {
    render(<AuthProvider><StateProbe /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: '設定' }));
    fireEvent.click(screen.getByRole('button', { name: '古いtokenで401' }));
    expect(screen.getByText('test-token user@example.test manager')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '現在のtokenで401' }));
    expect(screen.getByText('未認証')).toBeInTheDocument();
    expect(screen.getByText('認証の有効期限が切れたか、認証状態が無効です。再度ログインしてください。')).toBeInTheDocument();
  });
});
