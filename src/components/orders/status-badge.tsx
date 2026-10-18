import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { STATUS_COPY, paymentBadge, statusTone, type Tone } from "@/lib/order-status";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-ink/20 text-ink/70",
  warning: "border-amber-600/40 text-amber-700 dark:border-amber-400/40 dark:text-amber-300",
  progress: "border-accent/50 text-accent",
  success: "border-emerald-600/40 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-300",
  danger: "border-red-600/40 text-red-700 dark:border-red-400/40 dark:text-red-300",
};

function Badge({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`inline-flex items-center border px-2 py-0.5 text-xs ${TONE_CLASSES[tone]}`}>{label}</span>;
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge label={STATUS_COPY[status].label} tone={statusTone(status)} />;
}

export function PaymentBadge({ status, method }: { status: PaymentStatus; method: string }) {
  const { label, tone } = paymentBadge(status, method);
  return <Badge label={label} tone={tone} />;
}
