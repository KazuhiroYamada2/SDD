import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import type { LoginAuditContext, LoginResponse } from '../auth/login-service.js';
import { CustomerScopeDeniedError } from '../customers/customer-read-service.js';
import type { CustomerReadDto } from '../customers/customer-read-types.js';
import type { StructuredLogRecord } from '../logging/structured-log.js';
import {
  authenticatedRequest,
  createAuthenticatedTestApp,
  testUserId,
} from '../test/authenticated-api.js';
import type { AuditQuery, AuditRecord, AuditRepository } from './audit-types.js';

const customerId = '22222222-2222-4222-8222-222222222222';
const targetUserId = '33333333-3333-4333-8333-333333333333';
const customer: CustomerReadDto = {
  id: customerId,
  name: 'Test Customer',
  name_kana: null,
  email: null,
  phone: null,
  address: null,
  category: null,
  owner_user_id: testUserId,
  created_at: '2026-09-22T00:00:00.000Z',
  updated_at: '2026-09-22T00:00:00.000Z',
  deleted_at: null,
};

const collectingAudit = () => {
  const records: AuditRecord[] = [];
  const repository: AuditRepository = {
    insert: vi.fn(async (record) => { records.push(record); }),
  };
  return { records, repository };
};

const failingAudit: AuditRepository = {
  insert: vi.fn().mockRejectedValue(new Error('raw database secret and customer PII')),
};

const loginResponse: LoginResponse = {
  accessToken: 'test-token-not-logged',
  tokenType: 'Bearer',
  expiresIn: 1800,
  user: { id: testUserId, email: 'user@example.test', role: 'manager' },
};

describe('Audit action integration', () => {
  it('correlates Login response, access log, and LOGIN_SUCCESS audit with one request ID', async () => {
    const audit = collectingAudit();
    const access: StructuredLogRecord[] = [];
    const issue = vi.fn(async (_input: unknown, context?: LoginAuditContext) => {
      await context!.recordSuccess(testUserId);
      return loginResponse;
    });
    const response = await request(createApp({
      loginService: { login: issue },
      auditRepository: audit.repository,
      accessLog: (record) => access.push(record),
    })).post('/api/v1/auth/login').send({ email: 'user@example.test', password: 'password' });

    expect(response.status).toBe(200);
    expect(audit.records).toEqual([expect.objectContaining({
      action: 'LOGIN_SUCCESS', userId: testUserId, resourceType: 'AUTH', resourceId: null,
      requestId: response.headers['x-request-id'],
    })]);
    expect(access).toHaveLength(1);
    expect(access[0]).toMatchObject({
      request_id: response.headers['x-request-id'], user_id: testUserId,
    });
  });

  it('records LOGIN_FAILURE without an actor', async () => {
    const audit = collectingAudit();
    const response = await request(createApp({
      loginService: {
        login: async (_input, context) => {
          await context!.recordFailure();
          return null;
        },
      },
      auditRepository: audit.repository,
    })).post('/api/v1/auth/login').send({ email: 'user@example.test', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(audit.records).toEqual([expect.objectContaining({
      action: 'LOGIN_FAILURE', userId: null, resourceType: 'AUTH', resourceId: null,
    })]);
  });

  it('records AUTHENTICATION_REQUIRED for a protected request', async () => {
    const audit = collectingAudit();
    const response = await request(createApp({ auditRepository: audit.repository })).get('/api/v1/customers');

    expect(response.status).toBe(401);
    expect(audit.records).toEqual([expect.objectContaining({
      action: 'AUTHENTICATION_REQUIRED', userId: null,
      resourceType: 'AUTHORIZATION', resourceId: null,
    })]);
  });

  it('records AUTHORIZATION_DENIED for an authenticated operation denial', async () => {
    const audit = collectingAudit();
    const app = createAuthenticatedTestApp({
      auditRepository: audit.repository,
      customerCategoryService: { getCustomerCategories: vi.fn() },
    }, 'staff');
    const response = await authenticatedRequest(app).get('/api/v1/reports/customer-categories');

    expect(response.status).toBe(403);
    expect(audit.records).toEqual([expect.objectContaining({
      action: 'AUTHORIZATION_DENIED', userId: testUserId,
      resourceType: 'AUTHORIZATION', resourceId: null,
    })]);
  });

  it('records scope denial without exposing the requested Customer ID', async () => {
    const audit = collectingAudit();
    const app = createAuthenticatedTestApp({
      auditRepository: audit.repository,
      customerReadService: {
        list: vi.fn(),
        findById: vi.fn().mockRejectedValue(new CustomerScopeDeniedError()),
      },
    });
    const response = await authenticatedRequest(app).get(`/api/v1/customers/${customerId}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer was not found.' });
    expect(audit.records).toEqual([expect.objectContaining({
      action: 'AUTHORIZATION_SCOPE_DENIED', userId: testUserId,
      resourceType: 'CUSTOMER', resourceId: null,
    })]);
    expect(JSON.stringify(audit.records)).not.toContain(customerId);
  });

  it.each([
    ['CUSTOMER_LIST', '/api/v1/customers', null],
    ['CUSTOMER_READ', `/api/v1/customers/${customerId}`, customerId],
  ] as const)('records mandatory %s after a successful read', async (action, path, resourceId) => {
    const audit = collectingAudit();
    const app = createAuthenticatedTestApp({
      auditRepository: audit.repository,
      customerReadService: {
        list: async () => ({ items: [], page: 1, page_size: 20, total_count: 0, total_pages: 0 }),
        findById: async () => customer,
      },
    });
    const response = await authenticatedRequest(app).get(path);

    expect(response.status).toBe(200);
    expect(audit.records).toEqual([expect.objectContaining({
      action,
      userId: testUserId,
      resourceType: action === 'CUSTOMER_LIST' ? 'CUSTOMER_COLLECTION' : 'CUSTOMER',
      resourceId,
      requestId: response.headers['x-request-id'],
    })]);
  });

  it.each([
    ['CUSTOMER_UPDATE', 'patch', `/api/v1/customers/${customerId}`, { category: 'A' }],
    ['CUSTOMER_DELETE', 'delete', `/api/v1/customers/${customerId}`, undefined],
    ['USER_ROLE_CHANGE', 'patch', `/api/v1/users/${targetUserId}/role`, { role: 'manager' }],
  ] as const)('records mandatory %s through the transaction callback', async (action, method, path, body) => {
    const audit = collectingAudit();
    const transactionQuery: AuditQuery = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const app = createAuthenticatedTestApp({
      auditRepository: audit.repository,
      customerEditService: {
        update: async (_id, _input, _actor, recordAudit) => {
          await recordAudit!(transactionQuery);
          return customer;
        },
      },
      customerDeleteService: {
        deleteById: async (_id, _actor, recordAudit) => recordAudit!(transactionQuery),
      },
      userService: {
        list: vi.fn(),
        changeRole: async (_id, role, _actor, recordAudit) => {
          await recordAudit!(transactionQuery as never);
          return { id: targetUserId, email: 'target@example.test', role, active: true };
        },
      },
    }, 'admin');
    const builder = authenticatedRequest(app)[method](path);
    const response = body === undefined ? await builder : await builder.send(body);

    expect([200, 204]).toContain(response.status);
    expect(audit.records).toEqual([expect.objectContaining({
      action,
      userId: testUserId,
      resourceType: action === 'USER_ROLE_CHANGE' ? 'USER' : 'CUSTOMER',
      resourceId: action === 'USER_ROLE_CHANGE' ? targetUserId : customerId,
      requestId: response.headers['x-request-id'],
    })]);
  });
});

describe('Audit failure behavior', () => {
  it.each([
    ['LOGIN_FAILURE', async () => request(createApp({
      auditRepository: failingAudit,
      loginService: {
        login: async (_input, context) => {
          await context!.recordFailure();
          return null;
        },
      },
    })).post('/api/v1/auth/login').send({ email: 'user@example.test', password: 'wrong' }), 401],
    ['AUTHENTICATION_REQUIRED', async () => request(createApp({ auditRepository: failingAudit }))
      .get('/api/v1/customers'), 401],
    ['AUTHORIZATION_DENIED', async () => authenticatedRequest(createAuthenticatedTestApp({
      auditRepository: failingAudit,
      customerCategoryService: { getCustomerCategories: vi.fn() },
    }, 'staff')).get('/api/v1/reports/customer-categories'), 403],
    ['AUTHORIZATION_SCOPE_DENIED', async () => authenticatedRequest(createAuthenticatedTestApp({
      auditRepository: failingAudit,
      customerReadService: {
        list: vi.fn(),
        findById: vi.fn().mockRejectedValue(new CustomerScopeDeniedError()),
      },
    })).get(`/api/v1/customers/${customerId}`), 404],
  ] as const)('keeps the original security response when best-effort %s fails', async (_action, send, status) => {
    const response = await send();
    expect(response.status).toBe(status);
  });

  it.each([
    ['CUSTOMER_LIST', '/api/v1/customers'],
    ['CUSTOMER_READ', `/api/v1/customers/${customerId}`],
  ] as const)('returns generic 500 without a Customer DTO when mandatory %s fails', async (_action, path) => {
    const app = createAuthenticatedTestApp({
      auditRepository: failingAudit,
      customerReadService: {
        list: async () => ({ items: [customer], page: 1, page_size: 20, total_count: 1, total_pages: 1 }),
        findById: async () => customer,
      },
    });
    const response = await authenticatedRequest(app).get(path);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: path === '/api/v1/customers' ? 'Failed to retrieve customers.' : 'Failed to retrieve customer.',
    });
    expect(response.text).not.toContain(customer.name);
  });

  it('does not return a token when mandatory LOGIN_SUCCESS audit fails', async () => {
    const response = await request(createApp({
      auditRepository: failingAudit,
      loginService: {
        login: async (_input, context) => {
          await context!.recordSuccess(testUserId);
          return loginResponse;
        },
      },
    })).post('/api/v1/auth/login').send({ email: 'user@example.test', password: 'password' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to log in.' });
    expect(response.text).not.toContain(loginResponse.accessToken);
  });
});
