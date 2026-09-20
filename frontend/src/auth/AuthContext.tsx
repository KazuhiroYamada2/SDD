import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { AuthenticationState, LoginResponse } from './auth-types';

type AuthenticationContextValue = {
  authentication: AuthenticationState;
  setAuthentication: (result: LoginResponse) => void;
  clearAuthentication: () => void;
  authenticationNotice: string | null;
  requireReauthentication: (accessToken: string) => void;
};

const AuthenticationContext = createContext<AuthenticationContextValue | null>(null);

export function AuthProvider({ children, initialAuthentication = null }: { children: ReactNode; initialAuthentication?: AuthenticationState }) {
  const [authentication, setState] = useState<AuthenticationState>(initialAuthentication);
  const [authenticationNotice, setAuthenticationNotice] = useState<string | null>(null);
  const currentAuthentication = useRef(authentication);

  const setAuthentication = useCallback((result: LoginResponse) => {
    const next = { accessToken: result.accessToken, user: result.user };
    currentAuthentication.current = next;
    setState(next);
    setAuthenticationNotice(null);
  }, []);

  const clearAuthentication = useCallback(() => {
    currentAuthentication.current = null;
    setState(null);
    setAuthenticationNotice(null);
  }, []);

  const requireReauthentication = useCallback((accessToken: string) => {
    if (currentAuthentication.current?.accessToken !== accessToken) return;
    currentAuthentication.current = null;
    setState(null);
    setAuthenticationNotice('認証の有効期限が切れたか、認証状態が無効です。再度ログインしてください。');
  }, []);

  return (
    <AuthenticationContext.Provider value={{
      authentication,
      setAuthentication,
      clearAuthentication,
      authenticationNotice,
      requireReauthentication,
    }}>
      {children}
    </AuthenticationContext.Provider>
  );
}

export function useAuthentication(): AuthenticationContextValue {
  const value = useContext(AuthenticationContext);
  if (value === null) {
    throw new Error('AuthProvider is required.');
  }
  return value;
}
