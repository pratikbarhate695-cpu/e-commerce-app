"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/actions/cart";
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
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAdded(false);
    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("quantity", String(quantity));

    startTransition(async () => {
      const result = await addToCart(formData);
      if (!result.ok) {
        if (result.error === "Not authorized.") {
          router.push(`/login?from=/product`);
          return;
        }
        setError(result.error);
        return;
      }
      setAdded(true);
      router.refresh();
    });
  }

  if (maxQuantity < 1) {
    return <p className="text-sm text-ink/50">Out of stock.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
      {error && <p className="text-sm text-red-700">{error}</p>}
      {added && <p className="text-sm text-accent">Added to cart.</p>}
      <Button type="submit" disabled={isPending} className="w-auto px-8">
        {isPending ? "Adding…" : "Add to cart"}
      </Button>
    </form>
  );
}
