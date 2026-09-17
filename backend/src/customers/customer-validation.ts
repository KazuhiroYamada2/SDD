import type { CreateCustomerInput } from './customer-repository.js';

type ValidationResult =
  | { valid: true; value: CreateCustomerInput }
  | { valid: false; message: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const optionalFields = ['name_kana', 'email', 'phone', 'address', 'category'] as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (body: Record<string, unknown>, field: (typeof optionalFields)[number]) => {
  const value = body[field];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
};

export const validateCreateCustomer = (body: unknown): ValidationResult => {
  if (!isObject(body)) {
    return { valid: false, message: 'Request body must be a JSON object.' };
  }

  if (typeof body.name !== 'string' || body.name.trim() === '') {
    return { valid: false, message: 'name is required.' };
  }

  if (typeof body.owner_user_id !== 'string' || !uuidPattern.test(body.owner_user_id)) {
    return { valid: false, message: 'owner_user_id must be a UUID.' };
  }

  for (const field of optionalFields) {
    if (body[field] !== undefined && typeof body[field] !== 'string') {
      return { valid: false, message: `${field} must be a string.` };
    }
  }

  const email = optionalString(body, 'email');
  if (email !== null && !emailPattern.test(email)) {
    return { valid: false, message: 'email must be a valid email address.' };
  }

  return {
    valid: true,
    value: {
      name: body.name.trim(),
      name_kana: optionalString(body, 'name_kana'),
      email,
      phone: optionalString(body, 'phone'),
      address: optionalString(body, 'address'),
      category: optionalString(body, 'category'),
      owner_user_id: body.owner_user_id,
    },
  };
};
