import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <p className="text-sm text-ink/60">Welcome back</p>
      <h1 className="mt-1 font-serif text-3xl">Sign in</h1>
      <div className="mt-10">
        <LoginForm />
      </div>
      <div className="mt-8 flex justify-between text-sm text-ink/70">
        <Link href="/register" className="underline underline-offset-4">
          Create an account
        </Link>
        <Link href="/forgot-password" className="underline underline-offset-4">
          Forgot password?
        </Link>
      </div>
    </main>
  );
}
