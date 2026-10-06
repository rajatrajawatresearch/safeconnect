"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type SyntheticEvent,
} from "react";

/**
 * Press-and-hold confirmation. The action fires only after the control has been held for the full
 * duration, so an SOS cannot be raised by a stray tap. Works with touch, mouse, and the keyboard
 * (hold Space or Enter).
 *
 * Spread `handlers` on a `<button>`. Offer a non-timed alternative next to it (for example a
 * two-step confirm) for anyone who cannot sustain a press.
 */
export function useHoldToConfirm({
  durationMs = 3000,
  onConfirm,
  disabled,
}: {
  durationMs?: number;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const frame = useRef<number | null>(null);
  const startedAt = useRef(0);
  const confirm = useRef(onConfirm);

  useEffect(() => {
    confirm.current = onConfirm;
  });

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setHolding(false);
    setProgress(0);
  }, []);

  const start = useCallback(() => {
    if (disabled || frame.current !== null) return;
    startedAt.current = performance.now();
    setHolding(true);
    const step = (time: number) => {
      const value = Math.min(1, (time - startedAt.current) / durationMs);
      setProgress(value);
      if (value >= 1) {
        frame.current = null;
        setHolding(false);
        setProgress(0);
        if (typeof navigator !== "undefined" && "vibrate" in navigator)
          navigator.vibrate?.([60, 40, 120]);
        confirm.current();
        return;
      }
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [disabled, durationMs]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      start();
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onBlur: stop,
    onContextMenu: (e: SyntheticEvent) => e.preventDefault(),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        start();
      }
    },
    onKeyUp: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === " " || e.key === "Enter") stop();
    },
  };

  return {
    /** 0 → 1 while held. */
    progress,
    holding,
    /** Whole seconds remaining: 3, 2, 1. */
    secondsLeft: Math.max(1, Math.ceil(((1 - progress) * durationMs) / 1000)),
    handlers,
  };
}
