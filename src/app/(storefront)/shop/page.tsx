import Link from "next/link";
import { listProducts } from "@/lib/catalog";
import { getCategoryTreeSafe } from "@/lib/category-data";
import { visibleTree } from "@/lib/category-tree";
import { parsePageParam } from "@/lib/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { Pagination } from "@/components/storefront/pagination";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { page: rawPage } = await searchParams;
  const [{ products, total, page, pageSize, totalPages }, tree] = await Promise.all([
    listProducts({ page: parsePageParam(rawPage) }),
    getCategoryTreeSafe(),
  ]);
  const categories = visibleTree(tree);

  return (
    <main className="mx-auto min-h-[55vh] max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mb-8 border-b border-ink/10 pb-7">
        <span className="site-kicker">The catalogue</span>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Shop all products</h1>
            <p className="mt-2 text-sm text-ink/65">Browse the catalogue and open a product to see its details.</p>
          </div>
          <span className="rounded-full bg-ink/[0.05] px-3 py-1.5 text-xs font-semibold text-ink/65">{total} {total === 1 ? "product" : "products"}</span>
        </div>
      </div>
      {categories.length > 0 && (
        <nav id="categories" aria-label="Browse by category" className="mb-8 scroll-mt-32">
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/category/${c.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
                >
                  {c.name}
                  <span className="text-xs font-medium text-ink/65">{c.totalCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <ProductGrid products={products} />
      <Pagination basePath="/shop" page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
    </main>
  );
}
