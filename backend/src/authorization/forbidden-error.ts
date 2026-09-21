export const forbiddenResponse = Object.freeze({
  code: 'FORBIDDEN',
  message: 'Forbidden.',
});

export class ForbiddenError extends Error {
  readonly status = 403;
  readonly code = forbiddenResponse.code;

  constructor() {
    super(forbiddenResponse.message);
    this.name = 'ForbiddenError';
  }
}
