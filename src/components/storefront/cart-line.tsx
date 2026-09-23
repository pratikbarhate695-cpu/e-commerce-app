"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { CartItem, Product, ProductImage } from "@prisma/client";
import { formatMoney } from "@/lib/format";
import { updateCartItem, removeFromCart } from "@/lib/actions/cart";

type Props = {
  item: CartItem & { product: Product & { images: ProductImage[] } };
};

export function CartLine({ item }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const image = item.product.images[0];
  const lineTotal = Number(item.product.sellingPrice) * item.quantity;

  function setQuantity(quantity: number) {
    const formData = new FormData();
    formData.set("productId", item.productId);
    formData.set("quantity", String(quantity));
    startTransition(async () => {
      await updateCartItem(formData);
      router.refresh();
    });
  }

  function remove() {
    const formData = new FormData();
    formData.set("productId", item.productId);
    startTransition(async () => {
      await removeFromCart(formData);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4 border-b border-ink/10 py-5">
      <div className="h-20 w-16 shrink-0 overflow-hidden bg-ink/[0.04]">
        {image && (
          <Image
            src={image.url}
            alt={image.altText ?? item.product.name}
            width={80}
            height={100}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm">{item.product.name}</p>
        <p className="mt-1 text-sm text-ink/50">
          {formatMoney(item.product.sellingPrice)}
        </p>
      </div>
      <input
        type="number"
        min={0}
        max={item.product.stockQty}
        defaultValue={item.quantity}
        disabled={isPending}
        onBlur={(e) => setQuantity(Number(e.target.value))}
        className="w-16 border-0 border-b border-ink/25 bg-transparent py-1 text-center outline-none focus:border-accent"
      />
      <p className="w-24 text-right text-sm">{formatMoney(lineTotal)}</p>
      <button
        type="button"
        onClick={remove}
        disabled={isPending}
        className="text-sm text-ink/40 underline underline-offset-4 hover:text-ink/70"
      >
        Remove
      </button>
    </div>
  );
}
