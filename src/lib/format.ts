import type { Decimal } from "@prisma/client/runtime/library";

export function formatMoney(amount: Decimal | number | string, currency = "INR") {
  const value = typeof amount === "object" ? Number(amount.toString()) : Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
