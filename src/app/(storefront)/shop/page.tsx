import { listProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/storefront/product-grid";

export default async function ShopPage() {
  const { products } = await listProducts({});

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-serif text-3xl">Shop</h1>
      <div className="mt-10">
        <ProductGrid products={products} />
      </div>
    </main>
  );
}
