import type { Decimal } from "@prisma/client/runtime/library";

export function formatMoney(amount: Decimal | number | string, currency = "INR") {
  const value = typeof amount === "object" ? Number(amount.toString()) : Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

const DATE_LOCALE = "en-IN";

export function formatDate(date: Date | string | number, opts: { year?: boolean } = {}) {
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: "numeric",
    month: "short",
    year: opts.year === false ? undefined : "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | number, opts: { year?: boolean } = {}) {
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: "numeric",
    month: "short",
    year: opts.year ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}
