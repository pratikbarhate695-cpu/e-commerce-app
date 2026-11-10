import { listProducts } from "@/lib/catalog";
import { parsePageParam } from "@/lib/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { Pagination } from "@/components/storefront/pagination";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const { q: rawQ, page: rawPage } = await searchParams;
  const q = Array.isArray(rawQ) ? rawQ[0] : rawQ;
  const query = q?.trim() ?? "";
  const { products, total, page, pageSize, totalPages } = query
    ? await listProducts({ query, page: parsePageParam(rawPage) })
    : { products: [], total: 0, page: 1, pageSize: 24, totalPages: 1 };

  return (
    <main className="mx-auto min-h-[55vh] max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="max-w-2xl">
        <span className="site-kicker">Find your next favourite</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Search products</h1>
        <p className="mt-2 text-sm leading-6 text-ink/65">Search by product name or keyword.</p>
        <form action="/search" className="mt-6 flex flex-col gap-2 rounded-2xl border border-ink/50 bg-surface p-2 shadow-sm sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Try a phone, tablet, TV or accessory"
            aria-label="Search products"
            className="min-h-11 min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 text-sm outline-none placeholder:text-ink/65 focus:ring-0"
          />
          <button type="submit" className="site-primary-button">Search <span aria-hidden="true">⌕</span></button>
        </form>
      </div>

      <div className="mt-10">
        {query ? (
          <>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">Results for &ldquo;{query}&rdquo;</h2>
              <span className="text-xs text-ink/65">{total} {total === 1 ? "match" : "matches"}</span>
            </div>
            <ProductGrid products={products} emptyMessage={`No results for "${query}".`} />
            <Pagination
              basePath="/search"
              params={{ q: query }}
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink/20 px-5 py-12 text-center">
            <p className="text-sm text-ink/65">Enter a search term to explore the catalogue.</p>
          </div>
        )}
      </div>
    </main>
  );
}
