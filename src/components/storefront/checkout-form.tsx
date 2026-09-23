"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { placeOrder } from "@/lib/actions/checkout";

export function CheckoutForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await placeOrder(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/account/orders/${result.orderId}?placed=1`);
    });
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
        <input type="hidden" name="paymentMethod" value="COD" />
        <p className="text-sm text-ink/80">
          Cash on delivery — pay when your order arrives.
        </p>
      </fieldset>

      <Field label="Coupon code (optional)" name="couponCode" />

      {error && <p className="text-sm text-red-700">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}
