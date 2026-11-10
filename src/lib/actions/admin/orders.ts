
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
  UnauthorizedError,
} from "@/lib/actions/require-admin";
import { orderStatusUpdateSchema } from "@/lib/validation/admin";
import { adjustStock } from "@/lib/inventory";
import type { AdminActionResult } from "@/lib/actions/admin/products";
import type { OrderStatus } from "@prisma/client";

// Allowed order status transitions.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export async function updateOrderStatus(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  // Independently verify admin authorization for every action.
  let admin: Awaited<ReturnType<typeof requireAdmin>>;

  try {
    admin = await requireAdmin();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return {
        ok: false,
        error:
          "Your admin session has expired or is no longer valid. Please sign in again.",
      };
    }

    throw err;
  }

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
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
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

  const estimatedDeliveryDate = estimatedDelivery
    ? new Date(estimatedDelivery)
    : undefined;

  if (
    estimatedDeliveryDate &&
    Number.isNaN(estimatedDeliveryDate.getTime())
  ) {
    return {
      ok: false,
      error: "Estimated delivery date is invalid.",
    };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // Always read the latest order state inside the transaction.
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (!order) {
          throw new Error("Order not found.");
        }

        const statusChanging = toStatus !== order.status;

        // Validate the requested transition against the latest status.
        if (
          statusChanging &&
          !ALLOWED_TRANSITIONS[order.status].includes(toStatus)
        ) {
          throw new Error(
            `Can't move an order from ${order.status} to ${toStatus}.`
          );
        }

        // Online orders must be paid before processing or shipping.
        // COD orders retain their existing behaviour.
        const needsPayment =
          order.paymentMethod.toUpperCase() !== "COD" &&
          order.paymentStatus !== "PAID";

        if (
          statusChanging &&
          needsPayment &&
          toStatus !== "CANCELLED" &&
          toStatus !== "PENDING"
        ) {
          throw new Error(
            "Payment has not been received for this order, so it cannot be shipped."
          );
        }

        // Conditional update prevents applying the same transition twice.
        const updated = await tx.order.updateMany({
          where: {
            id: orderId,
            status: order.status,
          },
          data: {
            status: toStatus,

            // COD orders become paid when delivered.
            // Never mark an online cancellation as refunded automatically.
            paymentStatus:
              toStatus === "DELIVERED" &&
              order.paymentMethod.toUpperCase() === "COD" &&
              order.paymentStatus === "PENDING"
                ? "PAID"
                : order.paymentStatus,

            courierName: courierName ?? order.courierName,
            trackingNumber: trackingNumber ?? order.trackingNumber,
            trackingUrl: trackingUrl ?? order.trackingUrl,
            estimatedDelivery:
              estimatedDeliveryDate ?? order.estimatedDelivery,
          },
        });

        if (updated.count !== 1) {
          throw new Error(
            "This order was changed by another admin. Refresh the page and try again."
          );
        }

        if (statusChanging) {
          // Record the successful status transition.
          await tx.orderStatusHistory.create({
            data: {
              orderId,
              fromStatus: order.status,
              toStatus,
              changedByAdminId: admin.id,
              note: note || null,
            },
          });

          // Restore stock exactly once when an order is cancelled or returned.
          if (toStatus === "CANCELLED" || toStatus === "RETURNED") {
            for (const item of order.items) {
              await adjustStock(
                tx,
                item.productId,
                item.quantity,
                "RETURNED",
                admin.id
              );
            }
          }
        }
      },
      {
        isolationLevel: "Serializable",
        maxWait: 20000,
        timeout: 60000,
      }
    );
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not update order.",
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);

  return { ok: true };
}
