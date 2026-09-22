import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createCustomerEditService } from './customer-edit-service.js';
import type { Customer, CustomerEditRepository } from './customer-repository.js';
import { authenticatedRequest, createAuthenticatedTestApp, testUserId } from '../test/authenticated-api.js';
import { passthroughCustomerCrypto } from '../test/customer-crypto.js';

const id = '8a1f2d44-1234-4abc-8def-123456789abc';
const otherOwnerId = '22222222-2222-4222-8222-222222222222';
const base: Customer = {
  id, name: 'Before', name_kana: null, email: 'before@example.test', phone: null,
  address: null, category: null, owner_user_id: testUserId,
  created_at: new Date('2026-09-01T00:00:00.000Z'), updated_at: new Date('2026-09-01T00:00:00.000Z'), deleted_at: null,
};

const setup = (role: 'staff' | 'manager' | 'admin' = 'staff', found: Customer | null = base) => {
  const repository: CustomerEditRepository = {
    list: vi.fn(),
    findActiveById: vi.fn().mockResolvedValue(found),
    updateActiveById: vi.fn().mockImplementation(async (_id, input) => found === null ? null : ({
      ...found, ...input, updated_at: new Date('2026-09-02T00:00:00.000Z'),
    })),
  };
  return {
    app: createAuthenticatedTestApp({ customerEditService: createCustomerEditService(repository, passthroughCustomerCrypto) }, role),
    repository,
  };
};

describe('PATCH /api/v1/customers/:id', () => {
  it('allows staff own partial update and returns the updated read DTO', async () => {
    const { app, repository } = setup();
    const response = await authenticatedRequest(app).patch(`/api/v1/customers/${id}`).send({ category: 'Updated' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id, name: 'Before', category: 'Updated', owner_user_id: testUserId });
    expect(repository.updateActiveById).toHaveBeenCalledWith(id, { category: 'Updated' });
  });

  it('returns the same 404 for staff scope outside and missing customers without update', async () => {
    const other = setup('staff', { ...base, owner_user_id: otherOwnerId });
    const missing = setup('staff', null);
    const [otherResponse, missingResponse] = await Promise.all([
      authenticatedRequest(other.app).patch(`/api/v1/customers/${id}`).send({ name: 'After' }),
      authenticatedRequest(missing.app).patch(`/api/v1/customers/${id}`).send({ name: 'After' }),
    ]);
    expect(otherResponse.status).toBe(404);
    expect(otherResponse.body).toEqual({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer was not found.' });
    expect(missingResponse.body).toEqual(otherResponse.body);
    expect(other.repository.updateActiveById).not.toHaveBeenCalled();
    expect(missing.repository.updateActiveById).not.toHaveBeenCalled();
  });

  it('rejects manager before validation or customer lookup', async () => {
    const { app, repository } = setup('manager');
    const response = await authenticatedRequest(app).patch(`/api/v1/customers/${id}`).send({});
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ code: 'FORBIDDEN', message: 'Forbidden.' });
    expect(repository.findActiveById).not.toHaveBeenCalled();
    expect(repository.updateActiveById).not.toHaveBeenCalled();
  });

  it('allows admin to edit another owner without changing ownership', async () => {
    const { app } = setup('admin', { ...base, owner_user_id: otherOwnerId });
    const response = await authenticatedRequest(app).patch(`/api/v1/customers/${id}`).send({ name: 'Admin update' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'Admin update', owner_user_id: otherOwnerId });
  });

  it.each([
    ['/api/v1/customers/not-a-uuid', { name: 'After' }, 'id must be a UUID.'],
    [`/api/v1/customers/${id}`, {}, 'At least one editable customer field is required.'],
    [`/api/v1/customers/${id}`, { owner_user_id: otherOwnerId }, 'Request body contains an unknown or non-editable field.'],
    [`/api/v1/customers/${id}`, { name: null }, 'name must be a non-empty string.'],
  ])('returns 400 validation error for %s %#', async (path, body, message) => {
    const { app } = setup();
    const response = await authenticatedRequest(app).patch(path).send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message });
  });

  it('requires authentication', async () => {
    const { app } = setup();
    const response = await request(app).patch(`/api/v1/customers/${id}`).send({ name: 'After' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.' });
  });
});
