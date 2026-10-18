import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { GoogleButton } from "@/components/auth/google-button";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <p className="text-sm text-ink/60">Welcome</p>
      <h1 className="mt-1 font-serif text-3xl">Sign in</h1>
      <p className="mt-3 text-sm text-ink/70">
        Enter your email and we&apos;ll send you a code. New here? Your account
        is created automatically.
      </p>
      <div className="mt-10">
        <Suspense>
          <GoogleButton />
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-ink/40">
            <span className="h-px flex-1 bg-ink/15" />
            or
            <span className="h-px flex-1 bg-ink/15" />
          </div>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
