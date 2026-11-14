import test from "node:test";
import assert from "node:assert/strict";
import {
  addWorkingDays,
  estimateDeliveryWindow,
  formatDeliveryRange,
  isWorkingDay,
  istCalendarDay,
  toIsoDay,
  TOTAL_WORKING_DAYS,
  DISPATCH_WORKING_DAYS,
  TRANSIT_WORKING_DAYS,
} from "../src/lib/delivery";

const iso = (d: Date) => toIsoDay(d);
// IST noon on a given calendar day, expressed in UTC.
const istNoon = (ymd: string) => new Date(`${ymd}T06:30:00Z`);
const win = (from: Date, holidays: string[] = []) => {
  const w = estimateDeliveryWindow(from, holidays);
  return [iso(w.earliest), iso(w.latest)];
};

test("policy constants: 1-3 dispatch + 3-7 transit = 4-10 working days", () => {
  assert.deepEqual(DISPATCH_WORKING_DAYS, { min: 1, max: 3 });
  assert.deepEqual(TRANSIT_WORKING_DAYS, { min: 3, max: 7 });
  assert.deepEqual(TOTAL_WORKING_DAYS, { min: 4, max: 10 });
});

test("Sundays are not working days; Saturdays are", () => {
  assert.equal(isWorkingDay(new Date("2026-10-25T00:00:00Z"), []), false); // Sunday
  assert.equal(isWorkingDay(new Date("2026-10-24T00:00:00Z"), []), true); // Saturday
  assert.equal(isWorkingDay(new Date("2026-10-26T00:00:00Z"), []), true); // Monday
});

test("ordered on a Monday", () => {
  assert.deepEqual(win(istNoon("2026-10-26")), ["2026-10-30", "2026-11-06"]);
});

test("ordered on a Sunday: counting starts the next working day", () => {
  assert.deepEqual(win(istNoon("2026-10-25")), ["2026-10-29", "2026-11-05"]);
});

test("ordered on a Saturday skips the following Sunday", () => {
  assert.deepEqual(win(istNoon("2026-10-31")), ["2026-11-05", "2026-11-12"]);
});

test("public holidays are skipped when supplied", () => {
  assert.deepEqual(win(istNoon("2026-10-26"), ["2026-10-28"]), ["2026-10-31", "2026-11-07"]);
});

test("no holidays are assumed by default", () => {
  assert.deepEqual(win(istNoon("2026-10-26")), win(istNoon("2026-10-26"), []));
});

test("uses the Indian calendar day, not UTC", () => {
  // 20:00 UTC Saturday 24 Oct = 01:30 IST Sunday 25 Oct
  assert.equal(iso(istCalendarDay(new Date("2026-10-24T20:00:00Z"))), "2026-10-25");
  assert.deepEqual(win(new Date("2026-10-24T20:00:00Z")), ["2026-10-29", "2026-11-05"]);
  // 18:00 UTC Sunday 25 Oct = 23:30 IST, still Sunday 25 Oct
  assert.deepEqual(win(new Date("2026-10-25T18:00:00Z")), ["2026-10-29", "2026-11-05"]);
  // 18:30 UTC Sunday 25 Oct = 00:00 IST Monday 26 Oct
  assert.deepEqual(win(new Date("2026-10-25T18:30:00Z")), ["2026-10-30", "2026-11-06"]);
});

test("crosses month and year boundaries", () => {
  assert.deepEqual(win(istNoon("2026-12-28")), ["2027-01-01", "2027-01-08"]);
});

test("earliest is always before latest and both are working days", () => {
  for (let i = 0; i < 400; i++) {
    const from = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000 + 5 * 3_600_000);
    const w = estimateDeliveryWindow(from, []);
    assert.ok(w.earliest < w.latest, `order ${i}`);
    assert.ok(isWorkingDay(w.earliest, []) && isWorkingDay(w.latest, []));
  }
});

test("addWorkingDays ignores zero/negative/fractional counts safely", () => {
  const d = new Date("2026-10-26T00:00:00Z");
  assert.equal(iso(addWorkingDays(d, 0, [])), "2026-10-26");
  assert.equal(iso(addWorkingDays(d, -3, [])), "2026-10-26");
  assert.equal(iso(addWorkingDays(d, 1.9, [])), "2026-10-27");
});

test("range label shows two dates and is never a single promised date", () => {
  const label = formatDeliveryRange(estimateDeliveryWindow(istNoon("2026-10-26"), []));
  assert.match(label, /^\w{3}, \d{1,2} \w{3} – \w{3}, \d{1,2} \w{3}$/);
  assert.ok(label.includes("30 Oct") && label.includes("6 Nov"));
});
