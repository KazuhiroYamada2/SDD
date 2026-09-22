import { expect, test } from '@playwright/test';
import { e2eManager } from '../fixtures/auth-manager.mjs';
import { loginAsE2EManager } from './login-helper';

test('E2E manager logs in through the real Backend and PostgreSQL', async ({ request }) => {
  const result = await loginAsE2EManager(request);
  expect(result.accessToken.split('.')).toHaveLength(3);
});

test('E2E manager rejects an incorrect password', async ({ request }) => {
  const response = await request.post('/api/v1/auth/login', {
    data: { email: e2eManager.email, password: 'incorrect-e2e-password' },
  });
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({
    code: 'AUTHENTICATION_FAILED',
    message: 'Authentication failed.',
  });
});
