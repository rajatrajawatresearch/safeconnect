"use client";

import { MapPin, Truck } from "lucide-react";
import { PRIORITY_META, STATUS_META, TONE } from "@/config/incident";
import { useUnits } from "@/hooks/use-demo-data";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types";
import { CategoryIcon } from "./category-icon";
import { PriorityBadge, StatusChip } from "./status-chips";
import { RelativeTime, ResponseTimer } from "./timers";

/**
 * One incident in a queue or feed. Renders as a button when `onSelect` is given.
 * The left edge carries the priority colour so a long list can be scanned by urgency.
 */
export function IncidentRow({
  incident,
  onSelect,
  selected,
  compact,
  showTimer,
  className,
}: {
  incident: Incident;
  onSelect?: (incident: Incident) => void;
  selected?: boolean;
  compact?: boolean;
  /** Running response timer instead of "00:42 ago" — for active critical work. */
  showTimer?: boolean;
  className?: string;
}) {
  const units = useUnits();
  const meta = PRIORITY_META[incident.priority];
  const active = STATUS_META[incident.status].active;
  const assigned = incident.assignments
    .filter((a) => a.response !== "rejected")
    .map((a) => units.find((u) => u.id === a.unitId)?.callSign)
    .filter(Boolean);

  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2 left-0 w-1 rounded-r",
          active ? TONE[meta.tone].dot : "bg-border",
        )}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <PriorityBadge
            priority={incident.priority}
            variant={
              active && incident.priority === "P1"
                ? "solid"
                : active
                  ? "soft"
                  : "outline"
            }
          />
          {!compact && (
            <span className="tnum truncate font-mono text-[11px] text-muted-foreground">
              {incident.id}
            </span>
          )}
        </div>
        {showTimer && active ? (
          <ResponseTimer
            since={incident.createdAt}
            priority={incident.priority}
            size="sm"
          />
        ) : (
          <RelativeTime
            at={incident.createdAt}
            className="text-xs text-muted-foreground"
          />
        )}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
        <CategoryIcon
          categoryId={incident.categoryId}
          className="text-muted-foreground"
        />
        <span className="truncate">{incident.title}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{incident.location.area}</span>
        </span>
        {assigned.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Truck aria-hidden className="size-3.5" />
            {assigned.join(", ")}
          </span>
        )}
        {!compact && (
          <StatusChip status={incident.status} className="ml-auto" />
        )}
      </div>
    </>
  );

  const classes = cn(
    "relative block w-full rounded-xl border bg-card py-3 pr-3 pl-4 text-left transition-colors",
    selected ? "border-primary/60 bg-accent/60" : "border-border",
    onSelect && "hover:border-input hover:bg-muted/50",
    className,
  );

  if (!onSelect) return <div className={classes}>{body}</div>;
  return (
    <button
      type="button"
      onClick={() => onSelect(incident)}
      aria-pressed={selected}
      aria-label={`${meta.label} incident, ${incident.title}, ${incident.location.area}`}
      className={classes}
    >
      {body}
    </button>
  );
}
