"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Keeps the email login form tucked away behind a "Try email login" button, so Google
 * is the primary option. It only shows or hides its children: the form inside is
 * unchanged and always stays mounted, so its behaviour is exactly as before.
 * If the page was opened with a login error (?error=...), it starts open so the
 * form can show that message.
 */
export function EmailLoginToggle({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("error") !== null);

  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="email-login-panel"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center justify-center rounded-full border border-ink/20 px-5 text-sm font-semibold transition hover:bg-ink/[0.05]"
      >
        {open ? "Hide email login" : "Try email login"}
      </button>
      <div id="email-login-panel" hidden={!open} className="mt-6">
        {children}
      </div>
    </div>
  );
}
