import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function AccountPage() {
  const session = await auth();

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
    </main>
  );
}
