import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { getDeliverySummary } from "@/lib/order-status";
import { PaymentBadge, StatusBadge } from "@/components/orders/status-badge";

// Always read fresh data so a status change shows up on the next refresh.
export const dynamic = "force-dynamic";

const MAX_LISTED_ITEMS = 2;

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) notFound();

  // Scoped to the signed-in user in the query itself.
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50, // no pagination yet — plenty for a customer's history
    include: {
      items: {
        include: {
          product: {
            select: {
              images: {
                orderBy: { sortOrder: "asc" },
                take: 1,
                select: { url: true, altText: true },
              },
            },
          },
        },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: {
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
      <h1 className="font-serif text-3xl">My orders</h1>

      {orders.length === 0 ? (
        <div className="mt-10">
          <p className="text-sm text-ink/60">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/shop"
            className="mt-3 inline-block text-sm underline underline-offset-4"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
          {orders.map((order) => {
            const image = order.items[0]?.product.images[0];
            const shownItems = order.items.slice(0, MAX_LISTED_ITEMS);
            const hiddenCount = order.items.length - shownItems.length;
            const delivery = getDeliverySummary({
              status: order.status,
              estimatedDelivery: order.estimatedDelivery,
              history: order.statusHistory,
            });

            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="flex gap-4 py-5 transition-colors hover:bg-ink/[0.03] focus-visible:bg-ink/[0.03]"
              >
                <div className="h-20 w-16 shrink-0 overflow-hidden bg-ink/[0.04]">
                  {image && (
                    <Image
                      src={image.url}
                      alt={image.altText ?? ""}
                      width={80}
                      height={100}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm">{order.orderNumber}</p>
                    <StatusBadge status={order.status} />
                  </div>

                  <ul className="mt-2 space-y-0.5 text-sm text-ink/80">
                    {shownItems.map((item) => (
                      <li key={item.id} className="truncate">
                        {item.productNameSnapshot} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                  {hiddenCount > 0 && (
                    <p className="mt-0.5 text-xs text-ink/50">
                      +{hiddenCount} more {hiddenCount === 1 ? "item" : "items"}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-ink/50">
                    Placed {formatDate(order.createdAt)}
                  </p>
                  {delivery && <p className="mt-0.5 text-xs text-ink/80">{delivery}</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm">{formatMoney(order.grandTotal)}</span>
                    <PaymentBadge
                      status={order.paymentStatus}
                      method={order.paymentMethod}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
