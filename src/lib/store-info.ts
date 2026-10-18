import { SITE } from "@/lib/site";

/** Promised delivery time, in days from today. Change this number to change every product page. */
export const DELIVERY_DAYS = 6;

/** Return window. Change it in src/lib/site.ts (returnDays). */
export const RETURN_DAYS = SITE.returnDays;

/** "Sat, 24 Oct" for today + DELIVERY_DAYS, in Indian time. */
export function deliveryDateLabel(from: Date = new Date()) {
  const d = new Date(from.getTime() + DELIVERY_DAYS * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}
