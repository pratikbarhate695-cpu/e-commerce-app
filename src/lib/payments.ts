import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adjustStock } from "@/lib/inventory";
import { toPaise } from "@/lib/razorpay";

/** Unpaid online orders are cancelled and their stock released after this long. */
export const PAYMENT_WINDOW_MINUTES = 30;

/**
 * Cancels unpaid online orders older than the payment window and puts the
 * stock back. Runs whenever someone checks out or opens their orders, so no
 * scheduled job is needed.
 */
export async function expireUnpaidOrders(userId?: string) {
  const cutoff = new Date(Date.now() - PAYMENT_WINDOW_MINUTES * 60 * 1000);
  const stale = await prisma.order.findMany({
    where: {
      paymentMethod: "RAZORPAY",
      paymentStatus: { in: ["PENDING", "FAILED"] },
      status: "PENDING",
      createdAt: { lt: cutoff },
      ...(userId ? { userId } : {}),
    },
    include: { items: true, couponUsage: true },
    take: 50,
  });

  for (const order of stale) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const claimed = await tx.order.updateMany({
            where: { id: order.id, status: "PENDING", paymentStatus: { in: ["PENDING", "FAILED"] } },
            data: { status: "CANCELLED", paymentStatus: "FAILED" },
          });
          if (claimed.count === 0) return; // paid or changed in the meantime

          for (const item of order.items) {
            await adjustStock(tx, item.productId, item.quantity, "ADJUSTMENT");
          }
          if (order.couponUsage) {
            await tx.couponUsage.delete({ where: { id: order.couponUsage.id } });
            await tx.coupon.update({
              where: { id: order.couponUsage.couponId },
              data: { timesUsed: { decrement: 1 } },
            });
          }
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: "PENDING",
              toStatus: "CANCELLED",
              note: "Cancelled: payment was not completed in time.",
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 30000 }
      );
    } catch (err) {
      console.error("expireUnpaidOrders failed for", order.id, err);
    }
  }
}

/**
 * Marks an order as paid. Safe to call many times for the same payment
 * (browser confirm and webhook can both arrive).
 */
export async function markOrderPaid(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  paidPaise: number
): Promise<{ ok: boolean; orderId?: string }> {
  const payment = await prisma.payment.findFirst({
    where: { provider: "razorpay", providerRef: razorpayOrderId },
    include: { order: { include: { items: true } } },
  });
  if (!payment) {
    console.error("Razorpay payment for unknown order", razorpayOrderId);
    return { ok: false };
  }
  const order = payment.order;

  if (toPaise(order.grandTotal) !== paidPaise) {
    console.error("Razorpay amount mismatch", order.orderNumber, paidPaise);
    return { ok: false };
  }
  if (order.paymentStatus === "PAID") return { ok: true, orderId: order.id };

  await prisma.$transaction(
    async (tx) => {
      const current = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      if (current.paymentStatus === "PAID") return;

      let status = current.status;
      let note = `Payment received (${razorpayPaymentId}).`;

      if (current.status === "CANCELLED") {
        // Paid after the order expired: try to take the stock back.
        try {
          for (const item of order.items) {
            await adjustStock(tx, item.productId, -item.quantity, "SALE");
          }
          status = "CONFIRMED";
        } catch {
          note = `Payment received (${razorpayPaymentId}) after the order was cancelled and stock is no longer available. Refund this payment in Razorpay.`;
        }
      } else if (current.status === "PENDING") {
        status = "CONFIRMED";
      }

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "PAID", status },
      });
      await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED" } });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, fromStatus: current.status, toStatus: status, note },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 30000 }
  );

  return { ok: true, orderId: order.id };
}

export async function markPaymentFailed(razorpayOrderId: string) {
  const payment = await prisma.payment.findFirst({
    where: { provider: "razorpay", providerRef: razorpayOrderId },
    include: { order: true },
  });
  if (!payment || payment.order.paymentStatus === "PAID") return;
  await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  await prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "FAILED" } });
}
