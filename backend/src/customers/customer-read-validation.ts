type CustomerIdValidationResult =
  | { valid: true; value: string }
  | { valid: false; message: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateCustomerId = (id: unknown): CustomerIdValidationResult => {
  if (typeof id !== 'string' || !uuidPattern.test(id)) {
    return { valid: false, message: 'id must be a UUID.' };
  }

  return { valid: true, value: id };
};
