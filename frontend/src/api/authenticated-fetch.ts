export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication required.');
    this.name = 'AuthenticationRequiredError';
  }
}

export class MissingAccessTokenError extends Error {
  constructor() {
    super('Access token is required.');
    this.name = 'MissingAccessTokenError';
  }
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  accessToken: string,
  init?: RequestInit,
): Promise<Response> {
  if (typeof accessToken !== 'string' || accessToken.trim() === '') {
    throw new MissingAccessTokenError();
  }

  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
  headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    const body: unknown = await response.clone().json().catch(() => null);
    if (typeof body === 'object' && body !== null && 'code' in body &&
        body.code === 'AUTHENTICATION_REQUIRED') {
      throw new AuthenticationRequiredError();
    }
  }
  return response;
}
