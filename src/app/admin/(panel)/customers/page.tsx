import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { formatMoney } from "@/lib/format";

export default async function CustomersPage() {
  await requireAdmin();

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: { orders: { select: { grandTotal: true, status: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <AdminHeader title="Customers" />
      <div className="px-8 py-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-ink/50">
              <th className="py-2 font-normal">Name</th>
              <th className="py-2 font-normal">Email</th>
              <th className="py-2 font-normal">Orders</th>
              <th className="py-2 font-normal">Lifetime spend</th>
              <th className="py-2 font-normal">Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const validOrders = c.orders.filter((o) => o.status !== "CANCELLED");
              const spend = validOrders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
              return (
                <tr key={c.id} className="border-b border-ink/5">
                  <td className="py-3">{c.name}</td>
                  <td className="py-3 text-ink/70">{c.email}</td>
                  <td className="py-3 text-ink/70">{c.orders.length}</td>
                  <td className="py-3 text-ink/70">{formatMoney(spend)}</td>
                  <td className="py-3 text-ink/50">{c.createdAt.toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {customers.length === 0 && (
          <p className="mt-8 text-sm text-ink/50">No customers yet.</p>
        )}
      </div>
    </div>
  );
}
