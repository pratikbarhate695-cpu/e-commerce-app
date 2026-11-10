import Link from "next/link";
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

/** "cableLength" -> "Cable length" */
function specLabel(key: string) {
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Specifications are stored as a flat JSON object; render only simple values. */
function getSpecRows(specs: unknown): { label: string; value: string }[] {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return [];
  return Object.entries(specs as Record<string, unknown>).flatMap(([key, value]) => {
    const text = Array.isArray(value)
      ? value.filter((v) => typeof v === "string" || typeof v === "number").join(", ")
      : typeof value === "string" || typeof value === "number"
        ? String(value)
        : "";
    return text ? [{ label: specLabel(key), value: text }] : [];
  });
}

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
  const specRows = getSpecRows(product.specifications);
  const outOfStock = product.stockQty <= 0;

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink/65">
          <Link href="/shop" className="inline-block py-2 hover:text-accent hover:underline">Shop</Link>
          <span aria-hidden="true"> / </span>
          <Link href={`/category/${product.category.slug}`} className="inline-block py-2 hover:text-accent hover:underline">{product.category.name}</Link>
        </nav>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          {product.brand && <p className="text-sm font-semibold text-accent">{product.brand}</p>}
          <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{product.name}</h1>

          {feedback.count > 0 && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-ink/70">
              <Stars value={feedback.average} />
              <span>
                {feedback.average.toFixed(1)} ({feedback.count})
              </span>
            </a>
          )}

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight">{formatMoney(product.sellingPrice)}</span>
            {hasDiscount && (
              <span className="text-base text-ink/65 line-through">
                {formatMoney(product.mrp)}
              </span>
            )}
          </div>

          <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${outOfStock ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${outOfStock ? "bg-red-600" : "bg-emerald-600"}`} />
            {outOfStock ? "Out of stock" : "In stock"}
          </p>

          {product.highlights.length > 0 && (
            <ul className="mt-6 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/80">
              {product.highlights.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          )}

          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-ink/80">
            {product.description}
          </p>

          <DeliveryInfo />

          <div className="mt-6">
            <AddToCartForm productId={product.id} maxQuantity={product.stockQty} />
          </div>

          <TrustBadges />

          {specRows.length > 0 && (
            <section aria-labelledby="specs-heading" className="mt-8">
              <h2 id="specs-heading" className="text-lg font-semibold">Specifications</h2>
              <dl className="mt-3 divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-surface text-sm">
                {specRows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[9rem_1fr] gap-4 px-4 py-3">
                    <dt className="min-w-0 break-words text-ink/65">{row.label}</dt>
                    <dd className="min-w-0 break-words font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {product.stockQty > 0 && product.stockQty <= product.lowStockThreshold && (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
              Only {product.stockQty} left.
            </p>
          )}
        </div>
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
