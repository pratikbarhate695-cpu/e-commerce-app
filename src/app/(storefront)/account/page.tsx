import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const session = await auth();

  async function signOutAction() {
    "use server";
    // scope "local": sign out this device only, not every session.
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Your account</h1>
      <p className="mt-3 text-ink/70">Signed in as {session?.user?.email}.</p>
      <Link
        href="/account/orders"
        className="site-primary-button mt-6"
      >
        View your orders
      </Link>
      <form action={signOutAction} className="mt-10">
        <button
          type="submit"
          className="site-secondary-button"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
