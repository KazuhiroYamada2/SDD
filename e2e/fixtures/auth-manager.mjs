// Test-only credentials for the dedicated E2E database. Never use for production accounts.
export const e2eManager = Object.freeze({
  id: '10000000-0000-4000-8000-000000000003',
  email: 'e2e-manager@example.test',
  password: 'e2e-only-manager-login-password',
  role: 'manager',
});
