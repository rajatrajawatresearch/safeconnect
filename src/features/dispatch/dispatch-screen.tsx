"use client";

import { ChevronDown, GripVertical, MapPin, Radio, Truck } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/shared/category-icon";
import { Panel } from "@/components/shared/page";
import { RestrictedState } from "@/components/shared/states";
import { PriorityBadge } from "@/components/shared/status-chips";
import { EtaCountdown, ResponseTimer } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DISPATCH_COLUMNS, PRIORITY_META, TONE } from "@/config/incident";
import { DetailPanel } from "@/features/control/detail-panel";
import { useLastValue } from "@/features/control/use-query-params";
import { ResolveIncidentDialog } from "@/features/incidents/incident-dialogs";
import { IncidentInspector } from "@/features/incidents/incident-inspector";
import {
  frozenAt,
  isActive,
  liveAssignments,
  officerActorFor,
} from "@/features/incidents/incident-rules";
import { VEHICLE_ICON, stationShort } from "@/features/units/unit-meta";
import { useAction } from "@/hooks/use-action";
import { byUrgency, useIncidents, useUnits } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { Incident, Unit } from "@/types";
import { AssignUnitDialog } from "./assign-unit-dialog";
import {
  columnLabel,
  columnOf,
  planMove,
  type ColumnKey,
  type MovePlan,
} from "./board-rules";

const INCIDENT_MIME = "application/x-sanket-incident";
const UNIT_MIME = "application/x-sanket-unit";

const EMPTY_COLUMN: Record<ColumnKey, string> = {
  unassigned: "Every open incident has a unit.",
  assigned: "No unit is waiting to accept.",
  en_route: "No unit is on the way.",
  on_scene: "No unit is on scene.",
  resolved: "Nothing has been resolved yet.",
};

type Drag = { kind: "incident" | "unit"; id: string };

/** What the card says about its unit, which depends on how far the response has got. */
function UnitLine({ incident, units }: { incident: Incident; units: Unit[] }) {
  const live = liveAssignments(incident);
  const signs = live
    .map((a) => units.find((u) => u.id === a.unitId)?.callSign)
    .filter(Boolean)
    .join(", ");

  if (!signs)
    return (
      <span className={cn(isActive(incident) ? "text-high-fg" : "text-subtle")}>
        {isActive(incident) ? "No unit assigned" : "No unit attended"}
      </span>
    );

  return (
    <>
      <span className="tnum font-mono font-medium text-foreground">
        {signs}
      </span>
      {incident.status === "assigned" && (
        <span>
          {live.some((a) => a.response === "pending")
            ? "· awaiting acceptance"
            : "· accepted"}
        </span>
      )}
      {incident.status === "en_route" && (
        <span>
          · ETA <EtaCountdown at={incident.etaAt} className="text-xs" />
        </span>
      )}
    </>
  );
}

function MoveMenu({
  incident,
  current,
  plans,
  onMove,
  onOpen,
}: {
  incident: Incident;
  current: ColumnKey;
  plans: Record<ColumnKey, MovePlan>;
  onMove: (to: ColumnKey) => void;
  onOpen: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Move ${incident.id} to another column`}
          className="h-9 md:h-7"
        >
          Move to <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Move {incident.id} to</DropdownMenuLabel>
        {DISPATCH_COLUMNS.map((column) => {
          const here = column.key === current;
          const plan = plans[column.key];
          const allowed = !here && plan.ok;
          return (
            <DropdownMenuItem
              key={column.key}
              disabled={here}
              aria-disabled={!allowed || undefined}
              onSelect={() => onMove(column.key)}
              className="flex-col items-start gap-0"
            >
              <span
                className={cn(
                  "font-medium",
                  !allowed && "text-muted-foreground",
                )}
              >
                {column.label}
              </span>
              <span className="text-xs leading-snug whitespace-normal text-muted-foreground">
                {here
                  ? "Current column"
                  : plan.ok
                    ? plan.hint
                    : `Not available. ${plan.reason}`}
              </span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpen}>Open incident</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BoardCard({
  incident,
  units,
  column,
  can,
  dragging,
  acceptsUnit,
  onOpen,
  onMove,
  onDragStart,
  onDragEnd,
  onUnitDrop,
}: {
  incident: Incident;
  units: Unit[];
  column: ColumnKey;
  can: ReturnType<typeof useSession>["can"];
  dragging: boolean;
  /** A unit is being dragged and this card can take it. */
  acceptsUnit: boolean;
  onOpen: () => void;
  onMove: (to: ColumnKey) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onUnitDrop: (unitId: string) => void;
}) {
  const [unitOver, setUnitOver] = useState(false);
  const active = isActive(incident);
  const plans = useMemo(
    () =>
      Object.fromEntries(
        DISPATCH_COLUMNS.map((c) => [
          c.key,
          planMove(incident, c.key, units, can),
        ]),
      ) as Record<ColumnKey, MovePlan>,
    [incident, units, can],
  );

  return (
    <li>
      <article
        draggable
        aria-label={`${PRIORITY_META[incident.priority].label} incident ${incident.id}, ${incident.title}, ${incident.location.area}`}
        onDragStart={(e) => {
          e.dataTransfer.setData(INCIDENT_MIME, incident.id);
          e.dataTransfer.setData("text/plain", incident.id);
          e.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(UNIT_MIME)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          if (!unitOver) setUnitOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
            setUnitOver(false);
        }}
        onDrop={(e) => {
          const unitId = e.dataTransfer.getData(UNIT_MIME);
          if (!unitId) return;
          e.preventDefault();
          e.stopPropagation();
          setUnitOver(false);
          onUnitDrop(unitId);
        }}
        className={cn(
          "relative cursor-grab rounded-xl border bg-card py-2.5 pr-2.5 pl-3.5 shadow-card transition-[opacity,border-color,box-shadow] active:cursor-grabbing",
          dragging && "opacity-40",
          unitOver
            ? "border-primary ring-2 ring-primary/30"
            : acceptsUnit
              ? "border-dashed border-primary/50"
              : "border-border",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-2 left-0 w-1 rounded-r",
            active
              ? TONE[PRIORITY_META[incident.priority].tone].dot
              : "bg-border",
          )}
        />
        <div className="flex items-center justify-between gap-2">
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
          <ResponseTimer
            since={incident.createdAt}
            until={frozenAt(incident)}
            priority={incident.priority}
            size="sm"
          />
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="mt-2 flex w-full items-start gap-1.5 rounded-md text-left text-sm font-semibold hover:underline"
        >
          <CategoryIcon
            categoryId={incident.categoryId}
            className="mt-0.5 text-muted-foreground"
          />
          <span className="line-clamp-2 min-w-0">{incident.title}</span>
        </button>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{incident.location.area}</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
          <Truck aria-hidden className="size-3.5 shrink-0" />
          <UnitLine incident={incident} units={units} />
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {/* The sequence is the part that tells incidents apart, so that is what a narrow card keeps. */}
          <span
            title={incident.id}
            className="tnum flex min-w-0 items-center gap-0.5 font-mono text-[11px] text-subtle"
          >
            <GripVertical aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{incident.id.split("-").pop()}</span>
          </span>
          <MoveMenu
            incident={incident}
            current={column}
            plans={plans}
            onMove={onMove}
            onOpen={onOpen}
          />
        </div>
      </article>
    </li>
  );
}

export function DispatchScreen() {
  const { actor, can } = useSession();
  const incidents = useIncidents();
  const units = useUnits();
  const headingId = useId();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [overKey, setOverKey] = useState<ColumnKey | null>(null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [resolveFor, setResolveFor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Dialogs and the drawer keep their subject while they animate shut.
  const shownId = useLastValue(selectedId);
  const assignId = useLastValue(assignFor);
  const resolveId = useLastValue(resolveFor);

  // The control room acts for the unit here, so the officer is recorded as the actor.
  const accept = useAction(
    async (incident: Incident, unit: Unit) => {
      await services.units.acceptAssignment(
        incident.id,
        unit.id,
        officerActorFor(unit),
      );
      return unit;
    },
    { success: (unit) => `Unit ${unit.callSign} en route` },
  );
  const arrive = useAction(
    async (incident: Incident, unit: Unit) => {
      await services.units.markArrived(
        incident.id,
        unit.id,
        officerActorFor(unit),
      );
      return unit;
    },
    { success: (unit) => `Unit ${unit.callSign} on scene` },
  );
  const assign = useAction(
    async (incident: Incident, unit: Unit) => {
      await services.dispatch.assignUnit(incident.id, unit.id, actor);
      return unit;
    },
    { success: (unit) => `Unit ${unit.callSign} assigned` },
  );

  const columns = useMemo(() => {
    const out = Object.fromEntries(
      DISPATCH_COLUMNS.map((c) => [c.key, [] as Incident[]]),
    ) as Record<ColumnKey, Incident[]>;
    for (const incident of incidents) {
      const key = columnOf(incident);
      if (key) out[key].push(incident);
    }
    for (const column of DISPATCH_COLUMNS) {
      if (column.key === "resolved")
        out.resolved.sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0));
      else out[column.key].sort(byUrgency);
    }
    return out;
  }, [incidents]);

  const available = useMemo(
    () => units.filter((u) => u.status === "available"),
    [units],
  );

  const dragged =
    drag?.kind === "incident"
      ? incidents.find((i) => i.id === drag.id)
      : undefined;

  if (!(can("incident.read.all") || can("incident.read.station")))
    return (
      <div className="p-4">
        <Panel>
          <RestrictedState
            title="Dispatch is restricted"
            description="Your role does not permit access to the dispatch board."
          />
        </Panel>
      </div>
    );

  const move = (incident: Incident, to: ColumnKey) => {
    const plan = planMove(incident, to, units, can);
    if (!plan.ok) {
      toast(`Cannot move to ${columnLabel(to)}`, { description: plan.reason });
      return;
    }
    if (plan.kind === "assign") setAssignFor(incident.id);
    else if (plan.kind === "resolve") setResolveFor(incident.id);
    else if (plan.kind === "accept") void accept.run(incident, plan.unit);
    else if (plan.kind === "arrive") void arrive.run(incident, plan.unit);
  };

  const dropUnit = (incident: Incident, unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    setDrag(null);
    if (!unit) return;
    if (!can("unit.assign")) {
      toast("Cannot assign unit", {
        description: "Your role cannot assign units.",
      });
      return;
    }
    if (!isActive(incident)) {
      toast("Cannot assign unit", {
        description: "Units can only be assigned to open incidents.",
      });
      return;
    }
    if (unit.status !== "available") {
      toast("Cannot assign unit", {
        description: `Unit ${unit.callSign} is no longer available.`,
      });
      return;
    }
    void assign.run(incident, unit);
  };

  const unassigned = columns.unassigned.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 px-4 pt-4 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <div className="min-w-0">
            <h1
              id={headingId}
              className="text-2xl font-semibold tracking-tight"
            >
              Dispatch board
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Drag a card to the next column, or use Move to on the card. Each
              move carries out that step of the response.
            </p>
          </div>
          <p
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <span
              className={cn(
                "tnum font-medium",
                unassigned > 0 ? "text-high-fg" : "text-foreground",
              )}
            >
              {unassigned}
            </span>{" "}
            waiting for a unit ·{" "}
            <span className="tnum font-medium text-foreground">
              {available.length}
            </span>{" "}
            units available
          </p>
        </div>

        <section
          aria-label="Available units"
          className="mt-3 flex items-center gap-2.5 rounded-xl border border-border bg-card py-2 pr-2 pl-3 shadow-card"
        >
          <h2 className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Radio aria-hidden className="size-3.5" />
            <span className="hidden sm:inline">Available units</span>
            <span className="sm:hidden">Available</span>
          </h2>
          {available.length === 0 ? (
            <p className="py-1 text-[13px] text-muted-foreground">
              None right now. A unit frees up when its incident is resolved or
              it is released.
            </p>
          ) : (
            <ul className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {available.map((unit) => {
                const Icon = VEHICLE_ICON[unit.vehicle];
                return (
                  <li key={unit.id} className="shrink-0">
                    <Link
                      href={`/control/units?id=${unit.id}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(UNIT_MIME, unit.id);
                        e.dataTransfer.effectAllowed = "copy";
                        setDrag({ kind: "unit", id: unit.id });
                      }}
                      onDragEnd={() => setDrag(null)}
                      title={`${unit.vehicle} · ${stationShort(unit.stationId)}. Drag onto an incident to assign.`}
                      className={cn(
                        "flex h-8 items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-xs transition-colors hover:border-input hover:bg-muted",
                        drag?.kind === "unit" &&
                          drag.id === unit.id &&
                          "opacity-40",
                      )}
                    >
                      <Icon aria-hidden className="size-3.5 text-resolved-fg" />
                      <span className="tnum font-mono font-medium">
                        {unit.callSign}
                      </span>
                      <span className="text-muted-foreground">
                        {stationShort(unit.stationId)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </header>

      <div
        role="region"
        aria-labelledby={headingId}
        className="scroll-thin flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-3 pb-4 sm:px-5 md:snap-none"
      >
        {DISPATCH_COLUMNS.map((column) => {
          const items = columns[column.key];
          const plan = dragged
            ? planMove(dragged, column.key, units, can)
            : null;
          const isSource = dragged ? columnOf(dragged) === column.key : false;
          const over = overKey === column.key && Boolean(dragged) && !isSource;
          return (
            <section
              key={column.key}
              aria-label={`${column.label}, ${items.length} ${items.length === 1 ? "incident" : "incidents"}`}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(INCIDENT_MIME)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overKey !== column.key) setOverKey(column.key);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                  setOverKey(null);
              }}
              onDrop={(e) => {
                const id = e.dataTransfer.getData(INCIDENT_MIME);
                if (!id) return;
                e.preventDefault();
                setDrag(null);
                setOverKey(null);
                const incident = incidents.find((i) => i.id === id);
                if (incident && columnOf(incident) !== column.key)
                  move(incident, column.key);
              }}
              className={cn(
                "flex min-h-0 w-[84vw] max-w-80 shrink-0 snap-center flex-col rounded-xl border bg-inset transition-colors md:w-auto md:max-w-none md:min-w-[214px] md:flex-1 md:basis-0",
                !plan || isSource
                  ? "border-border/70"
                  : plan.ok
                    ? over
                      ? "border-primary bg-accent/50"
                      : "border-dashed border-primary/50"
                    : over
                      ? "border-critical/40"
                      : "border-border/70 opacity-60",
              )}
            >
              <header className="flex shrink-0 items-center justify-between gap-2 px-3 pt-3 pb-2">
                <h2 className="text-sm font-semibold">{column.label}</h2>
                <span
                  className={cn(
                    "tnum grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-medium",
                    column.key === "unassigned" && items.length > 0
                      ? "bg-high-soft text-high-fg"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {items.length}
                </span>
              </header>
              {plan && !isSource && over && (
                <p className="mx-2 mb-2 rounded-lg bg-card px-2.5 py-1.5 text-xs leading-snug text-muted-foreground">
                  {plan.ok ? `Drop to: ${plan.hint}` : plan.reason}
                </p>
              )}
              {items.length === 0 ? (
                <p className="px-3 pt-6 pb-8 text-center text-[13px] text-muted-foreground">
                  {EMPTY_COLUMN[column.key]}
                </p>
              ) : (
                <ul className="scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                  {items.map((incident) => (
                    <BoardCard
                      key={incident.id}
                      incident={incident}
                      units={units}
                      column={column.key}
                      can={can}
                      dragging={
                        drag?.kind === "incident" && drag.id === incident.id
                      }
                      acceptsUnit={drag?.kind === "unit" && isActive(incident)}
                      onOpen={() => setSelectedId(incident.id)}
                      onMove={(to) => move(incident, to)}
                      onDragStart={() =>
                        setDrag({ kind: "incident", id: incident.id })
                      }
                      onDragEnd={() => {
                        setDrag(null);
                        setOverKey(null);
                      }}
                      onUnitDrop={(unitId) => dropUnit(incident, unitId)}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <AssignUnitDialog
        incidentId={assignId}
        open={assignFor !== null}
        onOpenChange={(open) => !open && setAssignFor(null)}
      />
      <ResolveIncidentDialog
        incidentId={resolveId}
        open={resolveFor !== null}
        onOpenChange={(open) => !open && setResolveFor(null)}
      />
      <DetailPanel
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        inline={false}
        label={shownId ? `Incident ${shownId}` : "Incident details"}
      >
        <IncidentInspector
          incidentId={shownId}
          onClose={() => setSelectedId(null)}
        />
      </DetailPanel>
    </div>
  );
}
