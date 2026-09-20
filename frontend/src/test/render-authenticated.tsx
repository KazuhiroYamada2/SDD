import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AuthProvider } from '../auth/AuthContext';

export const testAuthentication = {
  accessToken: 'test-access-token',
  user: { id: 'test-user-id', email: 'user@example.test', role: 'manager' as const },
};

export function renderAuthenticated(element: ReactElement): RenderResult {
  return render(<AuthProvider initialAuthentication={testAuthentication}>{element}</AuthProvider>);
}
