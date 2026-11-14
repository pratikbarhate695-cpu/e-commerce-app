import Link from "next/link";
import { auth } from "@/lib/session";
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
    <main className="mx-auto min-h-[55vh] max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 border-b border-ink/10 pb-6">
        <span className="site-kicker">Your selection</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your cart</h1>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 px-5 py-12 text-center">
        <p className="text-sm text-ink/65">Your cart is empty.</p>
        <Link href="/shop" className="site-primary-button mt-5">Continue shopping</Link>
        </div>
      ) : (
        <>
          <div className="mt-10">
            {items.map((item) => (
              <CartLine
                key={item.id}
                 item={{
                   productId: item.productId,
                   quantity: item.quantity,
                   product: {
                    name: item.product.name,
                    sellingPrice: Number(item.product.sellingPrice),
                    stockQty: item.product.stockQty,
                    images: item.product.images.map((image) => ({
                     url: image.url,
                     altText: image.altText,
                     })),
                  },
                }}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <span className="text-sm text-ink/65">Subtotal</span>
            <span className="text-lg">{formatMoney(subtotal)}</span>
          </div>
          <p className="mt-1 text-sm text-ink/65">
            Shipping, tax, and any coupon are calculated at checkout.
          </p>

          <Link
            href="/checkout"
            className="site-primary-button mt-8 w-full"
          >
            Checkout
          </Link>
        </>
      )}
    </main>
  );
}
