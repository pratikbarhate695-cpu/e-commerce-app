"use client";

import { startPayment, confirmPayment } from "@/lib/actions/payment";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (r: unknown) => void) => void;
    };
  }
}

function loadScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.getElementById("razorpay-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const el = document.createElement("script");
    el.id = "razorpay-js";
    el.src = "https://checkout.razorpay.com/v1/checkout.js";
    el.onload = () => resolve(true);
    el.onerror = () => resolve(false);
    document.body.appendChild(el);
  });
}

/** Opens the Razorpay popup for an existing unpaid order and confirms the result on the server. */
export async function payForOrder(
  orderId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const started = await startPayment(orderId);
  if (!started.ok) return started;

  if (!(await loadScript()) || !window.Razorpay) {
    return { ok: false, error: "Could not load the payment window. Check your internet and try again." };
  }

  return new Promise((resolve) => {
    const rzp = new window.Razorpay!({
      key: started.keyId,
      amount: started.amount,
      currency: "INR",
      order_id: started.razorpayOrderId,
      name: document.title.split("|")[0].trim() || "Store",
      description: `Order ${started.orderNumber}`,
      prefill: { name: started.name, contact: started.phone },
      theme: { color: "#1f2937" },
      handler: async (res: RazorpayResponse) => {
        const confirmed = await confirmPayment(
          orderId,
          res.razorpay_order_id,
          res.razorpay_payment_id,
          res.razorpay_signature
        );
        resolve(confirmed);
      },
      modal: {
        ondismiss: () =>
          resolve({ ok: false, error: "Payment was not completed. You can try again from your order page." }),
      },
    });
    rzp.on("payment.failed", () => {
      // The popup stays open so the customer can retry; the webhook records the failure.
    });
    rzp.open();
  });
}
