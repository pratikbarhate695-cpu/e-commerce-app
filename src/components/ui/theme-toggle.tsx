
"use client";

import { useEffect, useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "zero-integration-theme";
const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";
const THEME_CHANGE_EVENT = "zero-integration-theme-change";

function getSnapshot() {
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);

  return (
    saved === "dark" ||
    (saved !== "light" &&
      window.matchMedia(DARK_MODE_QUERY).matches)
  );
}

function getServerSnapshot() {
  return false;
}

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia(DARK_MODE_QUERY);

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  media.addEventListener("change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    media.removeEventListener("change", onStoreChange);
  };
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function toggle() {
    const next = !dark;

    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      next ? "dark" : "light"
    );

    document.documentElement.classList.toggle("dark", next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-ink/15 bg-paper px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent/50 hover:bg-accent/5"
    >
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
      <span className="ml-1.5">{dark ? "Light" : "Dark"}</span>
    </button>
  );
}