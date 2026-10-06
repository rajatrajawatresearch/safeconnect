"use client";

import {
  ArrowUpRight,
  CircleCheck,
  CirclePause,
  FileSearch,
  LocateFixed,
  Power,
  Unlink,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { OpsMap } from "@/components/shared/ops-map";
import { BlankState } from "@/components/shared/states";
import {
  OfficerStageChip,
  PriorityBadge,
  SensitiveBadge,
  StatusChip,
  ToneChip,
  UnitStatusChip,
} from "@/components/shared/status-chips";
import {
  ClockStamp,
  EtaCountdown,
  RelativeTime,
} from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  OFFICER_STAGE_META,
  STATUS_META,
  UNIT_STATUS_META,
} from "@/config/incident";
import { STATIONS } from "@/data/demo/geo";
import { DetailHeader } from "@/features/control/detail-panel";
import { ActionButton } from "@/features/incidents/action-button";
import { ReleaseUnitDialog } from "@/features/incidents/incident-dialogs";
import {
  nearestAreaName,
  stationName,
} from "@/features/incidents/incident-rules";
import { useAction } from "@/hooks/use-action";
import { officerOfUnit, useIncident, useUnit } from "@/hooks/use-demo-data";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { formatCoords, formatTime } from "@/lib/format";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type { Unit, UnitStatus } from "@/types";
import { AssignIncidentDialog } from "./assign-incident-dialog";
import {
  AVAILABILITY_LABEL,
  MANUAL_STATUSES,
  VEHICLE_ICON,
  isEngaged,
} from "./unit-meta";

const STATUS_ICON: Partial<Record<UnitStatus, LucideIcon>> = {
  available: CircleCheck,
  unavailable: CirclePause,
  off_duty: Power,
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-3">
      <dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm leading-5 break-words">{children}</dd>
    </div>
  );
}

/** "in 3 h 58 min", on a coarse clock so the panel does not re-render every second. */
export function ShiftEnd({ at }: { at: number }) {
  const now = useNow(30_000);
  const minutes = Math.round((at - now) / 60_000);
  return (
    <span className="tnum">
      {formatTime(at)}
      {now > 0 && (
        <span className="text-muted-foreground">
          {" "}
          ·{" "}
          {minutes <= 0
            ? "shift ended"
            : minutes < 60
              ? `in ${minutes} min`
              : `in ${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`}
        </span>
      )}
    </span>
  );
}

function CurrentAssignment({ unit }: { unit: Unit }) {
  const incident = useIncident(unit.currentIncidentId);
  if (!incident)
    return (
      <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-sm text-muted-foreground">
        Not assigned to an incident.
      </p>
    );
  const assignment = incident.assignments.find(
    (a) => a.unitId === unit.id && a.response !== "rejected",
  );
  return (
    <Link
      href={`/control/incidents?id=${incident.id}`}
      className="group block rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-input hover:bg-muted/50"
    >
      <span className="flex items-center gap-2">
        <PriorityBadge priority={incident.priority} />
        <span className="tnum min-w-0 truncate font-mono text-xs text-muted-foreground">
          {incident.id}
        </span>
        <ArrowUpRight
          aria-hidden
          className="ml-auto size-4 shrink-0 text-subtle group-hover:text-foreground"
        />
      </span>
      <span className="mt-2 block text-sm font-semibold">{incident.title}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">
        {incident.location.address}
      </span>
      <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusChip status={incident.status} />
        {/* The officer's own stage is shown only when it says more than the incident status. */}
        {assignment &&
          OFFICER_STAGE_META[assignment.stage].label !==
            STATUS_META[incident.status].label && (
            <OfficerStageChip stage={assignment.stage} />
          )}
        {assignment && (
          <ToneChip tone="neutral" variant="outline">
            {assignment.role === "primary" ? "Primary unit" : "Backup unit"}
          </ToneChip>
        )}
        {assignment?.response === "pending" && (
          <span className="text-xs text-muted-foreground">
            Waiting for the officer to accept
          </span>
        )}
        {unit.status === "en_route" && incident.etaAt && (
          <span className="text-xs text-muted-foreground">
            ETA <EtaCountdown at={incident.etaAt} className="text-xs" />
          </span>
        )}
      </span>
    </Link>
  );
}

function RecentActivity({ unit }: { unit: Unit }) {
  const audit = useDemoStore((s) => s.audit);
  const events = useMemo(
    () =>
      audit
        .filter((e) => e.entityId === unit.id || e.actorName === unit.callSign)
        .slice(0, 6),
    [audit, unit.id, unit.callSign],
  );
  if (events.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Nothing recorded for this unit during the current shift.
      </p>
    );
  return (
    <ol className="divide-y divide-border/70 rounded-xl border border-border bg-card">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3 px-3.5 py-2">
          <ClockStamp at={event.at} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">{event.action}</p>
            <p className="truncate text-xs text-muted-foreground">
              {event.detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function UnitActions({ unit }: { unit: Unit }) {
  const { actor, can } = useSession();
  const [dialog, setDialog] = useState<"assign" | "release" | null>(null);
  const setStatus = useAction(
    async (status: UnitStatus) => {
      await services.units.setStatus(unit.id, status, actor);
      return status;
    },
    {
      success: (status) =>
        `Unit ${unit.callSign} set to ${UNIT_STATUS_META[status].label.toLowerCase()}`,
    },
  );
  const engaged = isEngaged(unit);

  const statusReason = (status: UnitStatus): string | null => {
    if (!can("unit.status.update"))
      return "Your role cannot change unit status.";
    if (engaged) return "The unit is engaged on an incident. Release it first.";
    if (unit.status === status)
      return `The unit is already ${UNIT_STATUS_META[status].label.toLowerCase()}.`;
    return null;
  };
  const assignReason = !can("unit.assign")
    ? "Your role cannot assign units."
    : unit.status !== "available"
      ? "Only an available unit can be assigned."
      : null;
  const releaseReason = !can("unit.assign")
    ? "Your role cannot release units."
    : !unit.currentIncidentId
      ? "The unit is not on an incident."
      : null;

  return (
    <>
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">Set status</p>
          <div className="grid grid-cols-3 gap-1.5">
            {MANUAL_STATUSES.map((status) => (
              <ActionButton
                key={status}
                icon={STATUS_ICON[status] ?? CircleCheck}
                label={UNIT_STATUS_META[status].label}
                reason={statusReason(status)}
                pending={setStatus.pending}
                onClick={() => setStatus.run(status)}
                className="justify-center"
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <ActionButton
            icon={UserPlus}
            label="Assign to an incident"
            variant="default"
            reason={assignReason}
            onClick={() => setDialog("assign")}
          />
          <ActionButton
            icon={Unlink}
            label="Release from incident"
            variant="destructive"
            reason={releaseReason}
            onClick={() => setDialog("release")}
          />
        </div>
      </div>
      <AssignIncidentDialog
        unitId={unit.id}
        open={dialog === "assign"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <ReleaseUnitDialog
        incidentId={unit.currentIncidentId}
        unitId={unit.id}
        open={dialog === "release"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
    </>
  );
}

/**
 * One unit: where it is, who is on it, what it is doing.
 *
 * `mode="full"` is the Units drawer, with a position map and the dispatcher's actions.
 * `mode="summary"` is the read-only card other screens show, with a link through to the unit.
 */
export function UnitDetail({
  unitId,
  onClose,
  mode = "full",
}: {
  unitId: string | null | undefined;
  onClose?: () => void;
  mode?: "full" | "summary";
}) {
  const unit = useUnit(unitId);
  const incident = useIncident(unit?.currentIncidentId);
  const officer = officerOfUnit(unit);

  const mapProps = useMemo(() => {
    if (!unit) return null;
    const station = STATIONS.find((s) => s.id === unit.stationId);
    return {
      units: [unit],
      incidents: incident ? [incident] : [],
      stations: station ? [station] : [],
      focus: incident ? [unit.position, incident.location] : [unit.position],
      route:
        incident && unit.status === "en_route"
          ? { from: unit.routeFrom ?? unit.position, to: incident.location }
          : undefined,
    };
  }, [unit, incident]);

  if (!unit || !mapProps)
    return (
      <div className="flex h-full min-h-0 flex-col bg-card">
        <DetailHeader title="Unit" onClose={onClose} />
        <BlankState
          className="flex-1"
          icon={FileSearch}
          title={unitId ? "Unit not found" : "No unit selected"}
          description={
            unitId
              ? "It is not on the current roster."
              : "Choose a unit to see its crew, position and assignment."
          }
        />
      </div>
    );

  const Icon = VEHICLE_ICON[unit.vehicle];

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <DetailHeader
        title={
          <span className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Icon aria-hidden className="size-4" />
            </span>
            <span className="tnum font-mono">{unit.callSign}</span>
          </span>
        }
        subtitle={`${unit.vehicle} · ${stationName(unit.stationId)}`}
        onClose={onClose}
      >
        <UnitStatusChip status={unit.status} />
        <span className="text-xs text-muted-foreground">
          {AVAILABILITY_LABEL[unit.status]}
        </span>
      </DetailHeader>

      <div className="scroll-thin min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {mode === "full" && (
          <div className="overflow-hidden rounded-xl border border-border">
            <OpsMap
              {...mapProps}
              interactive={false}
              zoom={14}
              center={unit.position}
              label={`Position of unit ${unit.callSign}`}
              className="h-44"
            />
          </div>
        )}

        <Section title="Current assignment">
          <CurrentAssignment unit={unit} />
        </Section>

        <Section title="Crew">
          <dl className="space-y-2">
            <Row label="Officer in charge">
              {officer ? (
                <>
                  {officer.name}
                  <span className="block text-xs text-muted-foreground">
                    {officer.rank} · badge{" "}
                    <span className="tnum font-mono">{officer.badgeNo}</span>
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </Row>
            {officer && (
              <Row label="Contact">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="tnum font-mono text-xs">
                    {officer.phoneMasked}
                  </span>
                  <SensitiveBadge />
                </span>
              </Row>
            )}
            <Row label="Crew size">
              <span className="tnum">{unit.crew}</span>{" "}
              {unit.crew === 1 ? "person" : "people"}
            </Row>
            <Row label="Vehicle">
              {unit.vehicle}
              <span className="tnum block font-mono text-xs text-muted-foreground">
                {unit.vehicleNo}
              </span>
            </Row>
          </dl>
        </Section>

        <Section title="Last authorised operational location">
          <dl className="space-y-2">
            <Row label="Area">
              <span className="flex items-center gap-1.5">
                <LocateFixed
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                Near {nearestAreaName(unit.position)}
              </span>
            </Row>
            <Row label="Coordinates">
              <span className="tnum font-mono text-xs">
                {formatCoords(unit.position)}
              </span>
            </Row>
            <Row label="Reported">
              <RelativeTime at={unit.positionAt} />
            </Row>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Positions are reported by the unit only while it is on authorised
            duty.
          </p>
        </Section>

        <Section title="Availability">
          <dl className="space-y-2">
            <Row label="Now">{AVAILABILITY_LABEL[unit.status]}</Row>
            <Row label="Shift ends">
              <ShiftEnd at={unit.shiftEndsAt} />
            </Row>
          </dl>
        </Section>

        {mode === "full" ? (
          <>
            <Section title="Actions">
              <UnitActions unit={unit} />
            </Section>
            <Section title="Recent activity">
              <RecentActivity unit={unit} />
            </Section>
          </>
        ) : (
          <Button variant="outline" asChild className="w-full">
            <Link href={`/control/units?id=${unit.id}`}>
              Open in Units <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
