import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adjustStock } from "@/lib/inventory";
import { InsufficientStockError } from "@/lib/inventory-core";
import { toPaise } from "@/lib/razorpay";

/** Unpaid online orders are cancelled and their stock released after this long. */
export const PAYMENT_WINDOW_MINUTES = 30;

/**
 * Identifies a stock shortage during late-payment recovery.
 * The failed transaction is rolled back before we record the captured payment.
 */
class StockReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockReservationError";
  }
}

/**
 * Prevents one Razorpay payment ID from being attached to
 * multiple Payment records.
 */
async function paymentIdUsedByAnotherAttempt(
  tx: Prisma.TransactionClient,
  razorpayPaymentId: string,
  currentPaymentId: string
): Promise<boolean> {
  const existing = await tx.payment.findUnique({
    where: { providerPaymentId: razorpayPaymentId },
    select: { id: true },
  });

  return Boolean(
    existing && existing.id !== currentPaymentId
  );
}

/**
 * Cancels unpaid online orders older than the payment window and puts the
 * stock back. Runs whenever someone checks out or opens their orders.
 */
export async function expireUnpaidOrders(userId?: string) {
  const cutoff = new Date(
    Date.now() - PAYMENT_WINDOW_MINUTES * 60 * 1000
  );

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
            where: {
              id: order.id,
              status: "PENDING",
              paymentStatus: { in: ["PENDING", "FAILED"] },
            },
            data: {
              status: "CANCELLED",
              paymentStatus: "FAILED",
            },
          });

          if (claimed.count === 0) return;

          for (const item of order.items) {
            await adjustStock(
              tx,
              item.productId,
              item.quantity,
              "ADJUSTMENT"
            );
          }

          if (order.couponUsage) {
            await tx.couponUsage.delete({
              where: { id: order.couponUsage.id },
            });

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
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10000,
          timeout: 30000,
        }
      );
    } catch (err) {
      console.error(
        "expireUnpaidOrders failed for",
        order.id,
        err
      );
    }
  }
}

/**
 * Marks an order as paid.
 *
 * Browser confirmation and webhooks can both call this function.
 * Repeated processing of the same successful payment is safe.
 */
export async function markOrderPaid(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  paidPaise: number
): Promise<{ ok: boolean; orderId?: string }> {
  const payment = await prisma.payment.findFirst({
    where: {
      provider: "razorpay",
      providerRef: razorpayOrderId,
    },
    include: {
      order: true,
    },
  });

  if (!payment) {
    console.error(
      "Razorpay payment for unknown order",
      razorpayOrderId
    );
    return { ok: false };
  }

  const order = payment.order;

  // Check both the order total and the amount recorded for this attempt.
  if (
    !razorpayPaymentId ||
    !Number.isSafeInteger(paidPaise) ||
    paidPaise <= 0 ||
    toPaise(order.grandTotal) !== paidPaise ||
    toPaise(payment.amount) !== paidPaise
  ) {
    console.error(
      "Razorpay amount or payment ID mismatch",
      order.orderNumber,
      paidPaise
    );
    return { ok: false };
  }

  try {
    const processed = await prisma.$transaction(
      async (tx) => {
        // Read the latest payment and order state inside the transaction.
        const currentPayment = await tx.payment.findUnique({
          where: { id: payment.id },
          include: {
            order: {
              include: { items: true },
            },
          },
        });

        if (!currentPayment) return false;

        const current = currentPayment.order;

        if (
          currentPayment.provider !== "razorpay" ||
          currentPayment.providerRef !== razorpayOrderId
        ) {
          return false;
        }

        if (
          toPaise(current.grandTotal) !== paidPaise ||
          toPaise(currentPayment.amount) !== paidPaise
        ) {
          return false;
        }

        // Never attach a payment ID already owned by another payment attempt.
        if (
          await paymentIdUsedByAnotherAttempt(
            tx,
            razorpayPaymentId,
            currentPayment.id
          )
        ) {
          console.error(
            "Razorpay payment ID already belongs to another payment record.",
            razorpayPaymentId
          );
          return false;
        }

        // This payment record has already been processed.
        if (currentPayment.status === "SUCCEEDED") {
          if (
            currentPayment.providerPaymentId &&
            currentPayment.providerPaymentId !== razorpayPaymentId
          ) {
            return false;
          }

          // Attach the ID if an older successful record did not have one.
          if (!currentPayment.providerPaymentId) {
            await tx.payment.update({
              where: { id: currentPayment.id },
              data: { providerPaymentId: razorpayPaymentId },
            });
          }

          return true;
        }

        // The order was already paid by another payment attempt.
        // Record this additional capture so it can be manually refunded.
        if (current.paymentStatus === "PAID") {
          if (
            currentPayment.providerPaymentId &&
            currentPayment.providerPaymentId !== razorpayPaymentId
          ) {
            return false;
          }

          await tx.payment.update({
            where: { id: currentPayment.id },
            data: {
              status: "SUCCEEDED",
              providerPaymentId: razorpayPaymentId,
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: current.id,
              fromStatus: current.status,
              toStatus: current.status,
              note:
                `Additional Razorpay payment captured (${razorpayPaymentId}) ` +
                "after this order was already paid. The order was not changed. " +
                "A manual refund in Razorpay is required.",
            },
          });

          console.error(
            "Additional Razorpay payment captured. Manual refund required.",
            current.orderNumber,
            razorpayPaymentId
          );

          return true;
        }

        // A payment ID already attached to this attempt cannot be replaced.
        if (
          currentPayment.providerPaymentId &&
          currentPayment.providerPaymentId !== razorpayPaymentId
        ) {
          return false;
        }

        let nextStatus = current.status;
        const note = `Payment received (${razorpayPaymentId}).`;

        if (current.status === "CANCELLED") {
          // Reserve every product again. If any product is unavailable,
          // throwing rolls back ALL stock changes in this transaction.
          try {
            for (const item of current.items) {
              await adjustStock(
                tx,
                item.productId,
                -item.quantity,
                "SALE"
              );
            }
          } catch (error) {
            if (error instanceof InsufficientStockError) {
              throw new StockReservationError(error.message);
            }

            throw error;
          }

          nextStatus = "CONFIRMED";
        } else if (current.status === "PENDING") {
          nextStatus = "CONFIRMED";
        }

        // Only one concurrent transaction can claim this unpaid order.
        const orderUpdate = await tx.order.updateMany({
          where: {
            id: current.id,
            status: current.status,
            paymentStatus: { not: "PAID" },
          },
          data: {
            paymentStatus: "PAID",
            status: nextStatus,
          },
        });

        if (orderUpdate.count !== 1) {
          throw new Error(
            "Order payment state changed concurrently. Please retry confirmation."
          );
        }

        await tx.payment.update({
          where: { id: currentPayment.id },
          data: {
            status: "SUCCEEDED",
            providerPaymentId: razorpayPaymentId,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: current.id,
            fromStatus: current.status,
            toStatus: nextStatus,
            note,
          },
        });

        return true;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 30000,
      }
    );

    if (!processed) {
      return { ok: false };
    }

    return {
      ok: true,
      orderId: order.id,
    };
  } catch (error) {
    if (!(error instanceof StockReservationError)) {
      throw error;
    }

    // The first transaction has rolled back all stock changes.
    // Record the captured payment without pretending the order was fulfilled.
    console.error(
      "Late Razorpay payment: stock unavailable; manual refund required.",
      order.orderNumber,
      razorpayPaymentId,
      error.message
    );

    const recorded = await prisma.$transaction(
      async (tx) => {
        const currentPayment = await tx.payment.findUnique({
          where: { id: payment.id },
          include: { order: true },
        });

        if (!currentPayment) return false;

        const current = currentPayment.order;

        if (
          currentPayment.provider !== "razorpay" ||
          currentPayment.providerRef !== razorpayOrderId
        ) {
          return false;
        }

        if (
          toPaise(current.grandTotal) !== paidPaise ||
          toPaise(currentPayment.amount) !== paidPaise
        ) {
          return false;
        }

        if (
          await paymentIdUsedByAnotherAttempt(
            tx,
            razorpayPaymentId,
            currentPayment.id
          )
        ) {
          return false;
        }

        if (currentPayment.status === "SUCCEEDED") {
          if (
            currentPayment.providerPaymentId &&
            currentPayment.providerPaymentId !== razorpayPaymentId
          ) {
            return false;
          }

          if (!currentPayment.providerPaymentId) {
            await tx.payment.update({
              where: { id: currentPayment.id },
              data: { providerPaymentId: razorpayPaymentId },
            });
          }

          return true;
        }

        if (
          currentPayment.providerPaymentId &&
          currentPayment.providerPaymentId !== razorpayPaymentId
        ) {
          return false;
        }

        if (current.paymentStatus === "PAID") {
          await tx.payment.update({
            where: { id: currentPayment.id },
            data: {
              status: "SUCCEEDED",
              providerPaymentId: razorpayPaymentId,
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: current.id,
              fromStatus: current.status,
              toStatus: current.status,
              note:
                `Additional Razorpay payment captured (${razorpayPaymentId}) ` +
                "after this order was already paid. A manual refund in Razorpay is required.",
            },
          });

          return true;
        }

        // Only record the manual-refund case if the order is still cancelled.
        if (current.status !== "CANCELLED") {
          return false;
        }

        const orderUpdate = await tx.order.updateMany({
          where: {
            id: current.id,
            status: "CANCELLED",
            paymentStatus: { not: "PAID" },
          },
          data: {
            paymentStatus: "PAID",
          },
        });

        if (orderUpdate.count !== 1) {
          throw new Error(
            "Order payment state changed concurrently. Please retry confirmation."
          );
        }

        await tx.payment.update({
          where: { id: currentPayment.id },
          data: {
            status: "SUCCEEDED",
            providerPaymentId: razorpayPaymentId,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: current.id,
            fromStatus: "CANCELLED",
            toStatus: "CANCELLED",
            note:
              `Payment received (${razorpayPaymentId}), but the order ` +
              "remains cancelled because stock is unavailable. " +
              "A manual refund in Razorpay is required.",
          },
        });

        return true;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 30000,
      }
    );

    return recorded
      ? { ok: true, orderId: order.id }
      : { ok: false };
  }
}

/**
 * Marks a failed Razorpay payment without overwriting an order
 * that has already been paid.
 */
export async function markPaymentFailed(
  razorpayOrderId: string
) {
  await prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findFirst({
        where: {
          provider: "razorpay",
          providerRef: razorpayOrderId,
        },
      });

      if (!payment) return;

      // Never downgrade a successful payment.
      if (payment.status === "SUCCEEDED") return;

      // Mark only this payment attempt as failed.
      const paymentUpdate = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: { not: "SUCCEEDED" },
        },
        data: { status: "FAILED" },
      });

      if (paymentUpdate.count !== 1) return;

      // Do not mark the order failed if another attempt succeeded.
      await tx.order.updateMany({
        where: {
          id: payment.orderId,
          paymentStatus: { not: "PAID" },
          payments: {
            none: { status: "SUCCEEDED" },
          },
        },
        data: { paymentStatus: "FAILED" },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 30000,
    }
  );
}