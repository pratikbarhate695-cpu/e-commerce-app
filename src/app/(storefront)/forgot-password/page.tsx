import { redirect } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/actions/password-reset";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  async function action(formData: FormData) {
    "use server";
    await requestPasswordReset(formData);
    redirect("/forgot-password?sent=1");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <p className="text-sm text-ink/60">Account recovery</p>
      <h1 className="mt-1 font-serif text-3xl">Reset your password</h1>

      {sent ? (
        <p className="mt-10 text-sm text-ink/80">
          If that email is registered, a reset link is on its way. It expires
          in an hour.
        </p>
      ) : (
        <form action={action} className="mt-10 space-y-6">
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Button type="submit">Send reset link</Button>
        </form>
      )}
    </main>
  );
}
