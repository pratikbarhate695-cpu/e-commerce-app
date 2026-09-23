import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCart } from "@/lib/actions/cart";
import { CartLine } from "@/components/storefront/cart-line";
import { formatMoney } from "@/lib/format";

export default async function CartPage() {
  const session = await auth();
  const cart = session?.user ? await getCart(session.user.id) : null;
  const items = cart?.items ?? [];

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.product.sellingPrice) * item.quantity,
    0
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-serif text-3xl">Your cart</h1>

      {items.length === 0 ? (
        <p className="mt-10 text-sm text-ink/60">
          Your cart is empty.{" "}
          <Link href="/shop" className="underline underline-offset-4">
            Continue shopping
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mt-10">
            {items.map((item) => (
              <CartLine key={item.id} item={item} />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <span className="text-sm text-ink/60">Subtotal</span>
            <span className="text-lg">{formatMoney(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-ink/40">
            Shipping, tax, and any coupon are calculated at checkout.
          </p>

          <Link
            href="/checkout"
            className="mt-8 block w-full bg-ink py-3 text-center text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Checkout
          </Link>
        </>
      )}
    </main>
  );
}
