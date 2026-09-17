import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import type { CustomerRepository } from './customer-repository.js';

const ownerUserId = 'c0a80101-1234-4abc-8def-123456789abc';

const customer = {
  id: '8a1f2d44-1234-4abc-8def-123456789abc',
  name: '株式会社サンプル',
  name_kana: 'カブシキガイシャサンプル',
  email: 'sales@example.com',
  phone: '03-1234-5678',
  address: '東京都千代田区',
  category: '既存顧客',
  owner_user_id: ownerUserId,
  created_at: new Date('2026-09-13T00:00:00.000Z'),
  updated_at: new Date('2026-09-13T00:00:00.000Z'),
  deleted_at: null,
};

const createRepository = (): CustomerRepository => ({
  create: vi.fn().mockResolvedValue(customer),
});

describe('POST /api/v1/customers', () => {
  it('registers a valid customer and returns HTTP 201', async () => {
    const repository = createRepository();
    const response = await request(createApp({ customerRepository: repository }))
      .post('/api/v1/customers')
      .send({
        name: ' 株式会社サンプル ',
        name_kana: ' カブシキガイシャサンプル ',
        email: ' sales@example.com ',
        phone: '03-1234-5678',
        address: '東京都千代田区',
        category: '既存顧客',
        owner_user_id: ownerUserId,
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ...customer,
      created_at: customer.created_at.toISOString(),
      updated_at: customer.updated_at.toISOString(),
    });
    expect(repository.create).toHaveBeenCalledWith({
      name: '株式会社サンプル',
      name_kana: 'カブシキガイシャサンプル',
      email: 'sales@example.com',
      phone: '03-1234-5678',
      address: '東京都千代田区',
      category: '既存顧客',
      owner_user_id: ownerUserId,
    });
  });

  it.each([
    [{ owner_user_id: ownerUserId }, 'name is required.'],
    [{ name: '株式会社サンプル', owner_user_id: 'not-a-uuid' }, 'owner_user_id must be a UUID.'],
    [{ name: '株式会社サンプル', owner_user_id: ownerUserId, email: 'invalid-email' }, 'email must be a valid email address.'],
    [{ name: '株式会社サンプル', owner_user_id: ownerUserId, phone: 1234 }, 'phone must be a string.'],
  ])('returns HTTP 400 for invalid input', async (body, message) => {
    const repository = createRepository();
    const response = await request(createApp({ customerRepository: repository }))
      .post('/api/v1/customers')
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns HTTP 500 when the database write fails', async () => {
    const repository: CustomerRepository = {
      create: vi.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const response = await request(createApp({ customerRepository: repository }))
      .post('/api/v1/customers')
      .send({ name: '株式会社サンプル', owner_user_id: ownerUserId });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create customer.',
    });
  });

  it('returns HTTP 503 when the database is not configured', async () => {
    const response = await request(createApp())
      .post('/api/v1/customers')
      .send({ name: '株式会社サンプル', owner_user_id: ownerUserId });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Database is not configured.',
    });
  });
});
