import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { listFeaturedProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/storefront/product-grid";

export default async function HomePage() {
  const [featured, banners] = await Promise.all([
    listFeaturedProducts(),
    prisma.homepageBanner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      {banners.length > 0 && (
        <div className="mb-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {banners.map((banner) => {
            const content = (
              <div className="relative aspect-[16/7] w-full overflow-hidden bg-ink/[0.04]">
                <Image
                  src={banner.imageUrl}
                  alt={banner.title ?? ""}
                  fill
                  className="object-cover"
                />
                {banner.title && (
                  <span className="absolute bottom-3 left-3 bg-paper/90 px-3 py-1 text-sm">
                    {banner.title}
                  </span>
                )}
              </div>
            );
            return banner.linkUrl ? (
              <Link key={banner.id} href={banner.linkUrl}>
                {content}
              </Link>
            ) : (
              <div key={banner.id}>{content}</div>
            );
          })}
        </div>
      )}

      <h1 className="font-serif text-4xl">Store</h1>
      <p className="mt-3 max-w-md text-ink/70">
        A small, well-made catalog. Browse everything in{" "}
        <a href="/shop" className="underline underline-offset-4">
          the shop
        </a>
        .
      </p>

      {featured.length > 0 && (
        <div className="mt-14">
          <h2 className="text-sm text-ink/50">Featured</h2>
          <div className="mt-6">
            <ProductGrid products={featured} />
          </div>
        </div>
      )}
    </main>
  );
}
