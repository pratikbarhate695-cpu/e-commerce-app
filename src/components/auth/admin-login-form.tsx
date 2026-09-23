"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/actions/admin-login";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await adminLogin(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="text-sm text-slate-400">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
        />
      </label>
      <label className="block">
        <span className="text-sm text-slate-400">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
        />
      </label>
      {error && <p className="text-sm text-amber-400">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-amber-500 py-2 text-sm font-medium text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Checking…" : "Enter dashboard"}
      </button>
    </form>
  );
}
