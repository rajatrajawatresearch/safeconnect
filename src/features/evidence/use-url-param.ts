"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * One query-string value used as state, for example `?id=EV-2026-004521`.
 *
 * Writes go through the History API, which the App Router keeps in step with `useSearchParams`,
 * so selecting a row costs no server round trip and the address stays shareable.
 */
export function useUrlParam(
  name: string,
): [string | null, (value: string | null) => void] {
  const pathname = usePathname();
  const params = useSearchParams();
  const value = params.get(name);

  const setValue = useCallback(
    (next: string | null) => {
      const query = new URLSearchParams(window.location.search);
      if (next) query.set(name, next);
      else query.delete(name);
      const qs = query.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `${pathname}?${qs}` : pathname,
      );
    },
    [name, pathname],
  );

  return [value, setValue];
}
