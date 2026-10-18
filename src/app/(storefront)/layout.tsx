import Link from "next/link";
import { auth } from "@/lib/session";
import { SITE } from "@/lib/site";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Brand } from "@/components/storefront/brand";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div>
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-lg">
            <Brand />
          </Link>
          <nav className="flex items-center gap-6 text-sm text-ink/70">
            <Link href="/shop">Shop</Link>
            <Link href="/search">Search</Link>
            <Link href="/cart">Cart</Link>
            <ThemeToggle />
            {session?.user ? (
              <Link href="/account">Account</Link>
            ) : (
              <Link href="/login">Sign in</Link>
            )}
          </nav>
        </div>
      </header>
      {children}
      <footer className="mt-20 border-t border-ink/10">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink/70">
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/contact">Contact</Link>
            <Link href="/shipping-policy">Shipping</Link>
            <Link href="/refund-policy">Refund &amp; Returns</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
          <p className="mt-4 text-ink/50">
            &copy; {new Date().getFullYear()} {SITE.name}. {SITE.address}. {SITE.email} | {SITE.phone}
          </p>
        </div>
      </footer>
    </div>
  );
}
