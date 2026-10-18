"use client";

import { useFormState } from "react-dom";
import type { OrderStatus } from "@prisma/client";
import { AdminSelect, AdminField } from "@/components/admin/fields";
import { AdminSubmitButton } from "@/components/admin/submit-button";
import { updateOrderStatus } from "@/lib/actions/admin/orders";
import type { AdminActionResult } from "@/lib/actions/admin/products";

const initialState: AdminActionResult = { ok: true };

const ALL_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
];

// yyyy-mm-dd for an <input type="date">. The server stores this as UTC
// midnight of the chosen date (new Date("yyyy-mm-dd")), so reading the UTC
// date part back out round-trips to the same date with no drift.
function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function OrderStatusForm({
  orderId,
  currentStatus,
  courierName,
  trackingNumber,
  trackingUrl,
  estimatedDelivery,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  estimatedDelivery: Date | null;
}) {
  const [state, formAction] = useFormState(updateOrderStatus, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <AdminSelect label="New status" name="status" defaultValue={currentStatus}>
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </AdminSelect>
      <AdminField label="Note (optional)" name="note" />

      <div className="border-t border-ink/10 pt-4">
        <p className="text-sm text-ink/60">Shipment tracking (optional)</p>
        <p className="mt-1 text-xs text-ink/40">
          Can be saved on its own, without changing the status above.
        </p>
        <div className="mt-3 space-y-3">
          <AdminField
            label="Courier"
            name="courierName"
            defaultValue={courierName ?? ""}
            placeholder="e.g. Delhivery"
          />
          <AdminField
            label="Tracking number"
            name="trackingNumber"
            defaultValue={trackingNumber ?? ""}
          />
          <AdminField
            label="Tracking URL"
            name="trackingUrl"
            type="url"
            defaultValue={trackingUrl ?? ""}
            placeholder="https://..."
          />
          <AdminField
            label="Estimated delivery"
            name="estimatedDelivery"
            type="date"
            defaultValue={toDateInputValue(estimatedDelivery)}
          />
        </div>
      </div>

      {!state.ok && <p className="text-sm text-red-700 dark:text-red-300">{state.error}</p>}
      <AdminSubmitButton>Save</AdminSubmitButton>
    </form>
  );
}
