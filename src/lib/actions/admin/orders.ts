"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { orderStatusUpdateSchema } from "@/lib/validation/admin";
import { adjustStock } from "@/lib/inventory";
import type { AdminActionResult } from "@/lib/actions/admin/products";
import type { OrderStatus } from "@prisma/client";

// Which statuses an order can move to from its current one. Keeps a
// cancelled/delivered/refunded order from being silently reopened.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

const RESTOCKING_STATUSES: OrderStatus[] = ["CANCELLED", "REFUNDED"];

export async function updateOrderStatus(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = orderStatusUpdateSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { orderId, status: toStatus, note } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  if (order.status === toStatus) {
    return { ok: false, error: "Order is already in that status." };
  }
  if (!ALLOWED_TRANSITIONS[order.status].includes(toStatus)) {
    return {
      ok: false,
      error: `Can't move an order from ${order.status} to ${toStatus}.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: toStatus,
          paymentStatus:
            toStatus === "REFUNDED"
              ? "REFUNDED"
              : toStatus === "CANCELLED" && order.paymentStatus === "PAID"
                ? "REFUNDED"
                : order.paymentStatus,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus,
          changedByAdminId: admin.id,
          note: note || null,
        },
      });

      // Cancelling or refunding puts the units back on the shelf —
      // audited the same way any other stock change is.
      if (RESTOCKING_STATUSES.includes(toStatus)) {
        for (const item of order.items) {
          await adjustStock(tx, item.productId, item.quantity, "RETURNED", admin.id);
        }
      }
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not update order.",
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}
