import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCart } from "@/lib/actions/cart";
import { getStoreSettings } from "@/lib/catalog";
import { computeCartTotals } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { CheckoutForm } from "@/components/storefront/checkout-form";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?from=/checkout");

  const cart = await getCart(session.user.id);
  if (!cart || cart.items.length === 0) redirect("/cart");

  const settings = await getStoreSettings();

  let totals;
  try {
    totals = computeCartTotals(
      cart.items.map((i) => ({ product: i.product, quantity: i.quantity })),
      settings,
      null
    );
  } catch {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <p className="text-sm text-ink/70">
          Something in your cart is no longer available.{" "}
          <Link href="/cart" className="underline underline-offset-4">
            Review your cart
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-4xl grid-cols-1 gap-12 px-6 py-16 sm:grid-cols-2">
      <div>
        <h1 className="font-serif text-3xl">Checkout</h1>
        <div className="mt-8">
          <CheckoutForm />
        </div>
      </div>

      <div className="border-t border-ink/10 pt-6 sm:border-l sm:border-t-0 sm:pl-10 sm:pt-0">
        <h2 className="text-sm text-ink/60">Order summary</h2>
        <div className="mt-4 space-y-2">
          {totals.lines.map((line) => (
            <div key={line.productId} className="flex justify-between text-sm">
              <span className="text-ink/80">
                {line.name} × {line.quantity}
              </span>
              <span>{formatMoney(line.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-ink/10 pt-4 text-sm">
          <div className="flex justify-between text-ink/60">
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink/60">
            <span>Shipping</span>
            <span>{formatMoney(totals.shippingFee)}</span>
          </div>
          <div className="flex justify-between text-ink/60">
            <span>Tax</span>
            <span>{formatMoney(totals.taxTotal)}</span>
          </div>
        </div>
        <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 text-base">
          <span>Total</span>
          <span>{formatMoney(totals.grandTotal)}</span>
        </div>
        <p className="mt-3 text-xs text-ink/40">
          A coupon applied at checkout will be recalculated on the server —
          this preview doesn&apos;t include one yet.
        </p>
      </div>
    </main>
  );
}
