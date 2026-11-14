/**
 * Delivery estimate, derived from the Shipping Policy:
 *   - dispatch within 1 to 3 working days after payment is confirmed
 *   - then 3 to 7 working days in transit
 * Working day = Monday to Saturday (the policy says orders are not shipped on
 * Sundays and public holidays). Counting starts the working day AFTER the order
 * date, so same-day dispatch is never assumed.
 *
 * This file is dependency-free on purpose so it can be unit-tested in isolation.
 * It is an estimate, never a guarantee; the UI must say so.
 */

export const DISPATCH_WORKING_DAYS = { min: 1, max: 3 } as const;
export const TRANSIT_WORKING_DAYS = { min: 3, max: 7 } as const;
export const TOTAL_WORKING_DAYS = {
  min: DISPATCH_WORKING_DAYS.min + TRANSIT_WORKING_DAYS.min,
  max: DISPATCH_WORKING_DAYS.max + TRANSIT_WORKING_DAYS.max,
} as const;

/**
 * Public holidays to skip, as "YYYY-MM-DD" (Indian calendar dates).
 * Empty by default: no holiday list has been supplied, so none are assumed.
 * Add dates here and every estimate follows.
 */
export const PUBLIC_HOLIDAYS: readonly string[] = [];

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The Indian calendar day of `from`, as a Date at 00:00 UTC (calendar arithmetic only). */
export function istCalendarDay(from: Date): Date {
  const shifted = new Date(from.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

export function toIsoDay(day: Date): string {
  return day.toISOString().slice(0, 10);
}

export function isWorkingDay(day: Date, holidays: readonly string[] = PUBLIC_HOLIDAYS): boolean {
  return day.getUTCDay() !== 0 && !holidays.includes(toIsoDay(day));
}

/** Moves forward `count` working days from `start` (start itself is never counted). */
export function addWorkingDays(
  start: Date,
  count: number,
  holidays: readonly string[] = PUBLIC_HOLIDAYS
): Date {
  let day = new Date(start.getTime());
  let remaining = Math.max(0, Math.floor(count));
  while (remaining > 0) {
    day = new Date(day.getTime() + DAY_MS);
    if (isWorkingDay(day, holidays)) remaining -= 1;
  }
  return day;
}

export type DeliveryWindow = { earliest: Date; latest: Date };

/** Estimated delivery window if the order is placed at `from` (Indian time). */
export function estimateDeliveryWindow(
  from: Date = new Date(),
  holidays: readonly string[] = PUBLIC_HOLIDAYS
): DeliveryWindow {
  const orderDay = istCalendarDay(from);
  return {
    earliest: addWorkingDays(orderDay, TOTAL_WORKING_DAYS.min, holidays),
    latest: addWorkingDays(orderDay, TOTAL_WORKING_DAYS.max, holidays),
  };
}

function formatDay(day: Date): string {
  return day.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC", // `day` is a pure calendar date held at 00:00 UTC
  });
}

/** e.g. "Thu, 29 Oct – Thu, 5 Nov" */
export function formatDeliveryRange(window: DeliveryWindow): string {
  return `${formatDay(window.earliest)} – ${formatDay(window.latest)}`;
}

export function deliveryRangeLabel(from: Date = new Date()): string {
  return formatDeliveryRange(estimateDeliveryWindow(from));
}
