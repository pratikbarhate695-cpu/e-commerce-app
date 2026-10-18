"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addToCart, buyNow } from "@/lib/actions/cart";
import { Button } from "@/components/ui/button";

export function AddToCartForm({
  productId,
  maxQuantity,
}: {
  productId: string;
  maxQuantity: number;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);

  async function run(kind: "add" | "buy") {
    setError(null);
    setAdded(false);
    setBusy(kind);

    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("quantity", String(quantity));

    const result = kind === "add" ? await addToCart(formData) : await buyNow(formData);
    if (!result.ok) {
      setBusy(null);
      if (result.error === "Not authorized.") {
        const here = window.location.pathname;
        router.push(`/login?from=${encodeURIComponent(here)}`);
        return;
      }
      setError(result.error);
      return;
    }

    if (kind === "buy") {
      router.push("/checkout"); // stays "busy" until the next page opens
      return;
    }
    setBusy(null);
    setAdded(true);
    router.refresh();
  }

  if (maxQuantity < 1) {
    return <p className="text-sm text-ink/50">Out of stock.</p>;
  }

  return (
    <div className="space-y-4">
      <label className="block w-28">
        <span className="text-sm text-ink/70">Quantity</span>
        <input
          type="number"
          min={1}
          max={maxQuantity}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="mt-1 w-full border-0 border-b border-ink/25 bg-transparent py-2 outline-none focus:border-accent"
        />
      </label>

      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="max-w-xs space-y-3">
        <Button type="button" onClick={() => run("add")} disabled={busy !== null}>
          {busy === "add" ? "Adding…" : "Add to cart"}
        </Button>

        <button
          type="button"
          onClick={() => run("buy")}
          disabled={busy !== null}
          className="w-full border border-ink py-3 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
        >
          {busy === "buy" ? "Opening checkout…" : "Buy now"}
        </button>

        {added && (
          <div className="border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
            <p className="text-accent">Added to cart.</p>
            <div className="mt-2 flex gap-5">
              <Link href="/cart" className="underline underline-offset-4">
                View cart
              </Link>
              <Link href="/checkout" className="font-medium underline underline-offset-4">
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
