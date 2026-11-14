import Link from "next/link";
import Image from "next/image";
import type { Product, ProductImage } from "@prisma/client";
import { formatMoney } from "@/lib/format";

type Props = {
  product: Product & { images: ProductImage[] };
};

export function ProductCard({ product }: Props) {
  const image = product.images[0];
  const hasDiscount = Number(product.discountPct) > 0;
  const outOfStock = product.stockQty <= 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block overflow-hidden rounded-[1.35rem] border border-ink/10 bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-xl"
    >
      <div className="relative aspect-[4/4.5] w-full overflow-hidden bg-[#f5f7fb] p-4 sm:p-5 dark:bg-[#f1f4f8]">
        {(hasDiscount || outOfStock) && (
          <div className="absolute inset-x-3 top-3 z-10 flex flex-wrap items-start gap-1.5">
            {hasDiscount && (
              <span className="whitespace-nowrap rounded-full bg-accent px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-on-accent">
                {Number(product.discountPct) > 0 ? `Save ${Number(product.discountPct)}%` : "Offer"}
              </span>
            )}
            {outOfStock && (
              <span className="whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-paper">
                Out of stock
              </span>
            )}
          </div>
        )}
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            width={480}
            height={540}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.045]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-600">
            Image coming soon
          </div>
        )}
      </div>
      <div className="p-3.5 sm:p-4">
        {product.brand && (
          <p className="mb-1 truncate text-xs font-semibold tracking-wide text-accent">{product.brand}</p>
        )}
        <h3 className="min-h-10 text-sm font-semibold leading-5 text-ink transition-colors group-hover:text-accent sm:text-[15px]">
          {product.name}
        </h3>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-bold tracking-tight text-ink">{formatMoney(product.sellingPrice)}</span>
          {hasDiscount && (
            <span className="text-sm text-ink/65 line-through">
              {formatMoney(product.mrp)}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3 text-sm font-semibold">
          <span className="text-ink/65">View details</span>
          <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-base text-accent transition group-hover:bg-accent group-hover:text-on-accent">↗</span>
        </div>
      </div>
    </Link>
  );
}
