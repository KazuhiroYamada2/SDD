import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth-types.js';
import type {
  Customer,
  CustomerListCriteria,
  CustomerReadRepository,
} from './customer-repository.js';
import {
  createCustomerReadService,
  CustomerNotFoundError,
  customerNotFoundResponse,
} from './customer-read-service.js';

const staff: AuthenticatedUser = { id: '11111111-1111-4111-8111-111111111111', role: 'staff' };
const otherOwnerId = '22222222-2222-4222-8222-222222222222';

const customer = (overrides: Partial<Customer> = {}): Customer => ({
  id: '8a1f2d44-1234-4abc-8def-123456789abc',
  name: '株式会社サンプル',
  name_kana: 'カブシキガイシャサンプル',
  email: 'sales@example.com',
  phone: '03-1234-5678',
  address: '東京都千代田区',
  category: '既存顧客',
  owner_user_id: staff.id,
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

const publicError = async (promise: Promise<unknown>) => {
  try {
    await promise;
    throw new Error('Expected CustomerNotFoundError.');
  } catch (error) {
    expect(error).toBeInstanceOf(CustomerNotFoundError);
    const notFound = error as CustomerNotFoundError;
    return { status: notFound.status, code: notFound.code, message: notFound.message };
  }
};

describe('createCustomerReadService list', () => {
  it('returns only active customers owned by staff and passes the security scope to the repository', async () => {
    const own = customer();
    const other = customer({ id: '33333333-3333-4333-8333-333333333333', owner_user_id: otherOwnerId });
    const deleted = customer({ id: '44444444-4444-4444-8444-444444444444', deleted_at: new Date() });
    const repository = repositoryFor([own, other, deleted]);
    const service = createCustomerReadService(repository);

    await expect(service.list(staff)).resolves.toMatchObject({
      items: [{ id: own.id, owner_user_id: staff.id }],
      page: 1,
      page_size: 20,
      total_count: 1,
      total_pages: 1,
    });
    expect(repository.list).toHaveBeenCalledWith({
      ownerScopeUserId: staff.id,
      sort: 'name_asc',
      limit: 20,
      offset: 0,
    });
  });

  it.each(['manager', 'admin'] as const)('returns all active customers for %s without an owner scope', async (role) => {
    const own = customer();
    const other = customer({ id: '33333333-3333-4333-8333-333333333333', owner_user_id: otherOwnerId });
    const deleted = customer({ id: '44444444-4444-4444-8444-444444444444', deleted_at: new Date() });
    const repository = repositoryFor([own, other, deleted]);
    const service = createCustomerReadService(repository);

    const result = await service.list({ id: staff.id, role });

    expect(result.items.map(({ id }) => id)).toEqual([own.id, other.id]);
    expect(repository.list).toHaveBeenCalledWith({ sort: 'name_asc', limit: 20, offset: 0 });
  });

  it.each(['staff', 'manager', 'admin'] as const)('excludes logically deleted customers for %s', async (role) => {
    const repository = repositoryFor([customer({ deleted_at: new Date() })]);
    const result = await createCustomerReadService(repository).list({ id: staff.id, role });

    expect(result).toEqual({ items: [], page: 1, page_size: 20, total_count: 0, total_pages: 0 });
  });

  it('passes filters, sort, and pagination to the repository and calculates metadata', async () => {
    const list = vi.fn().mockResolvedValue({ items: [customer()], totalCount: 101 });
    const repository: CustomerReadRepository = { list, findActiveById: vi.fn() };

    const result = await createCustomerReadService(repository).list(staff, {
      page: 3,
      pageSize: 50,
      query: 'Sample',
      category: 'A',
      ownerUserId: otherOwnerId,
      sort: 'created_at_desc',
    });

    expect(list).toHaveBeenCalledWith({
      ownerScopeUserId: staff.id,
      query: 'Sample',
      category: 'A',
      ownerUserId: otherOwnerId,
      sort: 'created_at_desc',
      limit: 50,
      offset: 100,
    });
    expect(result).toMatchObject({ page: 3, page_size: 50, total_count: 101, total_pages: 3 });
  });

  it.each(['manager', 'admin'] as const)('applies a client owner filter without a security scope for %s', async (role) => {
    const list = vi.fn().mockResolvedValue({ items: [], totalCount: 0 });
    const repository: CustomerReadRepository = { list, findActiveById: vi.fn() };

    await createCustomerReadService(repository).list({ id: staff.id, role }, {
      page: 1,
      pageSize: 20,
      ownerUserId: otherOwnerId,
      sort: 'name_asc',
    });

    expect(list).toHaveBeenCalledWith({
      ownerUserId: otherOwnerId,
      sort: 'name_asc',
      limit: 20,
      offset: 0,
    });
  });
});

describe('createCustomerReadService detail', () => {
  it('returns the common read DTO for a customer owned by staff', async () => {
    const own = customer();
    const result = await createCustomerReadService(repositoryFor([own])).findById(own.id, staff);

    expect(result).toEqual({
      ...own,
      created_at: own.created_at.toISOString(),
      updated_at: own.updated_at.toISOString(),
      deleted_at: null,
    });
  });

  it('hides another owner customer from staff', async () => {
    const other = customer({ owner_user_id: otherOwnerId });
    const error = await publicError(createCustomerReadService(repositoryFor([other])).findById(other.id, staff));

    expect(error).toEqual({ status: 404, ...customerNotFoundResponse });
  });

  it.each(['manager', 'admin'] as const)('returns another owner customer for %s', async (role) => {
    const other = customer({ owner_user_id: otherOwnerId });
    const result = await createCustomerReadService(repositoryFor([other]))
      .findById(other.id, { id: staff.id, role });

    expect(result.id).toBe(other.id);
    expect(result.owner_user_id).toBe(otherOwnerId);
  });

  it('returns the not-found contract for a missing customer', async () => {
    const error = await publicError(createCustomerReadService(repositoryFor([]))
      .findById(customer().id, staff));

    expect(error).toEqual({ status: 404, ...customerNotFoundResponse });
  });

  it.each(['staff', 'manager', 'admin'] as const)('treats a logically deleted customer as missing for %s', async (role) => {
    const deleted = customer({ deleted_at: new Date() });
    const error = await publicError(createCustomerReadService(repositoryFor([deleted]))
      .findById(deleted.id, { id: staff.id, role }));

    expect(error).toEqual({ status: 404, ...customerNotFoundResponse });
  });

  it('uses the same public error for another owner and a missing customer', async () => {
    const other = customer({ owner_user_id: otherOwnerId });
    const service = createCustomerReadService(repositoryFor([other]));

    const [scopeError, missingError] = await Promise.all([
      publicError(service.findById(other.id, staff)),
      publicError(service.findById('55555555-5555-4555-8555-555555555555', staff)),
    ]);

    expect(scopeError).toEqual(missingError);
    expect(scopeError).toEqual({ status: 404, ...customerNotFoundResponse });
  });
});
