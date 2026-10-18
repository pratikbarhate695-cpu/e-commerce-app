"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("zero-integration-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    const initialDark = saved ? saved === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", initialDark);
    setDark(initialDark);
    setReady(true);
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("zero-integration-theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button type="button" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded border border-ink/20 px-2.5 py-1.5 text-xs transition-colors hover:bg-ink/5">
      {ready ? (dark ? "☀ Light" : "☾ Dark") : "Theme"}
    </button>
  );
}
