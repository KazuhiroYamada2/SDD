import { useCallback } from 'react';
import { AuthenticationRequiredError, MissingAccessTokenError } from '../api/authenticated-fetch';
import { useAuthentication } from './AuthContext';

export function useAuthenticatedApi() {
  const { authentication, requireReauthentication } = useAuthentication();
  const accessToken = authentication?.accessToken;

  return useCallback(async <Result,>(request: (token: string) => Promise<Result>): Promise<Result> => {
    if (accessToken === undefined) throw new MissingAccessTokenError();
    try {
      return await request(accessToken);
    } catch (error) {
      if (error instanceof AuthenticationRequiredError) requireReauthentication(accessToken);
      throw error;
    }
  }, [accessToken, requireReauthentication]);
}
