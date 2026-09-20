import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuthentication } from './AuthContext';

const loginResult = {
  accessToken: 'test-token', tokenType: 'Bearer' as const, expiresIn: 1800 as const,
  user: { id: 'user-id', email: 'user@example.test', role: 'manager' as const },
};

function StateProbe() {
  const { authentication, setAuthentication, clearAuthentication } = useAuthentication();
  return <>
    <output>{authentication === null ? '未認証' : `${authentication.accessToken} ${authentication.user.email} ${authentication.user.role}`}</output>
    <button onClick={() => setAuthentication(loginResult)}>設定</button>
    <button onClick={clearAuthentication}>解除</button>
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
});
