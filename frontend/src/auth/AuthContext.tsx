import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuthenticationState, LoginResponse } from './auth-types';

type AuthenticationContextValue = {
  authentication: AuthenticationState;
  setAuthentication: (result: LoginResponse) => void;
  clearAuthentication: () => void;
};

const AuthenticationContext = createContext<AuthenticationContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authentication, setState] = useState<AuthenticationState>(null);

  return (
    <AuthenticationContext.Provider value={{
      authentication,
      setAuthentication: (result) => setState({ accessToken: result.accessToken, user: result.user }),
      clearAuthentication: () => setState(null),
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
