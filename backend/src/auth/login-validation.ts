export type LoginInput = {
  email: string;
  password: string;
};

export type LoginValidationResult =
  | { valid: true; value: LoginInput }
  | { valid: false; message: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const validateLogin = (body: unknown): LoginValidationResult => {
  if (!isObject(body)) {
    return { valid: false, message: 'Request body must be a JSON object.' };
  }

  if (typeof body.email !== 'string') {
    return { valid: false, message: 'email must be a string.' };
  }
  const email = body.email.trim();
  if (email === '') {
    return { valid: false, message: 'email is required.' };
  }
  if (email.length > 254) {
    return { valid: false, message: 'email must be at most 254 characters.' };
  }

  if (typeof body.password !== 'string') {
    return { valid: false, message: 'password must be a string.' };
  }
  if (body.password === '') {
    return { valid: false, message: 'password is required.' };
  }
  if (body.password.length > 1024) {
    return { valid: false, message: 'password must be at most 1024 characters.' };
  }

  return { valid: true, value: { email, password: body.password } };
};
