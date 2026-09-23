import { listProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/storefront/product-grid";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const { products } = query ? await listProducts({ query }) : { products: [] };

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <form action="/search" className="max-w-md">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search products"
          className="w-full border-0 border-b border-ink/25 bg-transparent py-2 font-serif text-2xl outline-none focus:border-accent"
        />
      </form>

      <div className="mt-10">
        {query ? (
          <ProductGrid
            products={products}
            emptyMessage={`No results for "${query}".`}
          />
        ) : (
          <p className="text-sm text-ink/50">Enter a search term above.</p>
        )}
      </div>
    </main>
  );
}
