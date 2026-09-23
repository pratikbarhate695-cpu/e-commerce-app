import Link from "next/link";
import { auth } from "@/lib/auth";

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
            Store
          </Link>
          <nav className="flex items-center gap-6 text-sm text-ink/70">
            <Link href="/shop">Shop</Link>
            <Link href="/search">Search</Link>
            <Link href="/cart">Cart</Link>
            {session?.user ? (
              <Link href="/account">Account</Link>
            ) : (
              <Link href="/login">Sign in</Link>
            )}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
