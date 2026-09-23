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

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="aspect-[4/5] w-full overflow-hidden bg-ink/[0.04]">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            width={480}
            height={600}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink/40">
            No image
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm text-ink">{product.name}</h3>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-sm text-ink/80">{formatMoney(product.sellingPrice)}</span>
        {hasDiscount && (
          <span className="text-xs text-ink/40 line-through">
            {formatMoney(product.mrp)}
          </span>
        )}
      </div>
    </Link>
  );
}
