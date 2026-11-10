import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { listFeaturedProducts } from "@/lib/catalog";
import { getCategoryTreeSafe } from "@/lib/category-data";
import { visibleTree, type CategoryNode } from "@/lib/category-tree";
import { formatMoney } from "@/lib/format";
import { ProductGrid } from "@/components/storefront/product-grid";
import { ArrowIcon } from "@/components/storefront/icons";
import { getTrustItems, TrustBar } from "@/components/storefront/trust-bar";
import { DEMO_PRODUCTS, HERO_IMAGE } from "@/lib/demo-catalog";
import { getHomepageBanners } from "@/lib/banners/queries";
import { HeroCarousel } from "@/components/storefront/hero-banners";
import { SITE } from "@/lib/site";

export default async function HomePage() {
  const [featured, banners, tree, categoryImages, latest] = await Promise.all([
    listFeaturedProducts(),
    getHomepageBanners(),
    getCategoryTreeSafe(),
    prisma.product.findMany({
      where: { isActive: true, images: { some: {} } },
      distinct: ["categoryId"],
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: {
        categoryId: true,
        name: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, altText: true } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 16,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
  ]);

  // Real counts and images only. A tile counts the category's own active products
  // PLUS those in its subcategories, which is exactly what /category/[slug] lists,
  // so a tile never disagrees with its page and parents stay discoverable.
  const imageById = new Map(categoryImages.map((c) => [c.categoryId, c.images[0]]));
  const imageFor = (node: CategoryNode) => {
    const queue: CategoryNode[] = [node];
    for (let i = 0; i < queue.length; i++) {
      const image = imageById.get(queue[i].id);
      if (image) return image;
      queue.push(...queue[i].children);
    }
    return undefined;
  };
  const tiles = visibleTree(tree)
    .slice(0, 12)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c.totalCount, image: imageFor(c) }));

  // Demo samples are shown only when there are NO real products to display at all.
  const hasRealProducts = featured.length > 0 || latest.length > 0;

  const featuredIds = new Set(featured.map((p) => p.id));
  const latestOthers = latest.filter((p) => !featuredIds.has(p.id)).slice(0, 8);

  return (
    <main>
      {/* Published hero banners from the admin dashboard take the top of the page. */}
      {banners.hero.length > 0 ? (
        <HeroCarousel
          slides={banners.hero.map((b) => ({
            imageUrl: b.imageUrl,
            title: b.title,
            subtitle: b.subtitle,
            buttonText: b.buttonText,
            linkUrl: b.linkUrl,
            altText: b.altText,
          }))}
          fallbackHeading={SITE.name}
        />
      ) : (
        <>
        {/* BUILT-IN HERO: shown whenever no hero banner is published in Admin > Homepage banners. */}
        <section className="relative isolate overflow-hidden bg-[#050b16] text-white">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_32rem_at_78%_30%,rgba(37,99,235,0.34),transparent_62%),radial-gradient(40rem_24rem_at_0%_100%,rgba(14,165,233,0.12),transparent_60%),linear-gradient(180deg,#050b16,#081327)]"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:min-h-[580px] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-2 lg:px-8 lg:py-14">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">A considered collection of technology</p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem] xl:text-6xl">
                Technology,
                <span className="block bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  thoughtfully chosen.
                </span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
                Discover gadgets, devices and accessories, all in one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-7 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(37,99,235,0.45)] transition hover:bg-blue-700"
                >
                  Shop Now <ArrowIcon className="h-4 w-4" />
                </Link>
                <a
                  href="#categories"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 px-7 text-sm font-semibold text-white transition hover:border-sky-300 hover:bg-white/10"
                >
                  Explore Products
                </a>
              </div>
              <ul className="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 text-sm">
                {getTrustItems().map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="mt-0.5 text-sky-300">{item.icon}</span>
                    <span>
                      <span className="block font-semibold text-white">{item.title}</span>
                      <span className="block text-xs text-slate-300">{item.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hero artwork: a fixed image file, so it always shows. */}
            <div className="relative mx-auto w-full max-w-xl lg:max-w-none lg:origin-center lg:scale-105">
              <Image
                src={HERO_IMAGE}
                alt="Headphones, a laptop, a smartphone, earbuds and a smartwatch on illuminated stands"
                width={930}
                height={630}
                priority
                unoptimized
                className="h-auto w-full select-none"
              />
            </div>
          </div>
        </section>
        </>
      )}

      {tiles.length > 0 && (
        <section id="categories" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Shop by Category</h2>
              <p className="mt-2 text-sm text-ink/65">Find exactly what you need, from the latest devices to everyday essentials.</p>
            </div>
            <Link href="/shop" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
              View all <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {tiles.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/category/${t.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] w-full bg-white p-3">
                    {t.image ? (
                      <Image
                        src={t.image.url}
                        alt={t.image.altText ?? t.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, 45vw"
                        className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-ink">{t.name}</h3>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-accent">
                      {t.count} {t.count === 1 ? "product" : "products"} <ArrowIcon className="h-3.5 w-3.5" />
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {featured.length > 0 && (
        <section className="bg-[#f1f5fa] py-12 text-ink dark:bg-[#101a2a] sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Featured Products</h2>
                <p className="mt-2 text-sm text-ink/65">A closer look at products in our catalogue.</p>
              </div>
              <Link href="/shop" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                View all <ArrowIcon className="h-4 w-4" />
              </Link>
            </div>
            <ProductGrid products={featured} />
          </div>
        </section>
      )}

      {banners.promos.length > 0 && (
        <section aria-label="Store promotions" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {banners.promos.map((banner) => {
              const content = (
                <div className="group relative aspect-[16/7] w-full overflow-hidden rounded-2xl bg-ink/[0.04] shadow-sm transition hover:shadow-xl">
                  <Image
                    src={banner.imageUrl}
                    alt={banner.title ?? "Store promotion"}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  {banner.title && (
                    <span className="absolute bottom-3 left-3 rounded-full border border-white/30 bg-slate-950/75 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                      {banner.title}
                    </span>
                  )}
                </div>
              );
              return banner.linkUrl ? (
                <Link key={banner.id} href={banner.linkUrl}>{content}</Link>
              ) : (
                <div key={banner.id}>{content}</div>
              );
            })}
          </div>
        </section>
      )}

      {latestOthers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Latest additions</h2>
              <p className="mt-2 text-sm text-ink/65">The most recent products added to the catalogue.</p>
            </div>
            <Link href="/shop" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
              View all <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
          <ProductGrid products={latestOthers} />
        </section>
      )}

      {!hasRealProducts && (
        <section id="categories" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Sample products</h2>
              <p className="mt-2 text-sm text-ink/65">A preview of how products will look once the catalogue is added.</p>
            </div>
            <Link href="/shop" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
              Go to the shop <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
          <p
            role="note"
            className="mb-7 rounded-2xl border border-amber-600/30 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-100"
          >
            <strong>Visual preview only.</strong> These are sample items, not real products. They are not for sale and cannot be added to the cart.
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            {DEMO_PRODUCTS.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/preview/${p.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl"
                >
                  <div className="relative aspect-square w-full bg-white">
                    <Image
                      src={p.image}
                      alt=""
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 16vw, (min-width: 768px) 30vw, 45vw"
                      className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">Sample</span>
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
                    <h3 className="text-sm font-semibold leading-5 text-ink">{p.name}</h3>
                    <p className="mt-1 text-base font-bold text-ink">{formatMoney(p.price)}</p>
                    <span className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-2 text-sm font-semibold text-accent">
                      View preview <ArrowIcon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TrustBar />
    </main>
  );
}
