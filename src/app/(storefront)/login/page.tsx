import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { GoogleButton } from "@/components/auth/google-button";
import { EmailLoginToggle } from "@/components/auth/email-login-toggle";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-ink/10 bg-surface p-6 shadow-xl shadow-blue-950/5 sm:p-8">
      <p className="text-sm font-semibold text-accent">Welcome</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">
        Continue with Google, or use email and we&apos;ll send you a code. New
        here? Your account is created automatically.
      </p>
      <div className="mt-10">
        <Suspense>
          <GoogleButton />
          <EmailLoginToggle>
            <LoginForm />
          </EmailLoginToggle>
        </Suspense>
      </div>
      </div>
    </main>
  );
}
