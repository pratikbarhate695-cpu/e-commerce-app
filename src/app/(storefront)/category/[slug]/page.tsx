import Link from "next/link";
import { notFound } from "next/navigation";
import { listProducts } from "@/lib/catalog";
import { getCategoryTree } from "@/lib/category-data";
import { ancestorsOf, descendantSlugs } from "@/lib/category-tree";
import { parsePageParam } from "@/lib/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { Pagination } from "@/components/storefront/pagination";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { slug } = await params;
  const { page: rawPage } = await searchParams;
  const tree = await getCategoryTree();
  const category = tree.bySlug.get(slug);
  if (!category) notFound();

  // A category page lists its own products AND every descendant's, matching the
  // count shown on navigation tiles. Subcategories are linked for narrowing down.
  const { products, total, page, pageSize, totalPages } = await listProducts({
    categorySlugs: descendantSlugs(tree, slug),
    page: parsePageParam(rawPage),
  });
  const ancestors = ancestorsOf(tree, slug);
  const subcategories = category.children.filter((c) => c.totalCount > 0);

  return (
    <main className="mx-auto min-h-[55vh] max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mb-8 border-b border-ink/10 pb-7">
        {ancestors.length > 0 ? (
          <nav aria-label="Breadcrumb" className="text-sm text-ink/65">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {ancestors.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <Link href={`/category/${a.slug}`} className="underline underline-offset-2 hover:text-accent">
                    {a.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </li>
              ))}
              <li aria-current="page">{category.name}</li>
            </ol>
          </nav>
        ) : (
          <span className="site-kicker">Category</span>
        )}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{category.name}</h1>
            <p className="mt-2 text-sm text-ink/65">Explore products in this collection.</p>
          </div>
          <span className="rounded-full bg-ink/[0.05] px-3 py-1.5 text-xs font-semibold text-ink/65">
            {total} {total === 1 ? "product" : "products"}
          </span>
        </div>

        {subcategories.length > 0 && (
          <nav aria-label={`Subcategories of ${category.name}`} className="mt-5">
            <ul className="flex flex-wrap gap-2">
              {subcategories.map((c) => (
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
      </div>
      <ProductGrid products={products} emptyMessage="No products in this category yet." />
      <Pagination
        basePath={`/category/${encodeURIComponent(category.slug)}`}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
      />
    </main>
  );
}
