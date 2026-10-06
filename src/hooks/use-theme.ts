"use client";

import { useSyncExternalStore } from "react";

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "sanket-theme";

/**
 * Runs before first paint (inlined in the root layout) so the page never flashes the wrong theme.
 * Keep it in sync with `apply` below.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light'}catch(e){}})()`;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function apply(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this page view.
  }
  apply(choice);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readChoice() === "system") {
      apply("system");
      listener();
    }
  };
  mql.addEventListener("change", onSystemChange);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    mql.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", listener);
  };
}

const isDark = () => document.documentElement.classList.contains("dark");

/** Light, dark or follow-the-system, persisted in this browser. */
export function useTheme() {
  const theme = useSyncExternalStore<ThemeChoice>(
    subscribe,
    readChoice,
    () => "system",
  );
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return {
    theme,
    resolvedTheme: dark ? ("dark" as const) : ("light" as const),
    setTheme,
  };
}
