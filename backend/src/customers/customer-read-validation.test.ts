import { describe, expect, it } from 'vitest';
import { validateCustomerId, validateCustomerListQuery } from './customer-read-validation.js';

describe('validateCustomerId', () => {
  it('accepts a UUID customer id', () => {
    expect(validateCustomerId('8a1f2d44-1234-4abc-8def-123456789abc')).toEqual({
      valid: true,
      value: '8a1f2d44-1234-4abc-8def-123456789abc',
    });
  });

  it.each([undefined, 123, 'not-a-uuid', ''])('rejects an invalid customer id', (id) => {
    expect(validateCustomerId(id)).toEqual({ valid: false, message: 'id must be a UUID.' });
  });
});

describe('validateCustomerListQuery', () => {
  it('applies the T-202 compatible defaults', () => {
    expect(validateCustomerListQuery({})).toEqual({
      valid: true,
      value: {
        page: 1,
        pageSize: 20,
        query: undefined,
        category: undefined,
        ownerUserId: undefined,
        sort: 'name_asc',
      },
    });
  });

  it('parses and trims all supported query parameters', () => {
    expect(validateCustomerListQuery({
      page: '2',
      page_size: '50',
      query: '  Sample  ',
      category: '  A  ',
      owner_user_id: '22222222-2222-4222-8222-222222222222',
      sort: 'created_at_desc',
    })).toEqual({
      valid: true,
      value: {
        page: 2,
        pageSize: 50,
        query: 'Sample',
        category: 'A',
        ownerUserId: '22222222-2222-4222-8222-222222222222',
        sort: 'created_at_desc',
      },
    });
  });

  it.each(['', '   '])('treats an empty query and category as no filter (%j)', (value) => {
    expect(validateCustomerListQuery({ query: value, category: value })).toMatchObject({
      valid: true,
      value: { query: undefined, category: undefined },
    });
  });

  it.each(['0', '-1', '1.5', 'abc'])('rejects invalid page %j', (page) => {
    expect(validateCustomerListQuery({ page })).toEqual({
      valid: false,
      message: 'page must be a positive integer.',
    });
  });

  it.each(['0', '-1', '1.5', '101', 'abc'])('rejects invalid page_size %j', (page_size) => {
    expect(validateCustomerListQuery({ page_size })).toEqual({
      valid: false,
      message: 'page_size must be an integer between 1 and 100.',
    });
  });

  it('rejects an unsupported sort', () => {
    expect(validateCustomerListQuery({ sort: 'name' })).toEqual({
      valid: false,
      message: 'sort must be one of name_asc, name_desc, created_at_asc, created_at_desc.',
    });
  });

  it('rejects an invalid owner_user_id', () => {
    expect(validateCustomerListQuery({ owner_user_id: 'not-a-uuid' })).toEqual({
      valid: false,
      message: 'owner_user_id must be a UUID.',
    });
  });
});
