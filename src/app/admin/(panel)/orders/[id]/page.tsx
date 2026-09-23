import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { OrderStatusBadge } from "@/components/admin/badge";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { formatMoney } from "@/lib/format";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      user: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
      payments: true,
    },
  });
  if (!order) notFound();

  const address = order.shippingAddress as {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };

  return (
    <div>
      <AdminHeader title={`Order ${order.orderNumber}`} action={<OrderStatusBadge status={order.status} />} />

      <div className="grid grid-cols-1 gap-10 px-8 py-6 sm:grid-cols-3">
        <div className="sm:col-span-2 space-y-8">
          <div>
            <h2 className="mb-3 text-sm text-ink/60">Items</h2>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.productNameSnapshot} × {item.quantity}
                    <span className="ml-2 text-ink/40">{item.skuSnapshot}</span>
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
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span>
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
              <div className="flex justify-between border-t border-ink/10 pt-2 text-base text-ink">
                <span>Total</span>
                <span>{formatMoney(order.grandTotal)}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm text-ink/60">Customer &amp; shipping</h2>
            <p className="text-sm">{order.user.email}</p>
            <p className="mt-2 text-sm text-ink/70">
              {address.fullName} · {address.phone}
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.state} {address.pincode}
            </p>
            <p className="mt-2 text-sm text-ink/50">
              Payment: {order.paymentMethod} — {order.paymentStatus}
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-sm text-ink/60">History</h2>
            <div className="space-y-1">
              {order.statusHistory.map((h) => (
                <p key={h.id} className="text-xs text-ink/60">
                  {h.fromStatus} → {h.toStatus} · {h.createdAt.toLocaleString()}
                  {h.note ? ` — ${h.note}` : ""}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-sm text-ink/60">Update status</h2>
          <OrderStatusForm orderId={order.id} currentStatus={order.status} />
        </div>
      </div>
    </div>
  );
}
