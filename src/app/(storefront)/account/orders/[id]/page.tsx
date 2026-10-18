import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { addressSchema } from "@/lib/validation/checkout";
import {
  buildTimeline,
  getDeliverySummary,
  isAwaitingShipment,
  paymentMethodLabel,
  safeHttpUrl,
} from "@/lib/order-status";
import { PayNowButton } from "@/components/storefront/pay-now-button";
import { expireUnpaidOrders } from "@/lib/payments";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { PaymentBadge, StatusBadge } from "@/components/orders/status-badge";

// Always read fresh data so a status change shows up on the next refresh.
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string; perr?: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const { placed, perr } = await searchParams;
  if (!session?.user) notFound();
  await expireUnpaidOrders(session.user.id);

  // Ownership check is part of the query: another customer's order id
  // simply returns nothing, which renders the same 404 as a missing order.
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
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
  if (!order) notFound();

  const steps = buildTimeline({
    status: order.status,
    history: order.statusHistory,
    placedAt: order.createdAt,
  });
  const deliverySummary = getDeliverySummary({
    status: order.status,
    estimatedDelivery: order.estimatedDelivery,
    history: order.statusHistory,
  });

  const needsPayment =
    order.paymentMethod.toUpperCase() === "RAZORPAY" &&
    order.status === "PENDING" &&
    (order.paymentStatus === "PENDING" || order.paymentStatus === "FAILED");

  const address = addressSchema.safeParse(order.shippingAddress);
  const trackingUrl = safeHttpUrl(order.trackingUrl);

  const hasShipmentInfo = Boolean(
    order.courierName || order.trackingNumber || trackingUrl || order.estimatedDelivery
  );
  // Before the order ships, tell the customer where tracking info will appear.
  const showDeliverySection = hasShipmentInfo || isAwaitingShipment(order.status);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
      <Link
        href="/account/orders"
        className="text-sm text-ink/60 underline underline-offset-4 hover:text-ink"
      >
        Back to my orders
      </Link>

      {needsPayment && (
        <div className="mt-6 border border-ink/15 px-4 py-4">
          <p className="text-sm text-ink/80">
            Payment is pending. Complete it within 30 minutes, or this order is
            cancelled automatically. We ship only after payment is confirmed.
          </p>
          {perr && (
            <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
              {perr}
            </p>
          )}
          <div className="mt-4">
            <PayNowButton orderId={order.id} />
          </div>
        </div>
      )}
      {placed && !needsPayment && order.paymentStatus === "PAID" && (
        <p className="mt-6 border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          Payment received. Your order is confirmed.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink/50">Order {order.orderNumber}</p>
          <h1 className="mt-1 font-serif text-3xl">
            {placed && order.paymentStatus === "PAID" ? "Thank you" : "Order details"}
          </h1>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-sm text-ink/60">
        Placed on {formatDateTime(order.createdAt, { year: true })}
      </p>
      {deliverySummary && <p className="mt-1 text-sm text-ink">{deliverySummary}</p>}

      <section className="mt-10" aria-labelledby="tracking-heading">
        <h2 id="tracking-heading" className="text-sm text-ink/60">
          Order tracking
        </h2>
        <div className="mt-5">
          <OrderTimeline steps={steps} />
        </div>
      </section>

      {showDeliverySection && (
        <section className="mt-10 border-t border-ink/10 pt-6">
          <h2 className="text-sm text-ink/60">Delivery</h2>
          {hasShipmentInfo ? (
            <>
              <dl className="mt-4 space-y-2 text-sm">
                {order.courierName && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/60">Courier</dt>
                    <dd className="text-right">{order.courierName}</dd>
                  </div>
                )}
                {order.trackingNumber && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/60">Tracking ID</dt>
                    <dd className="break-all text-right">{order.trackingNumber}</dd>
                  </div>
                )}
                {order.estimatedDelivery && order.status !== "DELIVERED" && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/60">Expected delivery</dt>
                    <dd className="text-right">{formatDate(order.estimatedDelivery)}</dd>
                  </div>
                )}
              </dl>
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-block border border-accent px-4 py-2 text-sm text-accent transition-colors hover:bg-accent/10"
                >
                  Track package
                </a>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-ink/60">
              Courier and tracking details will appear here once your order ships.
            </p>
          )}
        </section>
      )}

      <section className="mt-10 border-t border-ink/10 pt-6">
        <h2 className="text-sm text-ink/60">Items</h2>
        <div className="mt-4 divide-y divide-ink/10">
          {order.items.map((item) => {
            const image = item.product.images[0];
            return (
              <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0">
                <div className="h-20 w-16 shrink-0 overflow-hidden bg-ink/[0.04]">
                  {image && (
                    <Image
                      src={image.url}
                      alt={image.altText ?? item.productNameSnapshot}
                      width={80}
                      height={100}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{item.productNameSnapshot}</p>
                  <p className="mt-1 text-sm text-ink/50">
                    Qty {item.quantity} × {formatMoney(item.unitPriceAtPurchase)}
                  </p>
                </div>
                <p className="text-sm">{formatMoney(item.lineTotal)}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-2 space-y-1 border-t border-ink/10 pt-4 text-sm">
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
      </section>

      <section className="mt-10 border-t border-ink/10 pt-6">
        <h2 className="text-sm text-ink/60">Payment</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span>{paymentMethodLabel(order.paymentMethod)}</span>
          <PaymentBadge status={order.paymentStatus} method={order.paymentMethod} />
        </div>
      </section>

      {address.success && (
        <section className="mt-10 border-t border-ink/10 pt-6">
          <h2 className="text-sm text-ink/60">Delivering to</h2>
          <address className="mt-3 text-sm not-italic leading-relaxed text-ink/80">
            {address.data.fullName}
            <br />
            {address.data.line1}
            {address.data.line2 && (
              <>
                <br />
                {address.data.line2}
              </>
            )}
            <br />
            {address.data.city}, {address.data.state} {address.data.pincode}
            <br />
            {address.data.phone}
          </address>
        </section>
      )}
    </main>
  );
}
