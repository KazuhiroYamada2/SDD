import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createCustomerDeleteService } from './customer-delete-service.js';
import { createCustomerEditService } from './customer-edit-service.js';
import { passthroughCustomerCrypto } from '../test/customer-crypto.js';
import { createCustomerReadService } from './customer-read-service.js';
import type {
  Customer,
  CustomerDeleteRepository,
  CustomerEditRepository,
  CustomerListCriteria,
} from './customer-repository.js';
import { authenticatedRequest, createAuthenticatedTestApp } from '../test/authenticated-api.js';

const id = '8a1f2d44-1234-4abc-8def-123456789abc';
const missingId = '55555555-5555-4555-8555-555555555555';
const notFound = { code: 'CUSTOMER_NOT_FOUND', message: 'Customer was not found.' };
const original: Customer = {
  id, name: 'Sample', name_kana: null, email: null, phone: null, address: null, category: 'A',
  owner_user_id: '22222222-2222-4222-8222-222222222222',
  created_at: new Date('2026-09-01T00:00:00.000Z'), updated_at: new Date('2026-09-01T00:00:00.000Z'), deleted_at: null,
};

type Repository = CustomerDeleteRepository & CustomerEditRepository;
const setup = (role: 'staff' | 'manager' | 'admin' = 'admin') => {
  let stored: Customer = { ...original };
  const repository: Repository = {
    list: vi.fn(async (criteria: CustomerListCriteria) => {
      const active = stored.deleted_at === null ? [stored] : [];
      return { items: active.slice(criteria.offset, criteria.offset + criteria.limit), totalCount: active.length };
    }),
    findActiveById: vi.fn(async (customerId: string) =>
      stored.id === customerId && stored.deleted_at === null ? stored : null),
    updateActiveById: vi.fn(async (customerId, input) => {
      if (stored.id !== customerId || stored.deleted_at !== null) return null;
      stored = { ...stored, ...input, updated_at: new Date('2026-09-02T00:00:00.000Z') };
      return stored;
    }),
    logicalDeleteActiveById: vi.fn(async (customerId: string) => {
      if (stored.id !== customerId || stored.deleted_at !== null) return false;
      stored = { ...stored, deleted_at: new Date('2026-09-03T00:00:00.000Z'), updated_at: new Date('2026-09-03T00:00:00.000Z') };
      return true;
    }),
  };
  return {
    app: createAuthenticatedTestApp({
      customerReadService: createCustomerReadService(repository, passthroughCustomerCrypto),
      customerEditService: createCustomerEditService(repository, passthroughCustomerCrypto),
      customerDeleteService: createCustomerDeleteService(repository),
    }, role),
    repository,
  };
};

describe('DELETE /api/v1/customers/:id', () => {
  it('returns 204 without a body and excludes the logically deleted customer from read/edit/re-delete', async () => {
    const { app, repository } = setup();
    const deleted = await authenticatedRequest(app).delete(`/api/v1/customers/${id}`);
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe('');
    expect(repository.logicalDeleteActiveById).toHaveBeenCalledOnce();

    const [detail, edit, repeated, list] = await Promise.all([
      authenticatedRequest(app).get(`/api/v1/customers/${id}`),
      authenticatedRequest(app).patch(`/api/v1/customers/${id}`).send({ name: 'After' }),
      authenticatedRequest(app).delete(`/api/v1/customers/${id}`),
      authenticatedRequest(app).get('/api/v1/customers?query=Sample'),
    ]);
    expect(detail.status).toBe(404);
    expect(edit.status).toBe(404);
    expect(repeated.status).toBe(404);
    expect(repeated.body).toEqual(notFound);
    expect(list.body).toMatchObject({ items: [], total_count: 0 });
  });

  it.each(['staff', 'manager'] as const)('rejects %s before lookup and delete', async (role) => {
    const { app, repository } = setup(role);
    const response = await authenticatedRequest(app).delete(`/api/v1/customers/${id}`);
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ code: 'FORBIDDEN', message: 'Forbidden.' });
    expect(repository.findActiveById).not.toHaveBeenCalled();
    expect(repository.logicalDeleteActiveById).not.toHaveBeenCalled();
  });

  it('returns the same 404 for a nonexistent customer and an already deleted customer', async () => {
    const { app } = setup();
    const missing = await authenticatedRequest(app).delete(`/api/v1/customers/${missingId}`);
    await authenticatedRequest(app).delete(`/api/v1/customers/${id}`);
    const repeated = await authenticatedRequest(app).delete(`/api/v1/customers/${id}`);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual(notFound);
    expect(repeated.body).toEqual(missing.body);
  });

  it('returns 400 for malformed UUID', async () => {
    const { app, repository } = setup();
    const response = await authenticatedRequest(app).delete('/api/v1/customers/not-a-uuid');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message: 'id must be a UUID.' });
    expect(repository.findActiveById).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    const { app } = setup();
    const response = await request(app).delete(`/api/v1/customers/${id}`);
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.' });
  });
});
