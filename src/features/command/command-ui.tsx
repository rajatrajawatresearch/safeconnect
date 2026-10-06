"use client";

import { ArrowUpRight, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { MapSelection } from "@/components/shared/ops-map";
import {
  PriorityBadge,
  StatusChip,
  ToneChip,
  UnitStatusChip,
} from "@/components/shared/status-chips";
import { ResponseTimer } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { ESCALATION_LEVEL_LABEL, type Tone } from "@/config/incident";
import { stationById } from "@/data/demo/geo";
import { SegmentedControl } from "@/features/analytics/controls";
import { formatDecimal } from "@/features/analytics/format";
import { useIncident, useUnit } from "@/hooks/use-demo-data";
import { cn } from "@/lib/utils";
import type { DistrictSummary } from "@/types";
import type { CommandScopeState } from "./use-command-scope";

/* ───────────────────────── Links to other areas ───────────────────────── */

export const incidentHref = (id: string) =>
  `/control/incidents?id=${encodeURIComponent(id)}`;
export const unitHref = (id: string) =>
  `/control/units?id=${encodeURIComponent(id)}`;
export const stationHref = (id: string) =>
  `/control/stations?id=${encodeURIComponent(id)}`;
export const districtHref = (id: string) =>
  `/command/districts?id=${encodeURIComponent(id)}`;

/* ───────────────────────── Small shared pieces ───────────────────────── */

export function ScopeSwitch({ scope }: { scope: CommandScopeState }) {
  return (
    <SegmentedControl
      label="Scope"
      value={scope.scope}
      onChange={scope.setScope}
      options={scope.options}
      className="w-full sm:w-fit"
    />
  );
}

const ESCALATION_TONE: Record<1 | 2 | 3, Tone> = {
  1: "medium",
  2: "high",
  3: "critical",
};

export function EscalationLevelChip({
  level,
  short,
  className,
}: {
  level: 1 | 2 | 3;
  /** "L2" only, for dense tables where the level name is given elsewhere. */
  short?: boolean;
  className?: string;
}) {
  return (
    <ToneChip tone={ESCALATION_TONE[level]} className={className}>
      <span className="tnum">L{level}</span>
      {!short && ESCALATION_LEVEL_LABEL[level]}
    </ToneChip>
  );
}

/** Quiet text link with an arrow, for "open this elsewhere" actions in panel headers and footers. */
export function PanelLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn("text-muted-foreground", className)}
    >
      <Link href={href}>
        {children}
        <ArrowUpRight aria-hidden />
      </Link>
    </Button>
  );
}

/* ───────────────────────── Map selection ───────────────────────── */

/**
 * What was picked on the map, with the way through to its detail screen.
 * Sits over the map so a stray tap never navigates away from the overview.
 */
export function MapSelectionCard({
  selection,
  districts,
  onClear,
  className,
}: {
  selection: MapSelection | null;
  districts?: DistrictSummary[];
  onClear: () => void;
  className?: string;
}) {
  const incident = useIncident(
    selection?.type === "incident" ? selection.id : null,
  );
  const unit = useUnit(selection?.type === "unit" ? selection.id : null);
  const station =
    selection?.type === "station" ? stationById(selection.id) : undefined;
  const district =
    selection?.type === "district"
      ? districts?.find((d) => d.districtId === selection.id)
      : undefined;

  let body: ReactNode = null;
  let action: { href: string; label: string } | null = null;

  if (incident) {
    action = { href: incidentHref(incident.id), label: "Open incident" };
    body = (
      <>
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={incident.priority} />
          <StatusChip status={incident.status} />
          <ResponseTimer
            since={incident.createdAt}
            until={incident.resolvedAt}
            priority={incident.priority}
            size="sm"
            className="ml-auto"
          />
        </div>
        <p className="mt-2 truncate text-sm font-semibold">{incident.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {incident.location.area} ·{" "}
          <span className="font-mono">{incident.id}</span>
        </p>
      </>
    );
  } else if (unit) {
    action = { href: unitHref(unit.id), label: "Open unit" };
    body = (
      <>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-sm font-semibold">
            {unit.callSign}
          </span>
          <UnitStatusChip status={unit.status} />
        </div>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">
          {unit.vehicle} · {stationById(unit.stationId)?.area ?? "Station"} ·
          crew of {unit.crew}
        </p>
      </>
    );
  } else if (station) {
    action = { href: stationHref(station.id), label: "Open station" };
    body = (
      <>
        <p className="truncate text-sm font-semibold">{station.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {station.inChargeName}
        </p>
      </>
    );
  } else if (district) {
    action = {
      href: districtHref(district.districtId),
      label: "Open district",
    };
    body = (
      <>
        <p className="truncate text-sm font-semibold">{district.name}</p>
        <p className="tnum mt-0.5 text-xs text-muted-foreground">
          {district.active} active · {district.critical} critical ·{" "}
          {formatDecimal(district.avgResponseMin)} min average response
        </p>
      </>
    );
  }

  if (!body || !action) return null;
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border border-border bg-card p-3 shadow-raised",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{body}</div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          aria-label="Clear map selection"
          className="-mt-1 -mr-1 shrink-0 text-muted-foreground"
        >
          <X aria-hidden />
        </Button>
      </div>
      <Button asChild variant="outline" size="sm" className="mt-2.5">
        <Link href={action.href}>
          {action.label}
          <ArrowUpRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
