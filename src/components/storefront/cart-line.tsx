"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatMoney } from "@/lib/format";
import { updateCartItem, removeFromCart } from "@/lib/actions/cart";

type Props = {
  item: {
    productId: string;
    quantity: number;
    product: {
      name: string;
      sellingPrice: number;
      stockQty: number;
      images: {
        url: string;
        altText: string | null;
      }[];
    };
  };
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-ink/10 py-5 sm:flex-nowrap">
      <div className="h-20 w-16 shrink-0 overflow-hidden bg-ink/[0.04]">
        {image && (
          <Image
            src={image.url}
            alt={image.altText ?? item.product.name}
            width={80}
            height={100}
            className="h-full w-full object-contain"
          />
        )}
      </div>
      <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-auto">
        <p className="break-words text-sm">{item.product.name}</p>
        <p className="mt-1 text-sm text-ink/65">
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
        className="w-16 rounded-lg border border-ink/50 bg-surface py-2 text-center focus:border-accent"
      />
      <p className="flex-1 text-right text-sm sm:w-24 sm:flex-none">{formatMoney(lineTotal)}</p>
      <button
        type="button"
        onClick={remove}
        disabled={isPending}
        className="px-1 py-2 text-sm text-ink/65 underline underline-offset-4 hover:text-ink"
      >
        Remove
      </button>
    </div>
  );
}
