import type { SalesTrendQuery } from './sales-trend-repository.js';

type ValidationResult =
  | { valid: true; value: SalesTrendQuery }
  | { valid: false; message: string };

const isValidDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) {
    return false;
  }

  const daysInMonth = [31, (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysInMonth[month - 1]!;
};

export const validateSalesTrendQuery = (query: unknown): ValidationResult => {
  const parameters = query as { from?: unknown; to?: unknown };
  if (typeof parameters.from !== 'string' || parameters.from === '') {
    return { valid: false, message: 'from is required.' };
  }
  if (typeof parameters.to !== 'string' || parameters.to === '') {
    return { valid: false, message: 'to is required.' };
  }
  if (!isValidDate(parameters.from)) {
    return { valid: false, message: 'from must be a valid YYYY-MM-DD date.' };
  }
  if (!isValidDate(parameters.to)) {
    return { valid: false, message: 'to must be a valid YYYY-MM-DD date.' };
  }
  if (parameters.from > parameters.to) {
    return { valid: false, message: 'from must be on or before to.' };
  }

  return { valid: true, value: { from: parameters.from, to: parameters.to } };
};
