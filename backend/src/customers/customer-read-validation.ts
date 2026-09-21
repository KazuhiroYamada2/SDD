import {
  customerSortValues,
  type CustomerListQuery,
  type CustomerSort,
} from './customer-read-types.js';

type CustomerIdValidationResult =
  | { valid: true; value: string }
  | { valid: false; message: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CustomerListQueryValidationResult =
  | { valid: true; value: CustomerListQuery }
  | { valid: false; message: string };

const firstString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const parsePositiveInteger = (value: unknown, defaultValue: number): number | null => {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
};

const trimmedFilter = (value: unknown): string | undefined => {
  const trimmed = firstString(value)?.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const validateCustomerId = (id: unknown): CustomerIdValidationResult => {
  if (typeof id !== 'string' || !uuidPattern.test(id)) {
    return { valid: false, message: 'id must be a UUID.' };
  }

  return { valid: true, value: id };
};

export const validateCustomerListQuery = (query: Record<string, unknown>): CustomerListQueryValidationResult => {
  const page = parsePositiveInteger(query.page, 1);
  if (page === null) {
    return { valid: false, message: 'page must be a positive integer.' };
  }

  const pageSize = parsePositiveInteger(query.page_size, 20);
  if (pageSize === null || pageSize > 100) {
    return { valid: false, message: 'page_size must be an integer between 1 and 100.' };
  }

  const sortValue = query.sort === undefined ? 'name_asc' : firstString(query.sort);
  if (sortValue === undefined || !customerSortValues.includes(sortValue as CustomerSort)) {
    return {
      valid: false,
      message: 'sort must be one of name_asc, name_desc, created_at_asc, created_at_desc.',
    };
  }

  const ownerUserId = query.owner_user_id === undefined
    ? undefined
    : firstString(query.owner_user_id);
  if ((ownerUserId === undefined && query.owner_user_id !== undefined) ||
      (ownerUserId !== undefined && !uuidPattern.test(ownerUserId))) {
    return { valid: false, message: 'owner_user_id must be a UUID.' };
  }

  return {
    valid: true,
    value: {
      page,
      pageSize,
      query: trimmedFilter(query.query),
      category: trimmedFilter(query.category),
      ownerUserId,
      sort: sortValue as CustomerSort,
    },
  };
};
