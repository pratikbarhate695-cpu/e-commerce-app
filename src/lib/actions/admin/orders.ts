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
// OUT_FOR_DELIVERY is an optional step — SHIPPED can go straight to
// DELIVERED if a courier doesn't report that stage separately.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["RETURNED", "REFUNDED"],
  RETURNED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

// Statuses that mean stock comes back onto the shelf. Only true once: an
// order that goes DELIVERED -> RETURNED -> REFUNDED already put the units
// back at RETURNED, so the later REFUNDED step must not restock again.
function shouldRestock(fromStatus: OrderStatus, toStatus: OrderStatus) {
  if (toStatus === "CANCELLED" || toStatus === "RETURNED") return true;
  if (toStatus === "REFUNDED" && fromStatus !== "RETURNED") return true;
  return false;
}

export async function updateOrderStatus(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = orderStatusUpdateSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
    courierName: formData.get("courierName") ?? "",
    trackingNumber: formData.get("trackingNumber") ?? "",
    trackingUrl: formData.get("trackingUrl") ?? "",
    estimatedDelivery: formData.get("estimatedDelivery") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const {
    orderId,
    status: toStatus,
    note,
    courierName,
    trackingNumber,
    trackingUrl,
    estimatedDelivery,
  } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  // Tracking details (courier, number, URL, ETA) can be saved on their own,
  // without necessarily changing the status at the same time — e.g. adding
  // a tracking number a day after marking an order SHIPPED.
  const statusChanging = toStatus !== order.status;
  if (statusChanging && !ALLOWED_TRANSITIONS[order.status].includes(toStatus)) {
    return {
      ok: false,
      error: `Can't move an order from ${order.status} to ${toStatus}.`,
    };
  }

  // Online orders can only move forward once the payment is confirmed.
  // (Cancelling is always allowed. Old COD orders keep their old behaviour.)
  const needsPayment =
    order.paymentMethod.toUpperCase() !== "COD" && order.paymentStatus !== "PAID";
  if (
    statusChanging &&
    needsPayment &&
    toStatus !== "CANCELLED" &&
    toStatus !== "PENDING"
  ) {
    return {
      ok: false,
      error: "Payment has not been received for this order, so it cannot be shipped.",
    };
  }

  const estimatedDeliveryDate = estimatedDelivery ? new Date(estimatedDelivery) : undefined;
  if (estimatedDelivery && Number.isNaN(estimatedDeliveryDate?.getTime())) {
    return { ok: false, error: "Estimated delivery date is invalid." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: toStatus,
            // COD orders are typically marked paid once delivered; card/UPI
            // payments are already PAID at checkout, so this only fires
            // for the one case that still needs it.
            paymentStatus:
              toStatus === "REFUNDED"
                ? "REFUNDED"
                : toStatus === "CANCELLED" && order.paymentStatus === "PAID"
                  ? "REFUNDED"
                  : toStatus === "DELIVERED" &&
                      order.paymentMethod.toUpperCase() === "COD" &&
                      order.paymentStatus === "PENDING"
                    ? "PAID"
                    : order.paymentStatus,
            courierName: courierName ?? order.courierName,
            trackingNumber: trackingNumber ?? order.trackingNumber,
            trackingUrl: trackingUrl ?? order.trackingUrl,
            estimatedDelivery: estimatedDeliveryDate ?? order.estimatedDelivery,
          },
        });

        if (statusChanging) {
          await tx.orderStatusHistory.create({
            data: {
              orderId,
              fromStatus: order.status,
              toStatus,
              changedByAdminId: admin.id,
              note: note || null,
            },
          });

          if (shouldRestock(order.status, toStatus)) {
            for (const item of order.items) {
              await adjustStock(tx, item.productId, item.quantity, "RETURNED", admin.id);
            }
          }
        }
      },
      { isolationLevel: "Serializable", maxWait: 20000, timeout: 60000 }
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not update order.",
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  return { ok: true };
}
