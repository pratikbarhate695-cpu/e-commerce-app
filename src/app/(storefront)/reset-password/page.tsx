import { redirect } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/actions/password-reset";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
        <p className="text-sm text-ink/80">This reset link is missing its token.</p>
      </main>
    );
  }

  async function action(formData: FormData) {
    "use server";
    const result = await resetPassword(formData);
    if (!result.ok) {
      redirect(
        `/reset-password?token=${formData.get("token")}&error=${encodeURIComponent(result.error)}`
      );
    }
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <p className="text-sm text-ink/60">Account recovery</p>
      <h1 className="mt-1 font-serif text-3xl">Choose a new password</h1>
      <form action={action} className="mt-10 space-y-6">
        <input type="hidden" name="token" value={token} />
        <Field
          label="New password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit">Set new password</Button>
      </form>
    </main>
  );
}
