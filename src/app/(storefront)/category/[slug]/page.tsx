import { notFound } from "next/navigation";
import { getCategoryBySlug, listProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/storefront/product-grid";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const { products } = await listProducts({ categorySlug: slug });

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-serif text-3xl">{category.name}</h1>
      <div className="mt-10">
        <ProductGrid products={products} emptyMessage="No products in this category yet." />
      </div>
    </main>
  );
}
