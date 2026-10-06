import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TONE, type Tone } from "@/config/incident";
import { cn } from "@/lib/utils";

/**
 * One operational figure. Colour appears only when the number itself is a status
 * (pass `tone`); everything else stays neutral so a row of tiles reads calmly.
 */
export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone,
  delta,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  /** Change against the comparison period. `good` decides the colour, since down is good for response time. */
  delta?: { value: string; direction: "up" | "down"; good: boolean };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card",
        className,
      )}
    >
      {tone && tone !== "neutral" && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-3 left-0 w-0.5 rounded-r",
            TONE[tone].dot,
          )}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-tight text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon aria-hidden className="size-4 shrink-0 text-subtle" />}
      </div>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "tnum text-[28px] leading-none font-semibold tracking-tight",
            tone && tone !== "neutral" && TONE[tone].text,
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </p>
      {(hint || delta) && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                delta.good ? "text-resolved-fg" : "text-critical-fg",
              )}
            >
              {delta.direction === "up" ? (
                <ArrowUpRight aria-hidden className="size-3.5" />
              ) : (
                <ArrowDownRight aria-hidden className="size-3.5" />
              )}
              {delta.value}
            </span>
          )}
          {hint && <span className="truncate">{hint}</span>}
        </p>
      )}
    </div>
  );
}
