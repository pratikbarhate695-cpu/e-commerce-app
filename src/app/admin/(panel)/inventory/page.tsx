import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/admin/badge";
import { InventoryAdjustForm } from "@/components/admin/inventory-adjust-form";

export default async function InventoryPage() {
  await requireAdmin();

  const [products, history] = await Promise.all([
    prisma.product.findMany({ orderBy: { stockQty: "asc" } }),
    prisma.inventoryHistory.findMany({
      include: { product: true, admin: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div>
      <AdminHeader title="Inventory" />
      <div className="grid grid-cols-1 gap-10 px-8 py-6 sm:grid-cols-2">
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50">
                <th className="py-2 font-normal">Product</th>
                <th className="py-2 font-normal">Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-ink/5">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2">
                    {p.stockQty}
                    {p.stockQty <= p.lowStockThreshold && (
                      <span className="ml-2">
                        <Badge tone={p.stockQty === 0 ? "bad" : "warn"}>
                          {p.stockQty === 0 ? "Out of stock" : "Low"}
                        </Badge>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mb-3 mt-10 text-sm text-ink/60">Recent changes</h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="text-xs text-ink/60">
                <span className="text-ink/80">{h.product.name}</span>{" "}
                {h.quantityChanged > 0 ? "+" : ""}
                {h.quantityChanged} ({h.reason.toLowerCase()})
                {h.admin ? ` by ${h.admin.name}` : ""} ·{" "}
                {h.createdAt.toLocaleString()}
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-sm text-ink/50">No changes yet.</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-sm text-ink/60">Adjust stock</h2>
          <InventoryAdjustForm products={products} />
        </div>
      </div>
    </div>
  );
}
