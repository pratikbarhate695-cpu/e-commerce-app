import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductBySlug } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const image = product.images[0];
  const hasDiscount = Number(product.discountPct) > 0;

  return (
    <main className="mx-auto grid max-w-4xl grid-cols-1 gap-10 px-6 py-16 sm:grid-cols-2">
      <div className="aspect-[4/5] w-full overflow-hidden bg-ink/[0.04]">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            width={640}
            height={800}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink/40">
            No image
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-ink/50">{product.category.name}</p>
        <h1 className="mt-1 font-serif text-3xl">{product.name}</h1>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-xl">{formatMoney(product.sellingPrice)}</span>
          {hasDiscount && (
            <span className="text-sm text-ink/40 line-through">
              {formatMoney(product.mrp)}
            </span>
          )}
        </div>

        <p className="mt-6 max-w-md text-sm leading-relaxed text-ink/80">
          {product.description}
        </p>

        <div className="mt-8">
          <AddToCartForm productId={product.id} maxQuantity={product.stockQty} />
        </div>

        {product.stockQty > 0 && product.stockQty <= product.lowStockThreshold && (
          <p className="mt-4 text-sm text-amber-700">
            Only {product.stockQty} left.
          </p>
        )}
      </div>
    </main>
  );
}
