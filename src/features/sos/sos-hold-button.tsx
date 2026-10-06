"use client";

import { LoaderCircle } from "lucide-react";
import { useId } from "react";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import { useHoldToConfirm } from "./use-hold-to-confirm";

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SIZE = {
  /** Home card. */
  lg: {
    frame: "size-44 sm:size-48",
    word: "text-4xl",
    count: "text-7xl",
    label: "text-[13px]",
  },
  /** The emergency screen, where it is the only thing that matters. */
  xl: {
    frame: "size-52 sm:size-60",
    word: "text-5xl",
    count: "text-8xl",
    label: "text-sm",
  },
} as const;

/**
 * The SOS control. It fires only after a full three-second hold, shows the 3-2-1 countdown and a
 * ring that fills as the hold continues, and resets the moment it is released.
 *
 * Always render a non-timed alternative next to it for people who cannot sustain a press.
 */
export function SosHoldButton({
  onConfirm,
  busy,
  disabled,
  size = "lg",
  className,
}: {
  onConfirm: () => void;
  /** The SOS has been confirmed and is being sent. */
  busy?: boolean;
  disabled?: boolean;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const t = useT();
  const hintId = useId();
  const hold = useHoldToConfirm({
    durationMs: 3000,
    onConfirm,
    disabled: disabled || busy,
  });
  const s = SIZE[size];

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className={cn("relative grid shrink-0 place-items-center", s.frame)}>
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full -rotate-90"
        >
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="4"
            className="stroke-critical/15"
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - (busy ? 1 : hold.progress))}
            className="stroke-critical"
          />
        </svg>
        <button
          type="button"
          {...hold.handlers}
          disabled={disabled || busy}
          aria-label={`${t("citizen.sos.hold")}. ${t("citizen.sos.holdHint")}`}
          aria-describedby={hintId}
          className={cn(
            "relative grid size-[82%] touch-none place-items-center rounded-full bg-critical text-critical-on shadow-raised outline-offset-[10px] transition-transform duration-150 select-none [-webkit-touch-callout:none] hover:bg-critical/95 disabled:cursor-default",
            hold.holding && "scale-[0.96]",
            disabled && !busy && "opacity-60",
          )}
        >
          {busy ? (
            <LoaderCircle aria-hidden className="size-12 animate-spin" />
          ) : hold.holding ? (
            <span
              aria-hidden
              className={cn("tnum leading-none font-semibold", s.count)}
            >
              {hold.secondsLeft}
            </span>
          ) : (
            <span aria-hidden className="flex flex-col items-center px-3">
              <span
                className={cn(
                  "leading-none font-semibold tracking-tight",
                  s.word,
                )}
              >
                SOS
              </span>
              <span
                className={cn(
                  "mt-2 max-w-[9.5rem] text-center leading-tight font-medium text-balance opacity-90",
                  s.label,
                )}
              >
                {t("citizen.sos.hold")}
              </span>
            </span>
          )}
        </button>
      </div>

      <p
        id={hintId}
        className={cn(
          "mt-4 min-h-6 text-center text-base font-medium",
          hold.holding || busy ? "text-critical-fg" : "text-muted-foreground",
        )}
      >
        {busy
          ? t("citizen.sos.activated")
          : hold.holding
            ? `${t("citizen.sos.keepHolding")} · ${t("citizen.sos.release")}`
            : t("citizen.sos.holdHint")}
      </p>
      {/* Screen readers hear the countdown and the result without the visual ring. */}
      <p className="sr-only" role="status" aria-live="assertive">
        {busy
          ? t("citizen.sos.activated")
          : hold.holding
            ? String(hold.secondsLeft)
            : ""}
      </p>
    </div>
  );
}
