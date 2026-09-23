import type { Product, ProductImage } from "@prisma/client";
import { ProductCard } from "@/components/storefront/product-card";

type Props = {
  products: (Product & { images: ProductImage[] })[];
  emptyMessage?: string;
};

export function ProductGrid({ products, emptyMessage = "No products found." }: Props) {
  if (products.length === 0) {
    return <p className="py-16 text-center text-sm text-ink/50">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
