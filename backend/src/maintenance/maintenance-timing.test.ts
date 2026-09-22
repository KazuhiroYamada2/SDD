import { describe, expect, it } from 'vitest';
import {
  calculateInitialDeadline, calculateReminderWindow, evaluateEmergencyTiming,
  evaluateMaintenanceEventTiming, evaluatePlannedInitial, evaluatePlannedReminder,
} from './maintenance-timing.js';

describe('maintenance timing', () => {
  it.each([
    ['Monday', '2026-10-05T13:00:00+09:00', '2026-09-30T13:00:00+09:00'],
    ['Tuesday', '2026-10-06T13:00:00+09:00', '2026-10-01T13:00:00+09:00'],
    ['Wednesday', '2026-10-07T13:00:00+09:00', '2026-10-02T13:00:00+09:00'],
    ['Thursday', '2026-10-08T13:00:00+09:00', '2026-10-05T13:00:00+09:00'],
    ['Friday', '2026-10-09T13:00:00+09:00', '2026-10-06T13:00:00+09:00'],
  ])('calculates the previous third business day for %s', (_day, startsAt, expected) => {
    expect(calculateInitialDeadline(new Date(startsAt))).toEqual(new Date(expected));
  });

  it('accepts INITIAL at the deadline and one second before, but rejects one second after', () => {
    const startsAt = new Date('2026-10-09T13:00:00+09:00');
    const deadline = calculateInitialDeadline(startsAt);
    expect(evaluatePlannedInitial(startsAt, 'SENT', deadline).reasonCode).toBe('INITIAL_ON_TIME');
    expect(evaluatePlannedInitial(startsAt, 'SENT', new Date(deadline.getTime() - 1000)).result).toBe('PASS');
    expect(evaluatePlannedInitial(startsAt, 'SENT', new Date(deadline.getTime() + 1000)).reasonCode).toBe('INITIAL_LATE');
    expect(evaluatePlannedInitial(startsAt, 'FAILED', null).reasonCode).toBe('DELIVERY_NOT_SENT');
  });

  it('uses a reminder window of 60 minutes before plus or minus five minutes', () => {
    const startsAt = new Date('2026-10-09T13:00:00+09:00');
    const { windowStart, windowEnd } = calculateReminderWindow(startsAt);
    expect(evaluatePlannedReminder(startsAt, 'SENT', windowStart).result).toBe('PASS');
    expect(evaluatePlannedReminder(startsAt, 'SENT', new Date(startsAt.getTime() - 60 * 60_000)).result).toBe('PASS');
    expect(evaluatePlannedReminder(startsAt, 'SENT', windowEnd).result).toBe('PASS');
    expect(evaluatePlannedReminder(startsAt, 'SENT', new Date(windowStart.getTime() - 1000)).reasonCode).toBe('REMINDER_TOO_EARLY');
    expect(evaluatePlannedReminder(startsAt, 'SENT', new Date(windowEnd.getTime() + 1000)).reasonCode).toBe('REMINDER_LATE');
    expect(evaluatePlannedReminder(startsAt, 'SENT', startsAt).reasonCode).toBe('REMINDER_LATE');
  });

  it('evaluates emergency first attempts at exact, 5, and 15 minutes as on time', () => {
    const createdAt = new Date('2026-10-09T04:00:00Z');
    for (const minutes of [0, 5, 15]) {
      expect(evaluateEmergencyTiming(createdAt, new Date(createdAt.getTime() + minutes * 60_000)).result).toBe('PASS');
    }
    expect(evaluateEmergencyTiming(createdAt, new Date(createdAt.getTime() + 15 * 60_000 + 1000)).reasonCode).toBe('EMERGENCY_LATE');
    expect(evaluateEmergencyTiming(createdAt, new Date(createdAt.getTime() - 1000)).reasonCode).toBe('INVALID_TIMESTAMP');
  });

  it('separates emergency timing from delivery status and keeps retry timing on the first attempt', () => {
    const createdAt = new Date('2026-10-09T04:00:00Z');
    const summary = evaluateMaintenanceEventTiming(
      { id: 'event', type: 'EMERGENCY', startsAt: new Date('2026-10-09T05:00:00Z'), createdAt },
      [{ phase: 'EMERGENCY', status: 'FAILED', firstAttemptedAt: new Date(createdAt.getTime() + 5 * 60_000), attemptedAt: new Date(createdAt.getTime() + 20 * 60_000), sentAt: null }],
    )[0]!;
    expect(summary).toMatchObject({ result: 'PASS', passCount: 1, deliverySentCount: 0, deliveryFailedCount: 1 });
  });
});
