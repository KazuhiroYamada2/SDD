import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AuthProvider } from '../auth/AuthContext';
import type { AuthenticationState } from '../auth/auth-types';

export const testAuthentication = {
  accessToken: 'test-access-token',
  user: { id: 'test-user-id', email: 'user@example.test', role: 'manager' as const },
};

export function renderAuthenticated(
  element: ReactElement,
  authentication: AuthenticationState = testAuthentication,
): RenderResult {
  return render(<AuthProvider initialAuthentication={authentication}>{element}</AuthProvider>);
}
