import type { MaintenanceType, NotificationPhase } from './maintenance-service.js';

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export type TimingReasonCode =
  | 'INITIAL_ON_TIME' | 'INITIAL_LATE'
  | 'REMINDER_ON_TIME' | 'REMINDER_TOO_EARLY' | 'REMINDER_LATE'
  | 'EMERGENCY_ON_TIME' | 'EMERGENCY_LATE'
  | 'DELIVERY_NOT_SENT' | 'INVALID_TIMESTAMP';

export type TimingEvaluation = {
  result: 'PASS' | 'FAIL';
  reasonCode: TimingReasonCode;
  expected: { deadline?: Date; windowStart?: Date; windowEnd?: Date };
  actual: Date | null;
};

const validDate = (date: Date | null): date is Date => date !== null && !Number.isNaN(date.getTime());
const pass = (reasonCode: TimingReasonCode, expected: TimingEvaluation['expected'], actual: Date): TimingEvaluation => ({ result: 'PASS', reasonCode, expected, actual });
const fail = (reasonCode: TimingReasonCode, expected: TimingEvaluation['expected'], actual: Date | null): TimingEvaluation => ({ result: 'FAIL', reasonCode, expected, actual });

export function calculateInitialDeadline(startsAt: Date): Date {
  if (!validDate(startsAt)) throw new Error('Maintenance timing timestamp is invalid.');
  const local = new Date(startsAt.getTime() + JST_OFFSET_MS);
  let remaining = 3;
  while (remaining > 0) {
    local.setUTCDate(local.getUTCDate() - 1);
    const weekday = local.getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return new Date(local.getTime() - JST_OFFSET_MS);
}

export function calculateReminderWindow(startsAt: Date) {
  if (!validDate(startsAt)) throw new Error('Maintenance timing timestamp is invalid.');
  return {
    windowStart: new Date(startsAt.getTime() - 65 * MINUTE_MS),
    windowEnd: new Date(startsAt.getTime() - 55 * MINUTE_MS),
  };
}

export function evaluatePlannedInitial(startsAt: Date, status: string, sentAt: Date | null): TimingEvaluation {
  const expected = { deadline: calculateInitialDeadline(startsAt) };
  if (status !== 'SENT' || sentAt === null) return fail('DELIVERY_NOT_SENT', expected, sentAt);
  if (!validDate(sentAt)) return fail('INVALID_TIMESTAMP', expected, sentAt);
  return sentAt <= expected.deadline
    ? pass('INITIAL_ON_TIME', expected, sentAt)
    : fail('INITIAL_LATE', expected, sentAt);
}

export function evaluatePlannedReminder(startsAt: Date, status: string, sentAt: Date | null): TimingEvaluation {
  const expected = calculateReminderWindow(startsAt);
  if (status !== 'SENT' || sentAt === null) return fail('DELIVERY_NOT_SENT', expected, sentAt);
  if (!validDate(sentAt)) return fail('INVALID_TIMESTAMP', expected, sentAt);
  if (sentAt < expected.windowStart) return fail('REMINDER_TOO_EARLY', expected, sentAt);
  if (sentAt > expected.windowEnd) return fail('REMINDER_LATE', expected, sentAt);
  return pass('REMINDER_ON_TIME', expected, sentAt);
}

export function evaluateEmergencyTiming(createdAt: Date, firstAttemptedAt: Date | null): TimingEvaluation {
  const expected = { deadline: new Date(createdAt.getTime() + 15 * MINUTE_MS) };
  if (!validDate(createdAt) || !validDate(firstAttemptedAt) || firstAttemptedAt < createdAt) {
    return fail('INVALID_TIMESTAMP', expected, firstAttemptedAt);
  }
  return firstAttemptedAt <= expected.deadline
    ? pass('EMERGENCY_ON_TIME', expected, firstAttemptedAt)
    : fail('EMERGENCY_LATE', expected, firstAttemptedAt);
}

export type TimingDelivery = {
  phase: NotificationPhase;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attemptedAt: Date;
  firstAttemptedAt: Date;
  sentAt: Date | null;
};

export type TimingEvent = { id: string; type: MaintenanceType; startsAt: Date; createdAt: Date };
export type PhaseTimingSummary = {
  phase: NotificationPhase;
  targetCount: number;
  passCount: number;
  failCount: number;
  deliverySentCount: number;
  deliveryFailedCount: number;
  reasonCounts: Partial<Record<TimingReasonCode, number>>;
  result: 'PASS' | 'FAIL';
  expected: { deadline?: string; windowStart?: string; windowEnd?: string };
};

export function evaluateMaintenanceEventTiming(event: TimingEvent, deliveries: TimingDelivery[]): PhaseTimingSummary[] {
  const validPhases: NotificationPhase[] = event.type === 'PLANNED' ? ['INITIAL', 'REMINDER'] : ['EMERGENCY'];
  const phases = validPhases.filter((phase) => deliveries.some((delivery) => delivery.phase === phase));
  return phases.map((phase) => {
    const targets = deliveries.filter((delivery) => delivery.phase === phase);
    const evaluations = targets.map((delivery) => phase === 'INITIAL'
      ? evaluatePlannedInitial(event.startsAt, delivery.status, delivery.sentAt)
      : phase === 'REMINDER'
        ? evaluatePlannedReminder(event.startsAt, delivery.status, delivery.sentAt)
        : evaluateEmergencyTiming(event.createdAt, delivery.firstAttemptedAt));
    const reasonCounts: Partial<Record<TimingReasonCode, number>> = {};
    for (const evaluation of evaluations) reasonCounts[evaluation.reasonCode] = (reasonCounts[evaluation.reasonCode] ?? 0) + 1;
    const expected = evaluations[0]?.expected ?? (phase === 'INITIAL'
      ? { deadline: calculateInitialDeadline(event.startsAt) }
      : phase === 'REMINDER' ? calculateReminderWindow(event.startsAt) : { deadline: new Date(event.createdAt.getTime() + 15 * MINUTE_MS) });
    const passCount = evaluations.filter((evaluation) => evaluation.result === 'PASS').length;
    return {
      phase,
      targetCount: targets.length,
      passCount,
      failCount: targets.length - passCount,
      deliverySentCount: targets.filter((delivery) => delivery.status === 'SENT').length,
      deliveryFailedCount: targets.filter((delivery) => delivery.status === 'FAILED').length,
      reasonCounts,
      result: targets.length > 0 && passCount === targets.length ? 'PASS' : 'FAIL',
      expected: {
        deadline: expected.deadline?.toISOString(),
        windowStart: expected.windowStart?.toISOString(),
        windowEnd: expected.windowEnd?.toISOString(),
      },
    };
  });
}
