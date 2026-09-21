// Test-only credentials for the dedicated E2E database. Never use for production accounts.
export const e2eStaff = Object.freeze({
  id: '10000000-0000-4000-8000-000000000001',
  email: 'sales-a@example.com',
  password: 'e2e-only-staff-login-password',
  role: 'staff',
});

export const e2eManager = Object.freeze({
  id: '10000000-0000-4000-8000-000000000003',
  email: 'e2e-manager@example.test',
  password: 'e2e-only-manager-login-password',
  role: 'manager',
});

export const e2eAdmin = Object.freeze({
  id: '10000000-0000-4000-8000-000000000004',
  email: 'e2e-admin@example.test',
  password: 'e2e-only-admin-login-password',
  role: 'admin',
});

