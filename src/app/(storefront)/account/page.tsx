import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const session = await auth();

  async function signOutAction() {
    "use server";
    // scope "local": sign out this device only, not every session.
    await createClient().auth.signOut({ scope: "local" });
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-serif text-3xl">Your account</h1>
      <p className="mt-3 text-ink/70">Signed in as {session?.user?.email}.</p>
      <Link
        href="/account/orders"
        className="mt-6 inline-block text-sm underline underline-offset-4"
      >
        View your orders
      </Link>
      <form action={signOutAction} className="mt-10">
        <button
          type="submit"
          className="text-sm text-ink/60 underline underline-offset-4"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
