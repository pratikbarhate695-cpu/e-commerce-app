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
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

export function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
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
      {!state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      <AdminSubmitButton>Update status</AdminSubmitButton>
    </form>
  );
}
