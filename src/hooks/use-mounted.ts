"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during server render and hydration, true afterwards. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** Tracks a CSS media query. Returns `false` until mounted. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Matches Tailwind's breakpoints. */
export const useIsMd = () => useMediaQuery("(min-width: 768px)");
export const useIsLg = () => useMediaQuery("(min-width: 1024px)");
export const useIsXl = () => useMediaQuery("(min-width: 1280px)");
export const useIs2xl = () => useMediaQuery("(min-width: 1440px)");
