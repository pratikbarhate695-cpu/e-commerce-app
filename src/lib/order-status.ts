import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { formatDate } from "@/lib/format";

/**
 * Shared order-status logic. Pure functions only (no database access) so
 * the customer pages and, later, the admin pages use the same vocabulary.
 */

// The "happy path", in order. Anything not listed here (CANCELLED,
// RETURNED, REFUNDED) is an exit from the flow and is handled separately.
export const ORDER_FLOW = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const satisfies readonly OrderStatus[];

const OFF_FLOW: readonly OrderStatus[] = ["CANCELLED", "RETURNED", "REFUNDED"];

export const STATUS_COPY: Record<
  OrderStatus,
  { label: string; description: string }
> = {
  PENDING: { label: "Order placed", description: "We've received your order." },
  CONFIRMED: {
    label: "Order confirmed",
    description: "Your order has been confirmed.",
  },
  PROCESSING: {
    label: "Processing",
    description: "The seller is preparing your order.",
  },
  SHIPPED: {
    label: "Shipped",
    description: "Your order has been handed to the delivery partner.",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for delivery",
    description: "Your order is arriving today.",
  },
  DELIVERED: { label: "Delivered", description: "Delivered successfully." },
  CANCELLED: { label: "Cancelled", description: "This order was cancelled." },
  RETURNED: { label: "Returned", description: "This order was returned." },
  REFUNDED: {
    label: "Refunded",
    description: "Your refund has been issued.",
  },
};

/**
 * The note written to the history table when a status changes without a
 * custom message. The timeline hides these (the label already says it) and
 * only shows notes someone wrote on purpose. "Order placed." matches what
 * checkout already writes.
 */
export const DEFAULT_NOTES: Record<OrderStatus, string> = {
  PENDING: "Order placed.",
  CONFIRMED: "Order confirmed.",
  PROCESSING: "Order is being processed.",
  SHIPPED: "Order shipped.",
  OUT_FOR_DELIVERY: "Order is out for delivery.",
  DELIVERED: "Order delivered.",
  CANCELLED: "Order cancelled.",
  RETURNED: "Order returned.",
  REFUNDED: "Order refunded.",
};

export type Tone = "neutral" | "warning" | "progress" | "success" | "danger";

export function statusTone(status: OrderStatus): Tone {
  switch (status) {
    case "PENDING":
      return "warning";
    case "CONFIRMED":
    case "PROCESSING":
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
      return "progress";
    case "DELIVERED":
      return "success";
    case "CANCELLED":
    case "RETURNED":
      return "danger";
    case "REFUNDED":
      return "neutral";
  }
}

export function paymentMethodLabel(method: string) {
  const m = method.toUpperCase();
  if (m === "COD") return "Cash on delivery";
  if (m === "RAZORPAY") return "Online payment";
  return method;
}

export function paymentBadge(
  status: PaymentStatus,
  method: string
): { label: string; tone: Tone } {
  switch (status) {
    case "PAID":
      return { label: "Paid", tone: "success" };
    case "FAILED":
      return { label: "Payment failed", tone: "danger" };
    case "REFUNDED":
      return { label: "Refunded", tone: "neutral" };
    case "PENDING":
      return method.toUpperCase() === "COD"
        ? { label: "Pay on delivery", tone: "neutral" }
        : { label: "Payment pending", tone: "warning" };
  }
}

// ---------- Timeline ----------

export type HistoryEntry = {
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  note: string | null;
  createdAt: Date;
};

export type TimelineState = "done" | "current" | "upcoming" | "problem";

export type TimelineStep = {
  status: OrderStatus;
  label: string;
  description: string;
  /** A custom note from whoever changed the status, if there was one. */
  note: string | null;
  at: Date | null;
  state: TimelineState;
};

function flowIndex(status: OrderStatus) {
  return (ORDER_FLOW as readonly OrderStatus[]).indexOf(status);
}

function customNote(entry: HistoryEntry | undefined, status: OrderStatus) {
  const note = entry?.note?.trim();
  if (!note || note === DEFAULT_NOTES[status]) return null;
  return note;
}

/**
 * Builds the tracking timeline from the order's real status and history.
 *
 * - In-flow orders show the whole happy path: finished steps, the current
 *   step, and what's still to come.
 * - Orders that left the flow (cancelled, returned, refunded) show only
 *   the steps they actually reached, followed by the exit step(s).
 */
export function buildTimeline(input: {
  status: OrderStatus;
  history: HistoryEntry[];
  placedAt: Date;
}): TimelineStep[] {
  const history = [...input.history].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  // First time each status was entered.
  const firstEntry = new Map<OrderStatus, HistoryEntry>();
  for (const h of history) {
    if (!firstEntry.has(h.toStatus)) firstEntry.set(h.toStatus, h);
  }

  // How far along the happy path did the order get? Looking at history as
  // well as the current status matters for cancelled/returned orders.
  let reached = flowIndex(input.status);
  for (const h of history) {
    reached = Math.max(reached, flowIndex(h.toStatus), flowIndex(h.fromStatus));
  }
  if (reached < 0) reached = 0;

  const offFlowNow = OFF_FLOW.includes(input.status);

  const flowSteps: TimelineStep[] = [];
  ORDER_FLOW.forEach((status, i) => {
    if (offFlowNow && i > reached) return;

    const entry = firstEntry.get(status);
    let state: TimelineState;
    if (i < reached) state = "done";
    else if (i > reached) state = "upcoming";
    else if (offFlowNow || status === "DELIVERED") state = "done";
    else state = "current";

    flowSteps.push({
      status,
      label: STATUS_COPY[status].label,
      description: STATUS_COPY[status].description,
      note: customNote(entry, status),
      at: entry?.createdAt ?? (status === "PENDING" ? input.placedAt : null),
      state,
    });
  });

  if (!offFlowNow) return flowSteps;

  // Exit steps, in the order they happened.
  const exits: TimelineStep[] = [];
  for (const status of OFF_FLOW) {
    const entry = firstEntry.get(status);
    if (!entry && status !== input.status) continue;
    exits.push({
      status,
      label: STATUS_COPY[status].label,
      description: STATUS_COPY[status].description,
      note: customNote(entry, status),
      at: entry?.createdAt ?? null,
      state: status === "CANCELLED" ? "problem" : "done",
    });
  }
  exits.sort((a, b) => {
    if (a.at && b.at) return a.at.getTime() - b.at.getTime();
    // A step with no timestamp (inconsistent data) sorts last.
    return a.at ? -1 : b.at ? 1 : 0;
  });

  return [...flowSteps, ...exits];
}

/** One-line delivery summary for lists and headers, or null. */
export function getDeliverySummary(input: {
  status: OrderStatus;
  estimatedDelivery: Date | null;
  history: HistoryEntry[];
}): string | null {
  if (input.status === "DELIVERED") {
    const delivered = [...input.history]
      .reverse()
      .find((h) => h.toStatus === "DELIVERED");
    return delivered
      ? `Delivered on ${formatDate(delivered.createdAt)}`
      : "Delivered";
  }
  if (OFF_FLOW.includes(input.status)) return null;
  if (input.estimatedDelivery) {
    return `Expected by ${formatDate(input.estimatedDelivery)}`;
  }
  return null;
}

/** True while the order hasn't been handed to a courier yet. */
export function isAwaitingShipment(status: OrderStatus) {
  return status === "PENDING" || status === "CONFIRMED" || status === "PROCESSING";
}

/** Only http(s) links are ever rendered, whatever was typed into the DB. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
