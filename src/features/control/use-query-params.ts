"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * Read and patch the URL query without a navigation.
 *
 * `history.replaceState` is picked up by the App Router, so `useSearchParams()` stays in step and
 * the address bar always describes what is on screen — a selected incident or unit can be shared
 * as a link, and arriving on such a link opens the same view.
 */
export function useQueryParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const patch = useCallback(
    (changes: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "")
          params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [pathname],
  );

  return { params: searchParams, patch };
}

/**
 * The latest non-null value. A drawer keeps showing what it was showing while it animates shut,
 * instead of flashing its empty state the moment the selection is cleared.
 */
export function useLastValue<T>(value: T | null): T | null {
  const [last, setLast] = useState(value);
  if (value !== null && value !== last) setLast(value);
  return value ?? last;
}
