"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { payForOrder } from "@/components/storefront/razorpay-client";

export function PayNowButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    const result = await payForOrder(orderId);
    setBusy(false);
    if (!result.ok) setError(result.error);
    router.refresh();
  }

  return (
    <div>
      <Button type="button" onClick={onClick} disabled={busy}>
        {busy ? "Opening payment…" : "Pay now"}
      </Button>
      {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
