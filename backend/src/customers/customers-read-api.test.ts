import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  authenticatedRequest,
  createAuthenticatedTestApp,
  testUserId,
} from '../test/authenticated-api.js';
import type { Customer, CustomerListCriteria, CustomerReadRepository } from './customer-repository.js';
import { createCustomerReadService } from './customer-read-service.js';

const otherOwnerId = '22222222-2222-4222-8222-222222222222';
const missingCustomerId = '55555555-5555-4555-8555-555555555555';
const customerNotFound = { code: 'CUSTOMER_NOT_FOUND', message: 'Customer was not found.' };

const customer = (overrides: Partial<Customer> = {}): Customer => ({
  id: '8a1f2d44-1234-4abc-8def-123456789abc',
  name: '株式会社サンプル',
  name_kana: 'カブシキガイシャサンプル',
  email: 'sales@example.com',
  phone: '03-1234-5678',
  address: '東京都千代田区',
  category: '既存顧客',
  owner_user_id: testUserId,
  created_at: new Date('2026-09-13T00:00:00.000Z'),
  updated_at: new Date('2026-09-14T00:00:00.000Z'),
  deleted_at: null,
  ...overrides,
});

const repositoryFor = (customers: Customer[]): CustomerReadRepository => ({
  list: vi.fn(async (criteria: CustomerListCriteria) => {
    const items = customers.filter((item) =>
      item.deleted_at === null &&
      (criteria.ownerScopeUserId === undefined || item.owner_user_id === criteria.ownerScopeUserId));
    return { items, totalCount: items.length };
  }),
  findActiveById: vi.fn(async (id: string) =>
    customers.find((item) => item.id === id && item.deleted_at === null) ?? null),
});

const appFor = (customers: Customer[], role: 'staff' | 'manager' | 'admin' = 'staff') => {
  const repository = repositoryFor(customers);
  return {
    app: createAuthenticatedTestApp({ customerReadService: createCustomerReadService(repository) }, role),
    repository,
  };
};

const dto = (item: Customer) => ({
  ...item,
  created_at: item.created_at.toISOString(),
  updated_at: item.updated_at.toISOString(),
  deleted_at: item.deleted_at?.toISOString() ?? null,
});

describe('GET /api/v1/customers', () => {
  it('returns only staff-owned active customers in the exact list envelope', async () => {
    const own = customer();
    const other = customer({ id: '33333333-3333-4333-8333-333333333333', owner_user_id: otherOwnerId });
    const deleted = customer({ id: '44444444-4444-4444-8444-444444444444', deleted_at: new Date() });
    const { app, repository } = appFor([own, other, deleted]);

    const response = await authenticatedRequest(app).get('/api/v1/customers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [dto(own)],
      page: 1,
      page_size: 20,
      total_count: 1,
      total_pages: 1,
    });
    expect(repository.list).toHaveBeenCalledWith({ ownerScopeUserId: testUserId, limit: 20, offset: 0 });
  });

  it.each(['manager', 'admin'] as const)('returns all active customers for %s', async (role) => {
    const own = customer();
    const other = customer({ id: '33333333-3333-4333-8333-333333333333', owner_user_id: otherOwnerId });
    const deleted = customer({ id: '44444444-4444-4444-8444-444444444444', deleted_at: new Date() });
    const { app, repository } = appFor([own, other, deleted], role);

    const response = await authenticatedRequest(app).get('/api/v1/customers');

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([dto(own), dto(other)]);
    expect(response.body.total_count).toBe(2);
    expect(repository.list).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });

  it('returns the zero-result envelope', async () => {
    const { app } = appFor([]);
    const response = await authenticatedRequest(app).get('/api/v1/customers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [], page: 1, page_size: 20, total_count: 0, total_pages: 0,
    });
  });

  it('requires Authentication', async () => {
    const { app } = appFor([]);
    const response = await request(app).get('/api/v1/customers');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.',
    });
  });
});

describe('GET /api/v1/customers/:id', () => {
  it('returns the exact read DTO for a staff-owned customer', async () => {
    const own = customer();
    const { app } = appFor([own]);

    const response = await authenticatedRequest(app).get(`/api/v1/customers/${own.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(dto(own));
  });

  it('returns the same 404 for another owner and a missing customer', async () => {
    const other = customer({ owner_user_id: otherOwnerId });
    const { app } = appFor([other]);

    const scopeResponse = await authenticatedRequest(app).get(`/api/v1/customers/${other.id}`);
    const missingResponse = await authenticatedRequest(app).get(`/api/v1/customers/${missingCustomerId}`);

    expect(scopeResponse.status).toBe(404);
    expect(missingResponse.status).toBe(404);
    expect(scopeResponse.body).toEqual(customerNotFound);
    expect(missingResponse.body).toEqual(customerNotFound);
    expect(scopeResponse.body).toEqual(missingResponse.body);
  });

  it.each(['manager', 'admin'] as const)('returns another owner customer for %s', async (role) => {
    const other = customer({ owner_user_id: otherOwnerId });
    const { app } = appFor([other], role);

    const response = await authenticatedRequest(app).get(`/api/v1/customers/${other.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(dto(other));
  });

  it('treats a logically deleted customer as missing on the production route', async () => {
    const deleted = customer({ deleted_at: new Date() });
    const { app } = appFor([deleted], 'admin');

    const response = await authenticatedRequest(app).get(`/api/v1/customers/${deleted.id}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual(customerNotFound);
  });

  it('returns the existing validation response without calling the service for a malformed UUID', async () => {
    const customerReadService = {
      list: vi.fn(),
      findById: vi.fn(),
    };
    const app = createAuthenticatedTestApp({ customerReadService });

    const response = await authenticatedRequest(app).get('/api/v1/customers/not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message: 'id must be a UUID.' });
    expect(customerReadService.findById).not.toHaveBeenCalled();
  });

  it('requires Authentication before UUID validation or Customer service execution', async () => {
    const customerReadService = {
      list: vi.fn(),
      findById: vi.fn(),
    };
    const app = createAuthenticatedTestApp({ customerReadService });

    const response = await request(app).get('/api/v1/customers/not-a-uuid');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.',
    });
    expect(customerReadService.findById).not.toHaveBeenCalled();
  });
});
