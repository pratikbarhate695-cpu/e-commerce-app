"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { placeOrder } from "@/lib/actions/checkout";
import { payForOrder } from "@/components/storefront/razorpay-client";

export function CheckoutForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const formData = new FormData(e.currentTarget);

    const result = await placeOrder(formData);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    // Order is saved as "payment pending". Open the payment window now.
    // If it is closed or fails, the order page has a "Pay now" button.
    const paid = await payForOrder(result.orderId);
    const q = new URLSearchParams({ placed: "1" });
    if (!paid.ok) q.set("perr", paid.error.slice(0, 200));
    router.push(`/account/orders/${result.orderId}?${q.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <fieldset className="space-y-5">
        <legend className="mb-1 text-sm text-ink/60">Shipping address</legend>
        <Field label="Full name" name="fullName" required />
        <Field label="Phone" name="phone" type="tel" required />
        <Field label="Address line 1" name="line1" required />
        <Field label="Address line 2 (optional)" name="line2" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="City" name="city" required />
          <Field label="State" name="state" required />
        </div>
        <Field label="Postal code" name="pincode" required />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm text-ink/60">Payment method</legend>
        <input type="hidden" name="paymentMethod" value="RAZORPAY" />
        <p className="text-sm text-ink/80">
          Pay online with UPI, card or net banking. Your order is shipped after
          payment is confirmed.
        </p>
      </fieldset>

      <Field label="Coupon code (optional)" name="couponCode" />

      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Please wait…" : "Pay and place order"}
      </Button>
    </form>
  );
}
