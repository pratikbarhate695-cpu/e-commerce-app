import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_PRODUCTS, getDemoProduct } from "@/lib/demo-catalog";
import { formatMoney } from "@/lib/format";
import { ArrowIcon } from "@/components/storefront/icons";

/**
 * VISUAL PREVIEW ONLY. Sample products are not in the database, have no stock and
 * deliberately have no cart, checkout or payment controls. Search engines are told
 * to ignore these pages.
 */
export const metadata: Metadata = {
  title: "Sample product preview",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return DEMO_PRODUCTS.map((p) => ({ slug: p.slug }));
}

export default async function PreviewProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getDemoProduct(slug);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink/65">
        <Link href="/" className="inline-block py-2 hover:text-accent hover:underline">Home</Link>
        <span aria-hidden="true"> / </span>
        <span className="inline-block py-2">Sample products</span>
      </nav>

      <p
        role="note"
        className="mb-8 rounded-2xl border border-amber-600/30 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-100"
      >
        <strong>Visual preview only.</strong> This is a sample product that shows how a product page will look. It is not
        for sale, has no stock, and cannot be added to the cart or bought.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-ink/10 bg-white">
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority
            unoptimized
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-contain p-6"
          />
          <span className="absolute left-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">Sample</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{product.name}</h1>
          <p className="mt-4 text-3xl font-bold tracking-tight">{formatMoney(product.price)}</p>
          <p className="mt-1 text-sm text-ink/65">Sample price, for display only</p>

          <p className="mt-6 text-sm leading-relaxed text-ink/80">{product.summary}</p>

          <ul className="mt-6 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/80">
            {product.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>

          <section aria-labelledby="sample-specs" className="mt-8">
            <h2 id="sample-specs" className="text-lg font-semibold">Sample specifications</h2>
            <dl className="mt-3 divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-surface text-sm">
              {product.specs.map((row) => (
                <div key={row.label} className="grid grid-cols-[8rem_1fr] gap-4 px-4 py-3">
                  <dt className="min-w-0 break-words text-ink/65">{row.label}</dt>
                  <dd className="min-w-0 break-words font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="site-primary-button">
              Browse the shop <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link href="/" className="site-secondary-button min-h-12">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
