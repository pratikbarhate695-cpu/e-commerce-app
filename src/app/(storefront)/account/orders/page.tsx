import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) notFound();

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-serif text-3xl">Your orders</h1>

      {orders.length === 0 ? (
        <p className="mt-10 text-sm text-ink/60">No orders yet.</p>
      ) : (
        <div className="mt-10 divide-y divide-ink/10">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex items-center justify-between py-4"
            >
              <div>
                <p className="text-sm">{order.orderNumber}</p>
                <p className="text-xs text-ink/50">
                  {order.createdAt.toLocaleDateString()} · {order.status}
                </p>
              </div>
              <span className="text-sm">{formatMoney(order.grandTotal)}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
