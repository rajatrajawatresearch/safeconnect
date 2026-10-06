"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/states";

/**
 * Shown by each area's `error.tsx` when a screen throws while rendering.
 * The surrounding shell stays in place, so navigation and the role switcher keep working.
 */
export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-card">
        <ErrorState
          title="This screen could not be shown."
          description="Something went wrong while drawing it. Your data is unaffected. Try again, or use Reset demo from the strip at the top if it keeps happening."
          onRetry={reset}
        />
      </div>
    </div>
  );
}
