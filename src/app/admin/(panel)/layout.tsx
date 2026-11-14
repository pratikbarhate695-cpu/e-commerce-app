import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/questions", label: "Q&A" },
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
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <nav aria-label="Admin navigation" className="flex w-full shrink-0 flex-col border-b border-ink/10 bg-ink/[0.025] px-3 py-3 lg:w-60 lg:border-b-0 lg:border-r lg:px-4 lg:py-8">
        <p className="px-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/65">{SITE.name} · Admin</p>
        <ul className="mt-3 flex gap-1 overflow-x-auto pb-1 lg:mt-5 lg:flex-1 lg:flex-col lg:overflow-visible">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-ink/75 transition hover:bg-accent/10 hover:text-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <form action={signOutAction}>
          <button
            type="submit"
            className="mt-2 w-full shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink/65 transition hover:bg-ink/[0.05]"
          >
            Sign out
          </button>
        </form>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
