"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Navigation, Radio } from "lucide-react";
import { useMemo, useState } from "react";
import {
  BlankState,
  ErrorState,
  ListSkeleton,
  RestrictedState,
} from "@/components/shared/states";
import { PriorityBadge, ToneChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isActive, liveAssignments } from "@/features/incidents/incident-rules";
import { VEHICLE_ICON, stationShort } from "@/features/units/unit-meta";
import { useAction } from "@/hooks/use-action";
import { officerOfUnit, useIncident, useUnits } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { formatKm } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ServiceError, services, type UnitRecommendation } from "@/services";
import type { Incident, Unit } from "@/types";

/**
 * Available units ranked by road distance to an incident.
 * The key includes the set of available units, so the list re-ranks when a unit frees up or is taken.
 */
export function useUnitRecommendations(
  incidentId: string | null | undefined,
  enabled = true,
) {
  const units = useUnits();
  const availableKey = useMemo(
    () =>
      units
        .filter((u) => u.status === "available")
        .map((u) => u.id)
        .join(","),
    [units],
  );
  return useQuery({
    queryKey: ["dispatch", "recommend-units", incidentId, availableKey],
    queryFn: () => services.dispatch.recommendUnits(incidentId as string),
    enabled: enabled && Boolean(incidentId),
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
  });
}

function IncidentLine({ incident }: { incident: Incident }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <PriorityBadge priority={incident.priority} variant="soft" />
      <span className="tnum font-mono text-xs">{incident.id}</span>
      <span>
        {incident.title} · {incident.location.area}
      </span>
    </span>
  );
}

function RecommendationRow({
  recommendation,
  rank,
  action,
}: {
  recommendation: UnitRecommendation;
  rank: number;
  action?: React.ReactNode;
}) {
  const { unit, distanceKm, etaMin, sameStation } = recommendation;
  const Icon = VEHICLE_ICON[unit.vehicle];
  const officer = officerOfUnit(unit);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-card p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="tnum font-mono text-sm font-semibold">
            {unit.callSign}
          </span>
          {rank === 0 && <ToneChip tone="resolved">Closest</ToneChip>}
          {sameStation && (
            <ToneChip tone="normal" variant="outline">
              Same station
            </ToneChip>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {unit.vehicle} · {officer?.name ?? "Officer not set"} ·{" "}
          {stationShort(unit.stationId)}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <p className="text-right leading-tight">
          <span className="tnum block text-sm font-medium">
            {formatKm(distanceKm)}
          </span>
          <span className="tnum block text-xs text-muted-foreground">
            about {etaMin} min
          </span>
        </p>
        {action}
      </div>
    </li>
  );
}

function AssignUnitBody({
  incidentId,
  onAssigned,
  onDone,
}: {
  incidentId: string;
  onAssigned?: (unitId: string) => void;
  onDone: () => void;
}) {
  const incident = useIncident(incidentId);
  const units = useUnits();
  const { actor, can } = useSession();
  const query = useUnitRecommendations(incidentId);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const assign = useAction(
    async (unit: Unit) => {
      await services.dispatch.assignUnit(incidentId, unit.id, actor);
      return unit;
    },
    {
      success: (unit) => `Unit ${unit.callSign} assigned`,
      onSuccess: (unit) => {
        onAssigned?.(unit.id);
        onDone();
      },
    },
  );

  const already = incident
    ? liveAssignments(incident)
        .map((a) => units.find((u) => u.id === a.unitId)?.callSign)
        .filter(Boolean)
    : [];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Assign a unit</DialogTitle>
        <DialogDescription asChild>
          <div className="text-sm text-muted-foreground">
            {incident ? (
              <IncidentLine incident={incident} />
            ) : (
              "Unable to load the incident."
            )}
          </div>
        </DialogDescription>
      </DialogHeader>

      {!can("unit.assign") ? (
        <RestrictedState compact description="Your role cannot assign units." />
      ) : !incident ? (
        <BlankState compact title="Incident not found" />
      ) : !isActive(incident) ? (
        <BlankState
          compact
          title="This incident is no longer open"
          description="Units can only be assigned to open incidents."
        />
      ) : query.isPending ? (
        <ListSkeleton rows={4} />
      ) : query.isError ? (
        <ErrorState
          compact
          title="Unable to load available units."
          offline={
            query.error instanceof ServiceError &&
            query.error.code === "offline"
          }
          onRetry={() => query.refetch()}
        />
      ) : query.data.length === 0 ? (
        <BlankState
          compact
          icon={Radio}
          title="No units are available right now"
          description="Every unit is engaged, unavailable or off duty. Free a unit from the Units screen, or escalate the incident."
        />
      ) : (
        <div className={cn(query.isPlaceholderData && "opacity-70")}>
          {already.length > 0 && (
            <p className="mb-3 rounded-lg bg-inset px-3 py-2 text-[13px] text-muted-foreground">
              {already.join(", ")} already assigned. The unit you choose joins
              as backup.
            </p>
          )}
          <ul className="space-y-2" aria-label="Available units by distance">
            {query.data.map((recommendation, index) => (
              <RecommendationRow
                key={recommendation.unit.id}
                recommendation={recommendation}
                rank={index}
                action={
                  <Button
                    variant={index === 0 ? "default" : "outline"}
                    disabled={assign.pending}
                    onClick={async () => {
                      setAssigningId(recommendation.unit.id);
                      await assign.run(recommendation.unit);
                      setAssigningId(null);
                    }}
                    aria-label={`Assign unit ${recommendation.unit.callSign}`}
                  >
                    {assigningId === recommendation.unit.id
                      ? "Assigning…"
                      : "Assign"}
                  </Button>
                }
              />
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Ranked by road distance from each unit&apos;s last reported
            position. The ranking is a suggestion; the choice is yours.
          </p>
        </div>
      )}
    </>
  );
}

/** Pick an available unit for an incident. The first unit becomes primary, later ones backup. */
export function AssignUnitDialog({
  incidentId,
  open,
  onOpenChange,
  onAssigned,
}: {
  incidentId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: (unitId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        {incidentId ? (
          <AssignUnitBody
            incidentId={incidentId}
            onAssigned={onAssigned}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <DialogHeader>
            <DialogTitle>Assign a unit</DialogTitle>
            <DialogDescription>No incident selected.</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DispatchUnitBody({
  incidentId,
  onChooseOther,
  onDone,
}: {
  incidentId: string;
  onChooseOther?: () => void;
  onDone: () => void;
}) {
  const incident = useIncident(incidentId);
  const { actor } = useSession();
  const query = useUnitRecommendations(incidentId);
  const top = query.data?.[0];
  const dispatch = useAction(
    async (unit: Unit) => {
      await services.dispatch.assignUnit(incidentId, unit.id, actor);
      return unit;
    },
    {
      success: (unit) => `Unit ${unit.callSign} dispatched`,
      onSuccess: onDone,
    },
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Dispatch the closest unit</DialogTitle>
        <DialogDescription asChild>
          <div className="text-sm text-muted-foreground">
            {incident ? (
              <IncidentLine incident={incident} />
            ) : (
              "Unable to load the incident."
            )}
          </div>
        </DialogDescription>
      </DialogHeader>

      {query.isPending ? (
        <ListSkeleton rows={1} />
      ) : query.isError ? (
        <ErrorState
          compact
          title="Unable to load available units."
          offline={
            query.error instanceof ServiceError &&
            query.error.code === "offline"
          }
          onRetry={() => query.refetch()}
        />
      ) : !top ? (
        <BlankState
          compact
          icon={Radio}
          title="No units are available right now"
          description="Every unit is engaged, unavailable or off duty. Free a unit from the Units screen, or escalate the incident."
        />
      ) : (
        <div>
          <ul>
            <RecommendationRow recommendation={top} rank={0} />
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            This assigns the unit and notifies the officer, who then accepts and
            sets off. The closest unit is a suggestion; you confirm it.
          </p>
        </div>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        {onChooseOther && (
          <Button variant="outline" onClick={onChooseOther}>
            Choose another unit
          </Button>
        )}
        <Button
          disabled={!top || dispatch.pending}
          onClick={() => top && dispatch.run(top.unit)}
        >
          <Navigation aria-hidden />
          {top ? `Dispatch ${top.unit.callSign}` : "Dispatch"}
        </Button>
      </DialogFooter>
    </>
  );
}

/** One-step dispatch: confirm, and the closest available unit is assigned. */
export function DispatchUnitDialog({
  incidentId,
  open,
  onOpenChange,
  onChooseOther,
}: {
  incidentId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lets the dispatcher fall through to the full list instead of taking the suggestion. */
  onChooseOther?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        {incidentId ? (
          <DispatchUnitBody
            incidentId={incidentId}
            onChooseOther={onChooseOther}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <DialogHeader>
            <DialogTitle>Dispatch the closest unit</DialogTitle>
            <DialogDescription>No incident selected.</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}
