"use client";

import { useNow } from "@/hooks/use-now";
import {
  formatAgo,
  formatAgoFriendly,
  formatClock,
  formatDateTime,
  formatDuration,
  formatEta,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { IncidentPriority, Timestamp } from "@/types";

/**
 * Time since an incident was created, e.g. 00:04:32.
 * Urgency is carried by colour and weight, never by flashing.
 */
export function ResponseTimer({
  since,
  until,
  priority,
  size = "md",
  className,
  label = "Elapsed since the incident was created",
}: {
  since: Timestamp;
  /** Freeze the timer at this moment (for resolved incidents). */
  until?: Timestamp;
  priority?: IncidentPriority;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
}) {
  const now = useNow();
  const end = until ?? now;
  const seconds = end > 0 ? Math.max(0, (end - since) / 1000) : 0;
  const urgent = !until && priority === "P1";
  const elevated = !until && priority === "P2";
  return (
    <time
      role="timer"
      aria-label={label}
      dateTime={`PT${Math.floor(seconds)}S`}
      className={cn(
        "tnum font-mono font-medium tracking-tight",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        size === "lg" && "text-2xl font-semibold",
        size === "xl" && "text-4xl font-semibold sm:text-5xl",
        urgent
          ? "text-critical-fg"
          : elevated
            ? "text-high-fg"
            : "text-foreground",
        until && "text-muted-foreground",
        className,
      )}
    >
      {formatDuration(seconds, true)}
    </time>
  );
}

/** "00:42 ago" for operational feeds, or plain language with `friendly`. */
export function RelativeTime({
  at,
  friendly,
  className,
}: {
  at: Timestamp;
  friendly?: boolean;
  className?: string;
}) {
  const now = useNow(friendly ? 30_000 : 1000);
  return (
    <time
      dateTime={new Date(at).toISOString()}
      title={formatDateTime(at)}
      className={cn("tnum whitespace-nowrap", className)}
    >
      {now === 0
        ? "—"
        : friendly
          ? formatAgoFriendly(at, now)
          : formatAgo(at, now)}
    </time>
  );
}

/** Counts down to an expected arrival, e.g. 04:32. Shows "Arriving" once the time has passed. */
export function EtaCountdown({
  at,
  className,
  arrivingLabel = "Arriving",
}: {
  at: Timestamp | undefined;
  className?: string;
  arrivingLabel?: string;
}) {
  const now = useNow();
  if (!at) return <span className={className}>—</span>;
  const done = now > 0 && now >= at;
  return (
    <time
      role="timer"
      aria-label="Estimated time of arrival"
      className={cn("tnum font-mono", className)}
    >
      {done ? arrivingLabel : formatEta(at, now)}
    </time>
  );
}

/** Wall-clock stamp, e.g. 00:42:03, as used on timelines and the audit log. */
export function ClockStamp({
  at,
  className,
}: {
  at: Timestamp;
  className?: string;
}) {
  return (
    <time
      dateTime={new Date(at).toISOString()}
      title={formatDateTime(at)}
      className={cn("tnum font-mono text-xs text-muted-foreground", className)}
    >
      {formatClock(at)}
    </time>
  );
}
