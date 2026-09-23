"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/actions/require-admin";
import { checkoutSchema } from "@/lib/validation/checkout";
import { computeCartTotals, PricingError } from "@/lib/pricing";
import { adjustStock } from "@/lib/inventory";
import { generateOrderNumber } from "@/lib/order-number";

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

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        // Re-check stock inside the transaction against live rows, so two
        // simultaneous checkouts on the last unit can't both succeed.
        for (const line of totals.lines) {
          const fresh = await tx.product.findUniqueOrThrow({
            where: { id: line.productId },
          });
          if (!fresh.isActive || fresh.stockQty < line.quantity) {
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
                note: "Order placed.",
              },
            },
            payments: {
              create: {
                provider: "cod",
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

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return createdOrder;
      },
      { isolation: Prisma.TransactionIsolationLevel.Serializable }
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
