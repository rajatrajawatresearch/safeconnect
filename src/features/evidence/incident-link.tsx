"use client";

import Link from "next/link";
import { IncidentRow } from "@/components/shared/incident-row";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types";

/** The shared incident row as a link into the incident inspector. */
export function IncidentLink({
  incident,
  compact,
  showTimer,
  className,
}: {
  incident: Incident;
  compact?: boolean;
  showTimer?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={`/control/incidents?id=${incident.id}`}
      aria-label={`Open incident ${incident.id}, ${incident.title}`}
      className={cn("block rounded-xl", className)}
    >
      <IncidentRow
        incident={incident}
        compact={compact}
        showTimer={showTimer}
        className="hover:border-input hover:bg-muted/50"
      />
    </Link>
  );
}
