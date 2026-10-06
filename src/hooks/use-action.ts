"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ServiceError } from "@/services/contracts";

interface ActionOptions<R> {
  /** Toast shown when the call succeeds. Use the same verb as the button ("Unit assigned"). */
  success?: string | ((result: R) => string);
  /** Fallback message when the failure is not a known service error. */
  error?: string;
  onSuccess?: (result: R) => void;
}

/**
 * Wraps a service command with a pending flag and consistent failure handling.
 *
 *   const assign = useAction(services.dispatch.assignUnit, { success: "Unit assigned" });
 *   <Button disabled={assign.pending} onClick={() => assign.run(incident.id, unit.id, actor)} />
 *
 * `run` resolves to the result, or `undefined` if the call failed (the error toast is already shown).
 */
export function useAction<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  options: ActionOptions<R> = {},
) {
  const [pending, setPending] = useState(false);
  const latest = useRef({ fn, options });
  useEffect(() => {
    latest.current = { fn, options };
  });

  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    const { fn: call, options: opts } = latest.current;
    setPending(true);
    try {
      const result = await call(...args);
      if (opts.success)
        toast.success(
          typeof opts.success === "function"
            ? opts.success(result)
            : opts.success,
        );
      opts.onSuccess?.(result);
      return result;
    } catch (error) {
      toast.error(
        error instanceof ServiceError
          ? error.message
          : (opts.error ?? "That did not go through. Try again."),
      );
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending };
}
