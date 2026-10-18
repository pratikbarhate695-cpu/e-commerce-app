import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { getProductBySlug } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import { auth } from "@/lib/session";
import { getProductFeedback, getUserReview } from "@/lib/reviews";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";
import { DeliveryInfo, TrustBadges } from "@/components/storefront/trust-badges";
import { ReviewsSection } from "@/components/storefront/reviews-section";
import { Stars } from "@/components/storefront/stars";

// Delivery date, reviews and questions must always be fresh.
export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [session, feedback] = await Promise.all([auth(), getProductFeedback(product.id)]);
  const userId = session?.user?.id ?? null;
  const hasReviewed = userId ? Boolean(await getUserReview(product.id, userId)) : false;

  const hasDiscount = Number(product.discountPct) > 0;

  return (
    <>
      <main className="mx-auto grid max-w-4xl grid-cols-1 gap-10 px-6 py-16 sm:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <p className="text-sm text-ink/50">{product.category.name}</p>
          <h1 className="mt-1 font-serif text-3xl">{product.name}</h1>

          {feedback.count > 0 && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-ink/70">
              <Stars value={feedback.average} />
              <span>
                {feedback.average.toFixed(1)} ({feedback.count})
              </span>
            </a>
          )}

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-xl">{formatMoney(product.sellingPrice)}</span>
            {hasDiscount && (
              <span className="text-sm text-ink/40 line-through">
                {formatMoney(product.mrp)}
              </span>
            )}
          </div>

          {product.highlights.length > 0 && (
            <ul className="mt-6 max-w-md list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/80">
              {product.highlights.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          )}

          <p className="mt-6 max-w-md whitespace-pre-line text-sm leading-relaxed text-ink/80">
            {product.description}
          </p>

          <DeliveryInfo />

          <div className="mt-6">
            <AddToCartForm productId={product.id} maxQuantity={product.stockQty} />
          </div>

          <TrustBadges />

          {product.stockQty > 0 && product.stockQty <= product.lowStockThreshold && (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
              Only {product.stockQty} left.
            </p>
          )}
        </div>
      </main>

      <ReviewsSection
        productId={product.id}
        slug={product.slug}
        feedback={feedback}
        signedIn={Boolean(userId)}
        hasReviewed={hasReviewed}
      />
    </>
  );
}
