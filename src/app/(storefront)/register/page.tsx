import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <p className="text-sm text-ink/60">New here</p>
      <h1 className="mt-1 font-serif text-3xl">Create an account</h1>
      <div className="mt-10">
        <RegisterForm />
      </div>
      <p className="mt-8 text-sm text-ink/70">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}
