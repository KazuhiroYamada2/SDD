import { describe, expect, it } from 'vitest';
import { calculateAvailability, generateExpectedAvailabilitySlots, getAvailabilityRange } from './availability-calculator.js';

const completedNow = new Date('2026-10-02T00:00:00Z');

describe('business-hours availability calculator', () => {
  it('generates Monday-Friday JST 09:00 through 17:55 at five-minute intervals', () => {
    const slots = generateExpectedAvailabilitySlots('2026-09', completedNow);
    expect(slots).toHaveLength(22 * 9 * 12);
    expect(slots[0]?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(slots[107]?.toISOString()).toBe('2026-09-01T08:55:00.000Z');
    expect(slots.some((slot) => slot.toISOString() === '2026-09-05T00:00:00.000Z')).toBe(false);
    expect(slots.some((slot) => slot.toISOString() === '2026-09-01T09:00:00.000Z')).toBe(false);
  });

  it('uses JST rather than UTC for month boundaries', () => {
    expect(getAvailabilityRange('2026-09', completedNow)).toEqual({
      start: new Date('2026-08-31T15:00:00.000Z'),
      end: new Date('2026-09-30T15:00:00.000Z'),
    });
  });

  it('reports all-success, exactly 99 percent, and below 99 percent correctly', () => {
    const slots = generateExpectedAvailabilitySlots('2026-09', completedNow).slice(0, 100);
    const now = new Date(slots.at(-1)!.getTime());
    const allSuccess = calculateAvailability('2026-09', slots.map((timestamp) => ({ timestamp, successful: true })), now);
    expect(allSuccess).toMatchObject({ expectedSamples: 100, successfulSamples: 100, availabilityPercent: 100, result: 'PASS' });
    const exact = calculateAvailability('2026-09', slots.slice(0, 99).map((timestamp) => ({ timestamp, successful: true })), now);
    expect(exact).toMatchObject({ expectedSamples: 100, successfulSamples: 99, missingSamples: 1, availabilityPercent: 99, result: 'PASS' });
    const below = calculateAvailability('2026-09', slots.slice(0, 98).map((timestamp) => ({ timestamp, successful: true })), now);
    expect(below.availabilityPercent).toBe(98);
    expect(below.result).toBe('FAIL');
  });

  it('separates explicit failures and missing samples while retaining the expected denominator', () => {
    const slots = generateExpectedAvailabilitySlots('2026-09', completedNow).slice(0, 4);
    const report = calculateAvailability('2026-09', [
      { timestamp: slots[0]!, successful: true },
      { timestamp: slots[1]!, successful: false },
    ], slots[3]);
    expect(report).toMatchObject({ expectedSamples: 4, successfulSamples: 1, failedSamples: 1, missingSamples: 2, result: 'FAIL' });
  });

  it('ignores weekend and outside-window points and does not double-count duplicates', () => {
    const now = new Date('2026-09-01T00:05:00Z');
    const report = calculateAvailability('2026-09', [
      { timestamp: new Date('2026-09-01T00:00:00Z'), successful: true },
      { timestamp: new Date('2026-09-01T00:00:01Z'), successful: true },
      { timestamp: new Date('2026-09-01T09:00:00Z'), successful: true },
      { timestamp: new Date('2026-09-05T00:00:00Z'), successful: true },
    ], now);
    expect(report).toMatchObject({ expectedSamples: 2, successfulSamples: 1, missingSamples: 1 });
  });

  it('treats any duplicate failure as failure for that slot', () => {
    const now = new Date('2026-09-01T00:00:00Z');
    const report = calculateAvailability('2026-09', [
      { timestamp: now, successful: true }, { timestamp: now, successful: false },
    ], now);
    expect(report).toMatchObject({ expectedSamples: 1, successfulSamples: 0, failedSamples: 1 });
  });

  it('excludes future slots from current month and rejects future months', () => {
    const now = new Date('2026-09-01T00:07:00Z');
    expect(generateExpectedAvailabilitySlots('2026-09', now)).toHaveLength(2);
    expect(() => generateExpectedAvailabilitySlots('2026-10', now)).toThrow('Future availability month');
  });

  it('handles leap and non-leap February without including weekends', () => {
    expect(generateExpectedAvailabilitySlots('2024-02', new Date('2024-03-02T00:00:00Z'))).toHaveLength(21 * 108);
    expect(generateExpectedAvailabilitySlots('2025-02', new Date('2025-03-02T00:00:00Z'))).toHaveLength(20 * 108);
  });
});
