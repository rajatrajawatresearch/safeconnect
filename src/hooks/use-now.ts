"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared one-second clock for every timer on screen.
 * Rendering must never call `Date.now()` directly — read the time from here so components stay pure
 * and all timers tick together.
 */
let current = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const snapshots = new Map<number, () => number>();
function snapshotFor(stepMs: number) {
  let fn = snapshots.get(stepMs);
  if (!fn) {
    fn = () => Math.floor(current / stepMs) * stepMs;
    snapshots.set(stepMs, fn);
  }
  return fn;
}

const serverSnapshot = () => 0;

/**
 * Current time in epoch ms, updating every `stepMs`.
 * Use the default for second-by-second timers and a larger step (for example 30_000) for
 * "4 min ago" labels so they do not re-render every second.
 */
export function useNow(stepMs = 1000): number {
  return useSyncExternalStore(subscribe, snapshotFor(stepMs), serverSnapshot);
}
