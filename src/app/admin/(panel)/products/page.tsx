import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/admin/badge";
import { ToggleActiveButton } from "@/components/admin/toggle-active-button";
import { setProductActive } from "@/lib/actions/admin/products";
import { formatMoney } from "@/lib/format";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;

  const products = await prisma.product.findMany({
    where: q
      ? { name: { contains: q, mode: "insensitive" } }
      : undefined,
    include: { category: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <AdminHeader
        title="Products"
        action={
          <Link
            href="/admin/products/new"
            className="bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
          >
            New product
          </Link>
        }
      />

      <div className="px-8 py-6">
        <form className="max-w-sm">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name"
            className="w-full border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </form>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-ink/50">
              <th className="py-2 font-normal">Product</th>
              <th className="py-2 font-normal">Category</th>
              <th className="py-2 font-normal">Price</th>
              <th className="py-2 font-normal">Stock</th>
              <th className="py-2 font-normal">Status</th>
              <th className="py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-ink/5">
                <td className="py-3">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="underline underline-offset-4"
                  >
                    {product.name}
                  </Link>
                  <p className="text-xs text-ink/40">{product.sku}</p>
                </td>
                <td className="py-3 text-ink/70">{product.category.name}</td>
                <td className="py-3 text-ink/70">{formatMoney(product.sellingPrice)}</td>
                <td className="py-3">
                  {product.stockQty}
                  {product.stockQty <= product.lowStockThreshold && (
                    <span className="ml-2">
                      <Badge tone="warn">Low</Badge>
                    </span>
                  )}
                </td>
                <td className="py-3">
                  <Badge tone={product.isActive ? "good" : "neutral"}>
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="py-3">
                  <ToggleActiveButton
                    id={product.id}
                    isActive={product.isActive}
                    action={setProductActive}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <p className="mt-8 text-sm text-ink/50">No products found.</p>
        )}
      </div>
    </div>
  );
}
