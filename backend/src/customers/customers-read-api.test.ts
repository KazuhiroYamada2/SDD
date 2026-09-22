import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  authenticatedRequest,
  createAuthenticatedTestApp,
  testUserId,
} from '../test/authenticated-api.js';
import type { Customer, CustomerListCriteria, CustomerReadRepository } from './customer-repository.js';
import { createCustomerReadService } from './customer-read-service.js';
import { passthroughCustomerCrypto } from '../test/customer-crypto.js';
import { createCustomerCrypto } from './customer-crypto.js';

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
    const filtered = customers.filter((item) =>
      item.deleted_at === null &&
      (criteria.ownerScopeUserId === undefined || item.owner_user_id === criteria.ownerScopeUserId) &&
      (criteria.query === undefined || item.name.toLocaleLowerCase().includes(criteria.query.toLocaleLowerCase())) &&
      (criteria.category === undefined || item.category === criteria.category) &&
      (criteria.ownerUserId === undefined || item.owner_user_id === criteria.ownerUserId));
    const direction = criteria.sort?.endsWith('_desc') ? -1 : 1;
    const sortField = criteria.sort?.startsWith('created_at') ? 'created_at' : 'name';
    const sorted = [...filtered].sort((left, right) => {
      const primary = sortField === 'created_at'
        ? left.created_at.getTime() - right.created_at.getTime()
        : left.name.localeCompare(right.name);
      return primary === 0 ? left.id.localeCompare(right.id) : primary * direction;
    });
    return {
      items: sorted.slice(criteria.offset, criteria.offset + criteria.limit),
      totalCount: filtered.length,
    };
  }),
  findActiveById: vi.fn(async (id: string) =>
    customers.find((item) => item.id === id && item.deleted_at === null) ?? null),
});

const appFor = (customers: Customer[], role: 'staff' | 'manager' | 'admin' = 'staff') => {
  const repository = repositoryFor(customers);
  return {
    app: createAuthenticatedTestApp({ customerReadService: createCustomerReadService(repository, passthroughCustomerCrypto) }, role),
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
    expect(repository.list).toHaveBeenCalledWith({
      ownerScopeUserId: testUserId,
      sort: 'name_asc',
      limit: 20,
      offset: 0,
    });
  });

  it.each(['manager', 'admin'] as const)('returns all active customers for %s', async (role) => {
    const own = customer();
    const other = customer({ id: '33333333-3333-4333-8333-333333333333', owner_user_id: otherOwnerId });
    const deleted = customer({ id: '44444444-4444-4444-8444-444444444444', deleted_at: new Date() });
    const { app, repository } = appFor([own, other, deleted], role);

    const response = await authenticatedRequest(app).get('/api/v1/customers');

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([dto(other), dto(own)]);
    expect(response.body.total_count).toBe(2);
    expect(repository.list).toHaveBeenCalledWith({ sort: 'name_asc', limit: 20, offset: 0 });
  });

  it('returns the zero-result envelope', async () => {
    const { app } = appFor([]);
    const response = await authenticatedRequest(app).get('/api/v1/customers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [], page: 1, page_size: 20, total_count: 0, total_pages: 0,
    });
  });

  it('flows trimmed search, filters, sort, and pagination through the production route', async () => {
    const owner = otherOwnerId;
    const matching = customer({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Sample Customer',
      category: 'A',
      owner_user_id: owner,
      created_at: new Date('2026-01-02T00:00:00.000Z'),
    });
    const nonMatching = customer({
      name: 'Different Customer',
      category: 'A',
      owner_user_id: owner,
    });
    const { app, repository } = appFor([matching, nonMatching], 'manager');

    const response = await authenticatedRequest(app).get('/api/v1/customers').query({
      page: '1',
      page_size: '50',
      query: '  sAmPlE  ',
      category: '  A  ',
      owner_user_id: owner,
      sort: 'created_at_desc',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [dto(matching)], page: 1, page_size: 50, total_count: 1, total_pages: 1,
    });
    expect(repository.list).toHaveBeenCalledWith({
      query: 'sAmPlE',
      category: 'A',
      ownerUserId: owner,
      sort: 'created_at_desc',
      limit: 50,
      offset: 0,
    });
  });

  it('treats empty search and category values as no filter', async () => {
    const own = customer();
    const { app, repository } = appFor([own]);

    const response = await authenticatedRequest(app).get('/api/v1/customers').query({ query: '  ', category: '' });

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([dto(own)]);
    expect(repository.list).toHaveBeenCalledWith({
      ownerScopeUserId: testUserId,
      sort: 'name_asc',
      limit: 20,
      offset: 0,
    });
  });

  it('intersects a staff security scope with a different client owner filter and returns zero', async () => {
    const own = customer();
    const other = customer({
      id: '33333333-3333-4333-8333-333333333333',
      owner_user_id: otherOwnerId,
    });
    const { app, repository } = appFor([own, other]);

    const response = await authenticatedRequest(app).get('/api/v1/customers')
      .query({ owner_user_id: otherOwnerId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [], page: 1, page_size: 20, total_count: 0, total_pages: 0,
    });
    expect(repository.list).toHaveBeenCalledWith({
      ownerScopeUserId: testUserId,
      ownerUserId: otherOwnerId,
      sort: 'name_asc',
      limit: 20,
      offset: 0,
    });
  });

  it('returns an empty page beyond the last page with filtered metadata', async () => {
    const matching = customer({ name: 'Sample Customer' });
    const { app } = appFor([matching], 'admin');

    const response = await authenticatedRequest(app).get('/api/v1/customers')
      .query({ page: '2', page_size: '1', query: 'sample' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [], page: 2, page_size: 1, total_count: 1, total_pages: 1,
    });
  });

  it.each([
    ['page=0', 'page must be a positive integer.'],
    ['page=-1', 'page must be a positive integer.'],
    ['page=1.5', 'page must be a positive integer.'],
    ['page=abc', 'page must be a positive integer.'],
    ['page_size=0', 'page_size must be an integer between 1 and 100.'],
    ['page_size=-1', 'page_size must be an integer between 1 and 100.'],
    ['page_size=1.5', 'page_size must be an integer between 1 and 100.'],
    ['page_size=101', 'page_size must be an integer between 1 and 100.'],
    ['page_size=abc', 'page_size must be an integer between 1 and 100.'],
    ['sort=invalid', 'sort must be one of name_asc, name_desc, created_at_asc, created_at_desc.'],
    ['owner_user_id=invalid', 'owner_user_id must be a UUID.'],
  ])('returns the exact validation response for %s', async (query, message) => {
    const { app, repository } = appFor([]);

    const response = await authenticatedRequest(app).get(`/api/v1/customers?${query}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message });
    expect(repository.list).not.toHaveBeenCalled();
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

  it('returns only the generic 500 contract for tampered encrypted data', async () => {
    const crypto = createCustomerCrypto({
      currentKeyId: 'test', keys: new Map([['test', Buffer.alloc(32, 8)]]),
    });
    const encrypted = crypto.encrypt('email', 'private@example.test').split(':');
    const ciphertext = Buffer.from(encrypted[5]!, 'base64');
    ciphertext[0] ^= 1;
    encrypted[5] = ciphertext.toString('base64');
    const stored = customer({ email: encrypted.join(':') });
    const repository = repositoryFor([stored]);
    const app = createAuthenticatedTestApp({
      customerReadService: createCustomerReadService(repository, crypto),
    });

    const response = await authenticatedRequest(app).get(`/api/v1/customers/${stored.id}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve customer.',
    });
    expect(JSON.stringify(response.body)).not.toContain('private@example.test');
    expect(JSON.stringify(response.body)).not.toContain('enc:v1:');
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
