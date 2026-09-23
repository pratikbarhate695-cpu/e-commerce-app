import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const { placed } = await searchParams;
  if (!session?.user) notFound();

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      {placed && (
        <p className="mb-6 border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          Order placed. A confirmation will be sent to your email.
        </p>
      )}
      <p className="text-sm text-ink/50">Order {order.orderNumber}</p>
      <h1 className="mt-1 font-serif text-3xl">Thank you</h1>
      <p className="mt-2 text-sm text-ink/60">Status: {order.status}</p>

      <div className="mt-8 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-ink/80">
              {item.productNameSnapshot} × {item.quantity}
            </span>
            <span>{formatMoney(item.lineTotal)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1 border-t border-ink/10 pt-4 text-sm">
        <div className="flex justify-between text-ink/60">
          <span>Subtotal</span>
          <span>{formatMoney(order.subtotal)}</span>
        </div>
        {Number(order.discountTotal) > 0 && (
          <div className="flex justify-between text-ink/60">
            <span>Discount</span>
            <span>-{formatMoney(order.discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-ink/60">
          <span>Shipping</span>
          <span>{formatMoney(order.shippingFee)}</span>
        </div>
        <div className="flex justify-between text-ink/60">
          <span>Tax</span>
          <span>{formatMoney(order.taxTotal)}</span>
        </div>
      </div>
      <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 text-base">
        <span>Total</span>
        <span>{formatMoney(order.grandTotal)}</span>
      </div>
    </main>
  );
}
