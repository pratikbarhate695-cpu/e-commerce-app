import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { OrderStatusBadge } from "@/components/admin/badge";
import { formatMoney } from "@/lib/format";
import type { OrderStatus } from "@prisma/client";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const activeStatus = STATUSES.find((s) => s === status);

  const orders = await prisma.order.findMany({
    where: activeStatus ? { status: activeStatus } : undefined,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <AdminHeader title="Orders" />
      <div className="px-8 py-6">
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/admin/orders"
            className={`px-2 py-1 ${!activeStatus ? "bg-ink text-paper" : "bg-ink/[0.06] text-ink/60"}`}
          >
            All
          </Link>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/orders?status=${s}`}
              className={`px-2 py-1 ${activeStatus === s ? "bg-ink text-paper" : "bg-ink/[0.06] text-ink/60"}`}
            >
              {s}
            </Link>
          ))}
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-ink/50">
              <th className="py-2 font-normal">Order</th>
              <th className="py-2 font-normal">Customer</th>
              <th className="py-2 font-normal">Total</th>
              <th className="py-2 font-normal">Status</th>
              <th className="py-2 font-normal">Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-ink/5">
                <td className="py-3">
                  <Link href={`/admin/orders/${order.id}`} className="underline underline-offset-4">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="py-3 text-ink/70">{order.user.email}</td>
                <td className="py-3 text-ink/70">{formatMoney(order.grandTotal)}</td>
                <td className="py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="py-3 text-ink/50">{order.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <p className="mt-8 text-sm text-ink/50">No orders found.</p>
        )}
      </div>
    </div>
  );
}
