import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side check on top of middleware: the Prisma role has the final say.
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/admin/login");

  async function signOutAction() {
    "use server";
    // scope "local": sign out this device only, not every session.
    await createClient().auth.signOut({ scope: "local" });
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-56 shrink-0 flex-col border-r border-ink/10 bg-ink/[0.02] px-4 py-8">
        <p className="px-2 text-sm text-ink/50">Admin</p>
        <ul className="mt-4 flex-1 space-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded px-2 py-1.5 text-sm text-ink/80 hover:bg-ink/[0.05]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded px-2 py-1.5 text-left text-sm text-ink/50 hover:bg-ink/[0.05]"
          >
            Sign out
          </button>
        </form>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
