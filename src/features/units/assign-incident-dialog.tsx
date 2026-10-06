"use client";

import { MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, RestrictedState } from "@/components/shared/states";
import { PriorityBadge } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAction } from "@/hooks/use-action";
import { byUrgency, useIncidents, useUnit } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { formatKm } from "@/lib/format";
import { etaMinutesBetween, roadKm } from "@/lib/geo";
import { services } from "@/services";
import type { Incident } from "@/types";

function Body({ unitId, onDone }: { unitId: string; onDone: () => void }) {
  const unit = useUnit(unitId);
  const incidents = useIncidents();
  const { actor, can } = useSession();
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const assign = useAction(
    async (incident: Incident) => {
      await services.dispatch.assignUnit(incident.id, unitId, actor);
      return incident;
    },
    {
      success: (incident) =>
        `Unit ${unit?.callSign ?? ""} assigned to ${incident.id}`,
      onSuccess: onDone,
    },
  );

  const waiting = useMemo(
    () =>
      incidents
        .filter((i) => i.status === "new" || i.status === "acknowledged")
        .sort(byUrgency),
    [incidents],
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Assign {unit ? `unit ${unit.callSign}` : "unit"} to an incident
        </DialogTitle>
        <DialogDescription>
          Open incidents that have no unit yet, most urgent first. Distances are
          by road from the unit&apos;s last reported position.
        </DialogDescription>
      </DialogHeader>

      {!can("unit.assign") ? (
        <RestrictedState compact description="Your role cannot assign units." />
      ) : !unit || (unit.status !== "available" && assigningId === null) ? (
        <RestrictedState
          compact
          title="Unit is not available"
          description="Only an available unit can be assigned to an incident."
        />
      ) : waiting.length === 0 ? (
        <EmptyState
          compact
          title="No unassigned incidents"
          description="Every open incident already has a unit."
        />
      ) : (
        <ul className="space-y-2" aria-label="Unassigned incidents">
          {waiting.map((incident) => (
            <li
              key={incident.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1 basis-48">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <PriorityBadge priority={incident.priority} />
                  <span className="tnum truncate font-mono text-xs text-muted-foreground">
                    {incident.id}
                  </span>
                </p>
                <p className="mt-1 truncate text-sm font-medium">
                  {incident.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin aria-hidden className="size-3.5 shrink-0" />
                  <span className="truncate">{incident.location.area}</span>
                  <span aria-hidden>·</span>
                  <RelativeTime at={incident.createdAt} />
                </p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <p className="text-right leading-tight">
                  <span className="tnum block text-sm font-medium">
                    {formatKm(roadKm(unit.position, incident.location))}
                  </span>
                  <span className="tnum block text-xs text-muted-foreground">
                    about {etaMinutesBetween(unit.position, incident.location)}{" "}
                    min
                  </span>
                </p>
                <Button
                  disabled={assign.pending}
                  onClick={async () => {
                    setAssigningId(incident.id);
                    // On success the dialog closes; keep the list as it was while it fades.
                    const assigned = await assign.run(incident);
                    if (!assigned) setAssigningId(null);
                  }}
                  aria-label={`Assign to ${incident.id}`}
                >
                  {assigningId === incident.id ? "Assigning…" : "Assign"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** The unit-first way to dispatch: choose which waiting incident an available unit should take. */
export function AssignIncidentDialog({
  unitId,
  open,
  onOpenChange,
}: {
  unitId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        {unitId ? (
          <Body unitId={unitId} onDone={() => onOpenChange(false)} />
        ) : (
          <DialogHeader>
            <DialogTitle>Assign to an incident</DialogTitle>
            <DialogDescription>No unit selected.</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}
