"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/actions/require-admin";
import { checkoutSchema } from "@/lib/validation/checkout";
import { computeCartTotals, PricingError } from "@/lib/pricing";
import { adjustStock } from "@/lib/inventory";
import { generateOrderNumber } from "@/lib/order-number";
import { expireUnpaidOrders } from "@/lib/payments";
import {
  MIN_AMOUNT_MESSAGE,
  MIN_ONLINE_PAYMENT_PAISE,
  razorpayConfigured,
  toPaise,
} from "@/lib/razorpay";

export type CheckoutResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; error: string };

export async function placeOrder(formData: FormData): Promise<CheckoutResult> {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { ok: false, error: "Please sign in to check out." };
    }
    throw err;
  }

  if (!razorpayConfigured()) {
    return { ok: false, error: "Online payment is not set up yet. Please try again later." };
  }
  // Release stock held by old unpaid orders before checking stock again.
  await expireUnpaidOrders(user.id);

  // Stops someone from locking your stock with many unpaid orders.
  const unpaidCount = await prisma.order.count({
    where: {
      userId: user.id,
      paymentMethod: "RAZORPAY",
      status: "PENDING",
      paymentStatus: { in: ["PENDING", "FAILED"] },
    },
  });
  if (unpaidCount >= 3) {
    return {
      ok: false,
      error: "You already have unpaid orders. Please pay for them from your orders page, or wait 30 minutes.",
    };
  }

  const raw = {
    address: {
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
      line1: formData.get("line1"),
      line2: formData.get("line2") ?? "",
      city: formData.get("city"),
      state: formData.get("state"),
      pincode: formData.get("pincode"),
    },
    paymentMethod: formData.get("paymentMethod"),
    couponCode: formData.get("couponCode") ?? "",
  };

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { address, paymentMethod, couponCode } = parsed.data;

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const settings = await prisma.storeSettings.findFirst();
  if (!settings) {
    return { ok: false, error: "Store is not configured yet." };
  }

  const coupon = couponCode
    ? await prisma.coupon.findUnique({ where: { code: couponCode } })
    : null;
  if (couponCode && !coupon) {
    return { ok: false, error: "That coupon code doesn't exist." };
  }

  // Price everything from current DB state — client never supplies a price.
  let totals;
  try {
    totals = computeCartTotals(
      cart.items.map((i) => ({ product: i.product, quantity: i.quantity })),
      settings,
      coupon
    );
  } catch (err) {
    if (err instanceof PricingError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
  if (totals.couponError) {
    return { ok: false, error: totals.couponError };
  }

  // Check the amount BEFORE creating anything, so Razorpay never rejects an order we already saved.
  if (toPaise(totals.grandTotal) < MIN_ONLINE_PAYMENT_PAISE) {
    return { ok: false, error: MIN_AMOUNT_MESSAGE };
  }

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        // Take the cart first. If another checkout already took it (double click,
        // two tabs), the count differs and this one stops, so no duplicate order.
        const claimed = await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        if (claimed.count !== cart.items.length) {
          throw new PricingError("Your cart changed. Please review it and try again.");
        }

        // Re-check stock inside the transaction against live rows (one query for all lines).
        const fresh = await tx.product.findMany({
          where: { id: { in: totals.lines.map((l) => l.productId) } },
        });
        const freshById = new Map(fresh.map((p) => [p.id, p]));
        for (const line of totals.lines) {
          const p = freshById.get(line.productId);
          if (!p || !p.isActive || p.stockQty < line.quantity) {
            throw new PricingError(
              `"${line.name}" no longer has enough stock — please update your cart.`
            );
          }
        }

        for (const line of totals.lines) {
          await adjustStock(tx, line.productId, -line.quantity, "SALE");
        }

        const orderNumber = generateOrderNumber();

        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            userId: user.id,
            subtotal: totals.subtotal,
            discountTotal: totals.discountTotal,
            shippingFee: totals.shippingFee,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            paymentMethod,
            paymentStatus: "PENDING",
            status: "PENDING",
            couponCode: coupon?.code,
            shippingAddress: address,
            items: {
              create: totals.lines.map((line) => ({
                productId: line.productId,
                productNameSnapshot: line.name,
                skuSnapshot: line.sku,
                unitPriceAtPurchase: line.unitPrice,
                quantity: line.quantity,
                lineTotal: line.lineTotal,
              })),
            },
            statusHistory: {
              create: {
                fromStatus: "PENDING",
                toStatus: "PENDING",
                note: "Order placed. Waiting for payment.",
              },
            },
            payments: {
              create: {
                provider: "razorpay",
                amount: totals.grandTotal,
                status: "CREATED",
              },
            },
          },
        });

        if (coupon) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { timesUsed: { increment: 1 } },
          });
          await tx.couponUsage.create({
            data: {
              couponId: coupon.id,
              userId: user.id,
              orderId: createdOrder.id,
            },
          });
        }

        return createdOrder;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 20000,
        timeout: 60000,
      }
    );

    return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (err) {
    if (err instanceof PricingError) {
      return { ok: false, error: err.message };
    }
    // Serializable transactions can fail under contention (P2034) — ask
    // the shopper to retry rather than silently losing the order.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2034"
    ) {
      return {
        ok: false,
        error: "Checkout is busy right now — please try again.",
      };
    }
    throw err;
  }
}
