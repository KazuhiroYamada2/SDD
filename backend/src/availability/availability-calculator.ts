export const AVAILABILITY_TIMEZONE = 'Asia/Tokyo';
export const AVAILABILITY_TARGET_PERCENT = 99;
export const AVAILABILITY_INTERVAL_MINUTES = 5;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const SLOT_MS = AVAILABILITY_INTERVAL_MINUTES * 60 * 1000;
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type AvailabilityDatapoint = { timestamp: Date; successful: boolean };
export type AvailabilityReport = {
  month: string;
  timezone: typeof AVAILABILITY_TIMEZONE;
  targetPercent: number;
  expectedSamples: number;
  successfulSamples: number;
  failedSamples: number;
  missingSamples: number;
  availabilityPercent: number;
  result: 'PASS' | 'FAIL';
};

function parseMonth(month: string) {
  const match = MONTH_PATTERN.exec(month);
  if (match === null) throw new Error('Availability month must use YYYY-MM.');
  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
}

function jstMonthKey(date: Date) {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getAvailabilityRange(month: string, now = new Date()) {
  const parsed = parseMonth(month);
  const start = new Date(Date.UTC(parsed.year, parsed.monthIndex, 1) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(parsed.year, parsed.monthIndex + 1, 1) - JST_OFFSET_MS);
  const currentMonth = jstMonthKey(now);
  if (month > currentMonth) throw new Error('Future availability month cannot be reported.');
  return { start, end: month === currentMonth && now < end ? now : end };
}

export function generateExpectedAvailabilitySlots(month: string, now = new Date()) {
  const { year, monthIndex } = parseMonth(month);
  const range = getAvailabilityRange(month, now);
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const slots: Date[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    for (let hour = 9; hour < 18; hour += 1) {
      for (let minute = 0; minute < 60; minute += AVAILABILITY_INTERVAL_MINUTES) {
        const slot = new Date(Date.UTC(year, monthIndex, day, hour - 9, minute));
        if (slot >= range.start && slot <= range.end) slots.push(slot);
      }
    }
  }
  return slots;
}

const slotKey = (date: Date) => Math.floor(date.getTime() / SLOT_MS) * SLOT_MS;

export function calculateAvailability(
  month: string,
  datapoints: AvailabilityDatapoint[],
  now = new Date(),
): AvailabilityReport {
  const slots = generateExpectedAvailabilitySlots(month, now);
  const expected = new Set(slots.map((slot) => slot.getTime()));
  const observed = new Map<number, boolean>();
  for (const datapoint of datapoints) {
    const key = slotKey(datapoint.timestamp);
    if (!expected.has(key)) continue;
    observed.set(key, (observed.get(key) ?? true) && datapoint.successful);
  }

  let successfulSamples = 0;
  let failedSamples = 0;
  for (const value of observed.values()) value ? successfulSamples += 1 : failedSamples += 1;
  const missingSamples = slots.length - successfulSamples - failedSamples;
  const availabilityPercent = slots.length === 0 ? 100 : successfulSamples / slots.length * 100;
  return {
    month,
    timezone: AVAILABILITY_TIMEZONE,
    targetPercent: AVAILABILITY_TARGET_PERCENT,
    expectedSamples: slots.length,
    successfulSamples,
    failedSamples,
    missingSamples,
    availabilityPercent,
    result: availabilityPercent >= AVAILABILITY_TARGET_PERCENT ? 'PASS' : 'FAIL',
  };
}
