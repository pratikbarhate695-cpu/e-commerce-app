"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/actions/require-admin";
import {
  createRazorpayOrder,
  MIN_AMOUNT_MESSAGE,
  MIN_ONLINE_PAYMENT_PAISE,
  fetchRazorpayPayment,
  razorpayConfigured,
  toPaise,
  verifyCheckoutSignature,
} from "@/lib/razorpay";
import { expireUnpaidOrders, markOrderPaid } from "@/lib/payments";

export type StartPaymentResult =
  | {
      ok: true;
      keyId: string;
      razorpayOrderId: string;
      amount: number;
      orderNumber: string;
      name: string;
      phone: string;
    }
  | { ok: false; error: string };

export async function startPayment(orderId: string): Promise<StartPaymentResult> {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: "Please sign in." };
    throw err;
  }
  if (!razorpayConfigured() || !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    return { ok: false, error: "Online payment is not set up yet." };
  }

  await expireUnpaidOrders(user.id);

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.paymentStatus === "PAID") return { ok: false, error: "This order is already paid." };
  if (order.status !== "PENDING") {
    return { ok: false, error: "This order expired. Please place a new order." };
  }

  try {
    const amount = toPaise(order.grandTotal);
    if (amount < MIN_ONLINE_PAYMENT_PAISE) return { ok: false, error: MIN_AMOUNT_MESSAGE };
    const rzpOrder = await createRazorpayOrder(amount, order.orderNumber);

    // One row per attempt, so a late payment on an earlier attempt still matches.
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "razorpay",
        amount: order.grandTotal,
        status: "CREATED",
        providerRef: rzpOrder.id,
      },
    });

    const address = order.shippingAddress as { fullName?: string; phone?: string } | null;
    return {
      ok: true,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      razorpayOrderId: rzpOrder.id,
      amount,
      orderNumber: order.orderNumber,
      name: address?.fullName ?? "",
      phone: address?.phone ?? "",
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not start payment." };
  }
}

export async function confirmPayment(
  orderId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Please sign in." };
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { payments: { where: { provider: "razorpay" } } },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.paymentStatus === "PAID") return { ok: true };

  const known = order.payments.some((p) => p.providerRef === razorpayOrderId);
  if (!known || !verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, signature)) {
    return { ok: false, error: "Payment could not be verified." };
  }

  try {
    // Ask Razorpay directly, so we never rely only on what the browser says.
    const payment = await fetchRazorpayPayment(razorpayPaymentId);
    if (payment.order_id !== razorpayOrderId) {
      return { ok: false, error: "Payment could not be verified." };
    }
    if (payment.status !== "captured") {
      return {
        ok: false,
        error: "Your payment is still being confirmed. If money was deducted, this page will update shortly.",
      };
    }
    const result = await markOrderPaid(razorpayOrderId, razorpayPaymentId, payment.amount);
    if (!result.ok) return { ok: false, error: "Payment could not be verified." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not confirm payment." };
  }

  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}
