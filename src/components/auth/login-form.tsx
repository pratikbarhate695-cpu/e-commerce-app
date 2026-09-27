"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const RESEND_SECONDS = 60;

// Only same-site paths. Blocks "https://evil.com" and "//evil.com".
function safeDestination(from: string | null): string {
  if (from && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/\\")) {
    return from;
  }
  return "/account";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Sends the email with the code. Signing in also creates the account
  // the first time, so there is no separate "register" step.
  async function sendCode(address: string): Promise<boolean> {
    setError(null);
    setBusy(true);
    try {
      const { error: sendError } = await createClient().auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: true },
      });
      if (sendError) {
        console.error("sendCode failed:", sendError.code ?? sendError.message);
        setError(
          sendError.status === 429 || sendError.code === "over_email_send_rate_limit"
            ? "Too many requests. Please wait a minute and try again."
            : "We couldn't send a code right now. Please try again in a moment."
        );
        return false;
      }
      setCooldown(RESEND_SECONDS);
      return true;
    } catch (err) {
      console.error("sendCode failed:", err);
      setError("We couldn't send a code right now. Please try again in a moment.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    setEmail(address);
    if (await sendCode(address)) {
      setCode("");
      setStep("code");
    }
  }

  async function onCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(token)) {
      setError("Enter the code from the email (numbers only).");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const { error: verifyError } = await createClient().auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (verifyError) {
        console.error("verifyOtp failed:", verifyError.code ?? verifyError.message);
        setError("That code is incorrect or has expired. Check it, or ask for a new one.");
        return;
      }
      router.push(safeDestination(params.get("from")));
      router.refresh();
    } catch (err) {
      console.error("verifyOtp failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={onEmailSubmit} className="space-y-6">
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Sending code…" : "Email me a code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onCodeSubmit} className="space-y-6">
      <p className="text-sm text-ink/70">
        We sent a code to <span className="text-ink">{email}</span>. Enter it below.
      </p>
      <Field
        label="Code"
        name="code"
        type="text"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={12}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Checking…" : "Sign in"}
      </Button>
      <div className="flex justify-between text-sm text-ink/70">
        <button
          type="button"
          disabled={busy || cooldown > 0}
          onClick={() => sendCode(email)}
          className="underline underline-offset-4 disabled:no-underline disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
          className="underline underline-offset-4"
        >
          Use a different email
        </button>
      </div>
    </form>
  );
}
