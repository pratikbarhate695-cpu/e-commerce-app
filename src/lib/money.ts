
/**
 * Converts an INR amount into paise.
 * Supports Prisma Decimal values and JavaScript numbers.
 */
export function toPaise(amount: { toString(): string } | number): number {
  const amountText = amount.toString();

  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(amountText)) {
    throw new Error(
      "Invalid payment amount. Use a maximum of two decimal places."
    );
  }

  const rupees = Number(amountText);
  const paise = Math.round(rupees * 100);

  if (!Number.isFinite(rupees) || !Number.isSafeInteger(paise)) {
    throw new Error("Invalid payment amount.");
  }

  return paise;
}
