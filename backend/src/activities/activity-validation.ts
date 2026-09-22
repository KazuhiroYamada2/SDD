import type { ActivityType, CreateActivityInput } from './activity-repository.js';

export type CreateActivityRequestDto = {
  customerId: string | undefined;
  body: unknown;
};

type ValidationResult =
  | { valid: true; value: CreateActivityInput }
  | { valid: false; message: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const activityTypes: readonly ActivityType[] = ['visit', 'meeting'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseOptionalDate = (
  body: Record<string, unknown>,
  field: 'visited_at' | 'next_visit_at',
): { valid: true; value: Date | null } | { valid: false; message: string } => {
  const value = body[field];
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    return { valid: false, message: `${field} must be a valid date-time string.` };
  }

  return { valid: true, value: new Date(value) };
};

export const validateCreateActivity = (request: CreateActivityRequestDto): ValidationResult => {
  if (typeof request.customerId !== 'string' || !uuidPattern.test(request.customerId)) {
    return { valid: false, message: 'customerId must be a UUID.' };
  }

  if (!isObject(request.body)) {
    return { valid: false, message: 'Request body must be a JSON object.' };
  }

  if (typeof request.body.user_id !== 'string' || !uuidPattern.test(request.body.user_id)) {
    return { valid: false, message: 'user_id must be a UUID.' };
  }

  if (!activityTypes.includes(request.body.activity_type as ActivityType)) {
    return { valid: false, message: "activity_type must be either 'visit' or 'meeting'." };
  }

  if (request.body.meeting_note !== undefined && request.body.meeting_note !== null && typeof request.body.meeting_note !== 'string') {
    return { valid: false, message: 'meeting_note must be a string.' };
  }

  const visitedAt = parseOptionalDate(request.body, 'visited_at');
  if (!visitedAt.valid) {
    return visitedAt;
  }

  const nextVisitAt = parseOptionalDate(request.body, 'next_visit_at');
  if (!nextVisitAt.valid) {
    return nextVisitAt;
  }

  return {
    valid: true,
    value: {
      customer_id: request.customerId,
      user_id: request.body.user_id,
      activity_type: request.body.activity_type as ActivityType,
      visited_at: visitedAt.value,
      meeting_note: typeof request.body.meeting_note === 'string' ? request.body.meeting_note.trim() || null : null,
      next_visit_at: nextVisitAt.value,
    },
  };
};
