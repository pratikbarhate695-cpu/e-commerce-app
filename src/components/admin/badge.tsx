const TONES = {
  neutral: "bg-ink/[0.06] text-ink/70",
  good: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  bad: "bg-red-100 text-red-800",
} as const;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs ${TONES[tone]}`}>
      {children}
    </span>
  );
}

const ORDER_STATUS_TONE: Record<string, keyof typeof TONES> = {
  PENDING: "neutral",
  CONFIRMED: "neutral",
  PROCESSING: "warn",
  SHIPPED: "warn",
  DELIVERED: "good",
  CANCELLED: "bad",
  REFUNDED: "bad",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge tone={ORDER_STATUS_TONE[status] ?? "neutral"}>{status}</Badge>;
}
