import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { formatMoney } from "@/lib/format";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  const [orderCount, revenue, lowStock, pendingOrders] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({
      _sum: { grandTotal: true },
      where: { status: { notIn: ["CANCELLED"] } },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, stockQty: true, lowStockThreshold: true },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
  ]);

  const lowStockProducts = lowStock.filter((p) => p.stockQty <= p.lowStockThreshold);

  const stats = [
    { label: "Orders", value: orderCount },
    { label: "Revenue", value: formatMoney(revenue._sum.grandTotal ?? 0) },
    { label: "Pending orders", value: pendingOrders },
    { label: "Low stock items", value: lowStockProducts.length },
  ];

  return (
    <div>
      <AdminHeader title="Dashboard" />
      <div className="px-8 py-6">
        <p className="text-sm text-ink/60">
          Signed in as {admin.email} ({admin.role}).
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="border border-ink/10 p-4">
              <p className="text-xs text-ink/50">{s.label}</p>
              <p className="mt-1 text-xl">{s.value}</p>
            </div>
          ))}
        </div>

        {lowStockProducts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm text-ink/60">Needs restocking</h2>
            <ul className="mt-3 space-y-1">
              {lowStockProducts.map((p) => (
                <li key={p.id} className="text-sm">
                  <Link href="/admin/inventory" className="underline underline-offset-4">
                    {p.name}
                  </Link>{" "}
                  — {p.stockQty} left
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
