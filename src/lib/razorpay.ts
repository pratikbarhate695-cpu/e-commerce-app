import "server-only";
import crypto from "node:crypto";

const API = "https://api.razorpay.com/v1";

/** Razorpay does not accept payments below Rs 1 (100 paise). */
export const MIN_ONLINE_PAYMENT_PAISE = 100;
export const MIN_AMOUNT_MESSAGE =
  "The order total is below the minimum online payment of ₹1. Please add more items.";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Online payment is not set up yet.");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function rzp<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Razorpay API error", res.status, body);
    if (/minimum amount/i.test(body)) throw new Error(MIN_AMOUNT_MESSAGE);
    throw new Error("Payment service is not available right now. Please try again.");
  }
  return (await res.json()) as T;
}

export type RazorpayOrder = { id: string; amount: number; currency: string };
export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
};

export function toPaise(amount: { toString(): string } | number) {
  return Math.round(Number(amount.toString()) * 100);
}

export function createRazorpayOrder(amountPaise: number, receipt: string) {
  return rzp<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt }),
  });
}

export function fetchRazorpayPayment(paymentId: string) {
  return rzp<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Checks the signature Razorpay returns to the browser after a payment. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Checks the signature on a webhook call (computed over the raw request body). */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
