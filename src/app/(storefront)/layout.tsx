import Link from "next/link";
import { auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCategoryTreeSafe } from "@/lib/category-data";
import { visibleTree } from "@/lib/category-tree";
import { SITE } from "@/lib/site";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Brand } from "@/components/storefront/brand";
import { CartIcon, SearchIcon, UserIcon } from "@/components/storefront/icons";

const NAV_CATEGORY_LIMIT = 8;
const FOOTER_CATEGORY_LIMIT = 6;
const FOOTER_CHILD_LIMIT = 3;

/** Total quantity in the signed-in customer's cart (read-only; guests have no cart). */
async function getCartCount(userId: string | undefined) {
  if (!userId) return 0;
  try {
    const sum = await prisma.cartItem.aggregate({
      where: { cart: { userId } },
      _sum: { quantity: true },
    });
    return sum._sum.quantity ?? 0;
  } catch {
    return 0;
  }
}

const iconLink =
  "inline-flex min-h-11 items-center gap-2 rounded-full px-2 sm:px-3 text-sm font-semibold text-ink/75 transition hover:bg-accent/10 hover:text-accent";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const [tree, cartCount] = await Promise.all([
    getCategoryTreeSafe(),
    getCartCount(session?.user?.id),
  ]);
  // Top-level categories that lead to at least one active product, counting
  // products in subcategories. Parents whose products live only in children stay visible.
  const visibleCategories = visibleTree(tree);
  const navCategories = visibleCategories.slice(0, NAV_CATEGORY_LIMIT);
  const footerCategories = visibleCategories.slice(0, FOOTER_CATEGORY_LIMIT);

  return (
    <div className="min-h-screen">
      <div className="site-announcement px-4 py-2 text-center text-xs font-medium leading-5 tracking-wide">
        <span className="text-blue-300">●</span> &nbsp;A considered collection of electronics, made easy to explore
      </div>

      <header className="site-header z-40 border-b border-ink/10 md:sticky md:top-0">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3 sm:gap-x-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label={`${SITE.name} home`} className="flex min-w-0 shrink-0 items-center">
            <Brand />
          </Link>

          <form
            action="/search"
            role="search"
            className="order-last flex w-full md:order-none md:max-w-xl md:flex-1"
          >
            <label htmlFor="site-search" className="sr-only">
              Search products
            </label>
            <input
              id="site-search"
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Search products or brands"
              className="h-11 min-w-0 flex-1 rounded-l-full border border-r-0 border-ink/50 bg-surface pl-5 pr-3 text-sm text-ink placeholder:text-ink/65"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex h-11 w-12 shrink-0 items-center justify-center rounded-r-full bg-accent text-on-accent transition hover:shadow-lg hover:shadow-accent/30"
            >
              <SearchIcon />
            </button>
          </form>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <Link href={session?.user ? "/account" : "/login"} className={iconLink}>
              <UserIcon />
              <span className="hidden sm:inline">{session?.user ? "Account" : "Sign in"}</span>
              <span className="sr-only sm:hidden">{session?.user ? "Account" : "Sign in"}</span>
            </Link>
            <ThemeToggle />
            <Link
              href="/cart"
              aria-label={cartCount > 0 ? `My cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}` : "My cart"}
              className={`${iconLink} relative`}
            >
              <CartIcon />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent"
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <nav aria-label="Main navigation" className="border-t border-ink/10">
          <ul className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 text-sm font-semibold text-ink/75 sm:px-6 lg:px-8">
            <li><Link href="/" className="site-nav-link whitespace-nowrap">Home</Link></li>
            <li><Link href="/shop" className="site-nav-link whitespace-nowrap">Shop</Link></li>
            {navCategories.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="site-nav-link whitespace-nowrap">{c.name}</Link>
              </li>
            ))}
            {visibleCategories.length > NAV_CATEGORY_LIMIT && (
              <li><Link href="/shop#categories" className="site-nav-link whitespace-nowrap">All categories</Link></li>
            )}
          </ul>
        </nav>
      </header>

      {children}

      <footer className="mt-20 bg-[#0a1322] text-slate-300">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
            <div>
              <Link href="/" aria-label={`${SITE.name} home`} className="inline-flex items-center">
                <Brand />
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-6 text-slate-300">
                A simpler way to discover technology and everyday essentials. Browse product details and shop at your own pace.
              </p>
            </div>

            <nav aria-label="Quick links">
              <p className="text-sm font-semibold text-white">Quick links</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li><Link className="transition hover:text-blue-300" href="/">Home</Link></li>
                <li><Link className="transition hover:text-blue-300" href="/shop">Shop</Link></li>
                <li><Link className="transition hover:text-blue-300" href="/search">Search</Link></li>
                <li><Link className="transition hover:text-blue-300" href="/account/orders">My orders</Link></li>
              </ul>
            </nav>

            {footerCategories.length > 0 && (
              <nav aria-label="Categories">
                <p className="text-sm font-semibold text-white">Categories</p>
                <ul className="mt-4 space-y-3 text-sm">
                  {footerCategories.map((c) => (
                    <li key={c.id}>
                      <Link className="transition hover:text-blue-300" href={`/category/${c.slug}`}>{c.name}</Link>
                      {c.children.length > 0 && (
                        <ul className="mt-2 space-y-2 border-l border-white/15 pl-3 text-slate-300">
                          {c.children.slice(0, FOOTER_CHILD_LIMIT).map((child) => (
                            <li key={child.id}>
                              <Link className="transition hover:text-blue-300" href={`/category/${child.slug}`}>{child.name}</Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                  {visibleCategories.length > FOOTER_CATEGORY_LIMIT && (
                    <li><Link className="font-semibold text-white transition hover:text-blue-300" href="/shop#categories">All categories</Link></li>
                  )}
                </ul>
              </nav>
            )}

            <nav aria-label="Customer service">
              <p className="text-sm font-semibold text-white">Customer service</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li><Link className="transition hover:text-blue-300" href="/contact">Contact us</Link></li>
                <li><Link className="transition hover:text-blue-300" href="/shipping-policy">Shipping policy</Link></li>
                <li><Link className="transition hover:text-blue-300" href="/refund-policy">Refund &amp; returns</Link></li>
                <li><Link className="transition hover:text-blue-300" href="/terms">Terms &amp; conditions</Link></li>
                <li><Link className="transition hover:text-blue-300" href="/privacy">Privacy policy</Link></li>
              </ul>
            </nav>

            <div>
              <p className="text-sm font-semibold text-white">Contact us</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li><a className="transition hover:text-blue-300" href={`tel:${SITE.phone}`}>{SITE.phone}</a></li>
                <li><a className="break-all transition hover:text-blue-300" href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
                <li>{SITE.address}</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-xs leading-6 text-slate-400">
            <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
