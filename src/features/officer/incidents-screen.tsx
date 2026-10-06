"use client";

import { ArrowRight, ClipboardList, ListChecks, MapPin } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { OpsMap } from "@/components/shared/ops-map";
import { Field } from "@/components/shared/page";
import {
  BlankState,
  EmptyState,
  RestrictedState,
} from "@/components/shared/states";
import {
  OfficerStageChip,
  PriorityBadge,
  StatusChip,
} from "@/components/shared/status-chips";
import { Timeline } from "@/components/shared/timeline";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { OFFICER_STAGE_META, STATUS_META } from "@/config/incident";
import { useIncident, useUnits } from "@/hooks/use-demo-data";
import { useIsMd } from "@/hooks/use-mounted";
import { useT } from "@/hooks/use-t";
import type { TKey } from "@/lib/i18n";
import { formatDateTime, formatKm, formatTime } from "@/lib/format";
import { etaMinutesBetween, roadKm } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { Assignment, Incident, LatLng, Unit } from "@/types";
import { IncidentIntel } from "./incident-intel";
import {
  CardHeading,
  NoUnitState,
  OfficerCard,
  OfficerIncidentRow,
  ResponsiveSheet,
} from "./officer-ui";
import {
  assignmentOf,
  isOpenIncident,
  useNearbyIncidents,
  useOfficer,
  useUnitPosition,
} from "./use-officer";

type Filter = "active" | "completed" | "nearby";

const FILTERS: { key: Filter; labelKey: TKey }[] = [
  { key: "active", labelKey: "officer.filter.active" },
  { key: "completed", labelKey: "officer.filter.completed" },
  { key: "nearby", labelKey: "officer.filter.nearby" },
];

const parseFilter = (value: string | null): Filter =>
  value === "completed" || value === "nearby" ? value : "active";

/**
 * The control room's status and the officer's own stage. They often read the same ("En route"),
 * so the stage is only drawn when it adds something.
 */
function StatusAndStage({
  incident,
  assignment,
}: {
  incident: Incident;
  assignment: Assignment;
}) {
  const same =
    STATUS_META[incident.status].label ===
    OFFICER_STAGE_META[assignment.stage].label;
  return (
    <>
      <StatusChip status={incident.status} />
      {!same && <OfficerStageChip stage={assignment.stage} />}
    </>
  );
}

/* ───────────────────────── Detail: an incident this unit is on ───────────────────────── */

function MyIncidentDetail({
  incident,
  assignment,
}: {
  incident: Incident;
  assignment: Assignment;
}) {
  const t = useT();
  const open = isOpenIncident(incident);
  const reportDue =
    incident.status === "resolved" && assignment.stage === "report_pending";
  const stamp = (at: number | undefined) => (at ? formatTime(at) : "—");

  return (
    <div className="space-y-4">
      <OfficerCard className="p-4" aria-labelledby={`inc-${incident.id}`}>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={incident.priority} variant="soft" />
          <StatusAndStage incident={incident} assignment={assignment} />
        </div>
        <h2
          id={`inc-${incident.id}`}
          className="mt-3 flex items-start gap-2 text-xl leading-snug font-semibold tracking-tight"
        >
          <CategoryIcon
            categoryId={incident.categoryId}
            className="mt-1 size-5 text-muted-foreground"
          />
          {incident.title}
        </h2>
        <p className="tnum mt-1 truncate font-mono text-xs text-muted-foreground">
          {incident.id}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-3 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Raised">
            <span className="tnum" title={formatDateTime(incident.createdAt)}>
              {stamp(incident.createdAt)}
            </span>
          </Field>
          <Field label="Assigned to you">
            <span className="tnum">{stamp(assignment.assignedAt)}</span>
          </Field>
          <Field label="Arrived">
            <span className="tnum">{stamp(incident.arrivedAt)}</span>
          </Field>
          <Field label="Resolved">
            <span className="tnum">{stamp(incident.resolvedAt)}</span>
          </Field>
        </dl>
        {(incident.resolution ?? incident.cancelReason) && (
          <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-sm leading-relaxed">
            <span className="block text-xs text-muted-foreground">
              {incident.status === "cancelled" ? "Cancelled" : "Outcome"}
            </span>
            {incident.resolution ?? incident.cancelReason}
          </p>
        )}
        {open && (
          <Button asChild size="xl" className="mt-4 w-full">
            <Link href="/officer/assignment">
              {assignment.response === "pending"
                ? t("officer.viewAssignment")
                : t("officer.continue")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
        {reportDue && (
          <Button asChild size="xl" className="mt-4 w-full">
            <Link href={`/officer/reports?id=${incident.id}`}>
              <ClipboardList aria-hidden />
              {t("officer.writeReport")}
            </Link>
          </Button>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          This record is read-only here.
          {open && " Updates are made from the response screen."}
        </p>
      </OfficerCard>
      <IncidentIntel incident={incident} className="2xl:grid-cols-2" />
    </div>
  );
}

/* ───────────────────────── Detail: someone else's incident ───────────────────────── */

function NearbyIncidentDetail({
  incident,
  origin,
}: {
  incident: Incident;
  origin: LatLng;
}) {
  const t = useT();
  const units = useUnits();
  const { lat, lng } = incident.location;
  const callSigns = incident.assignments
    .filter((a) => a.response !== "rejected")
    .map((a) => units.find((u) => u.id === a.unitId)?.callSign)
    .filter(Boolean);
  const incidents = useMemo(() => [incident], [incident]);
  const focus = useMemo(
    () => [
      { lat: origin.lat, lng: origin.lng },
      { lat, lng },
    ],
    [origin.lat, origin.lng, lat, lng],
  );

  return (
    <div className="space-y-4">
      <OfficerCard
        className="overflow-hidden"
        aria-labelledby={`inc-${incident.id}`}
      >
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={incident.priority} variant="soft" />
            <StatusChip status={incident.status} />
          </div>
          <h2
            id={`inc-${incident.id}`}
            className="mt-3 flex items-start gap-2 text-xl leading-snug font-semibold tracking-tight"
          >
            <CategoryIcon
              categoryId={incident.categoryId}
              className="mt-1 size-5 text-muted-foreground"
            />
            {incident.title}
          </h2>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{incident.location.area}</span>
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-3">
            <Field label={t("officer.distance")}>
              <span className="tnum">
                {formatKm(roadKm(origin, incident.location))}
              </span>
            </Field>
            <Field label="Drive time from you">
              <span className="tnum">
                about {etaMinutesBetween(origin, incident.location)} min
              </span>
            </Field>
            <Field label="Raised">
              <RelativeTime at={incident.createdAt} />
            </Field>
            <Field label="Units assigned">
              {callSigns.length > 0 ? (
                <span className="tnum font-mono text-[13px]">
                  {callSigns.join(", ")}
                </span>
              ) : (
                "None yet"
              )}
            </Field>
          </dl>
        </div>
        <OpsMap
          className="h-44 border-t border-border/70"
          me={origin}
          incidents={incidents}
          focus={focus}
          interactive={false}
          label={`${incident.title} in ${incident.location.area}, relative to your position`}
        />
      </OfficerCard>

      <OfficerCard className="p-4" aria-labelledby={`st-${incident.id}`}>
        <CardHeading
          id={`st-${incident.id}`}
          title="Response status"
          description="Status changes only. Oldest first."
        />
        <Timeline
          events={incident.timeline}
          citizenView
          dense
          className="mt-4"
        />
      </OfficerCard>

      <OfficerCard>
        <RestrictedState
          compact
          title="Reduced view"
          description="Your unit is not assigned to this incident. The description, reporter, messages, evidence and notes open only for the assigned unit."
        />
      </OfficerCard>
    </div>
  );
}

/* ───────────────────────── Screen ───────────────────────── */

function IncidentsContent({ unit, unitId }: { unit: Unit; unitId: string }) {
  const t = useT();
  const params = useSearchParams();
  const isMd = useIsMd();
  const { work } = useOfficer();
  const live = useUnitPosition(unit);
  const position = live ?? unit.position;
  const nearby = useNearbyIncidents(position, unitId);
  const [filter, setFilter] = useState<Filter>(() =>
    parseFilter(params.get("filter")),
  );
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    params.get("id"),
  );
  // Phones: the sheet closes without clearing the record, so it does not blank while sliding away.
  const [sheetOpen, setSheetOpen] = useState(() => Boolean(params.get("id")));

  const rows = useMemo(() => {
    if (filter === "nearby")
      return nearby.map((n) => ({ incident: n.incident, km: n.km }));
    return work.history
      .filter((i) => isOpenIncident(i) === (filter === "active"))
      .map((incident) => ({ incident, km: undefined as number | undefined }));
  }, [filter, nearby, work.history]);

  const counts: Record<Filter, number> = {
    active: work.history.filter(isOpenIncident).length,
    completed: work.history.filter((i) => !isOpenIncident(i)).length,
    nearby: nearby.length,
  };

  // Tablets and up always show a record; phones open one on request.
  const shownId = selectedId ?? (isMd ? (rows[0]?.incident.id ?? null) : null);
  const found = useIncident(shownId);
  const selected = found?.sync === "synced" ? found : undefined;
  const selectedAssignment = selected
    ? assignmentOf(selected, unitId)
    : undefined;

  const detail = selected ? (
    selectedAssignment ? (
      <MyIncidentDetail
        key={selected.id}
        incident={selected}
        assignment={selectedAssignment}
      />
    ) : (
      <NearbyIncidentDetail
        key={selected.id}
        incident={selected}
        origin={position}
      />
    )
  ) : null;

  return (
    <div className="flex h-full min-h-0">
      <section
        aria-labelledby="incidents-title"
        className="flex min-w-0 flex-1 flex-col md:w-[20rem] md:flex-none md:border-r md:border-border lg:w-[22rem] xl:w-[26rem]"
      >
        <header className="shrink-0 px-4 pt-5 pb-3 sm:px-6 md:px-5">
          <h1
            id="incidents-title"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("nav.incidents")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "nearby"
              ? "Open incidents around your unit, nearest first."
              : t("officer.myIncidents")}
          </p>
          <div
            role="group"
            aria-label="Filter incidents"
            className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
          >
            {FILTERS.map(({ key, labelKey }) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => {
                  setFilter(key);
                  setSelectedId(null);
                  setSheetOpen(false);
                }}
                className={cn(
                  "flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-1.5 text-sm font-medium transition-colors",
                  filter === key
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="truncate">{t(labelKey)}</span>
                <span className="tnum text-xs text-muted-foreground">
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
        </header>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6 md:px-5">
          {rows.length === 0 ? (
            filter === "active" ? (
              <EmptyState
                title="No active incidents"
                description="Nothing is assigned to your unit right now."
              />
            ) : filter === "completed" ? (
              <BlankState
                icon={ListChecks}
                title="No completed incidents yet"
                description="Incidents you have responded to appear here with their record."
              />
            ) : (
              <EmptyState
                title="Nothing open nearby"
                description="There are no other open incidents right now."
              />
            )
          ) : (
            <ul className="grid gap-2.5">
              {rows.map(({ incident, km }) => {
                const assignment = assignmentOf(incident, unitId);
                return (
                  <li key={incident.id}>
                    <OfficerIncidentRow
                      incident={incident}
                      km={km}
                      selected={isMd && incident.id === shownId}
                      onSelect={(i) => {
                        setSelectedId(i.id);
                        setSheetOpen(true);
                      }}
                      trailing={
                        assignment ? (
                          <span className="flex flex-wrap justify-end gap-1.5">
                            <StatusAndStage
                              incident={incident}
                              assignment={assignment}
                            />
                          </span>
                        ) : undefined
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {isMd ? (
        <section
          aria-label="Incident record"
          className="scroll-thin min-w-0 flex-1 overflow-y-auto"
        >
          {detail ? (
            <div className="mx-auto w-full max-w-5xl p-5">{detail}</div>
          ) : (
            <div className="grid h-full place-items-center">
              <BlankState
                icon={ListChecks}
                title="Select an incident"
                description="Its record, intelligence and timeline open here."
              />
            </div>
          )}
        </section>
      ) : (
        <ResponsiveSheet
          open={sheetOpen && Boolean(selected)}
          onOpenChange={setSheetOpen}
          title={selected?.title ?? "Incident"}
          description={
            <span className="tnum font-mono text-xs">{selected?.id}</span>
          }
          bodyClassName="scroll-thin block overflow-y-auto bg-background p-4"
        >
          {detail}
        </ResponsiveSheet>
      )}
    </div>
  );
}

/** `/officer/incidents` — the unit's own incidents and, for awareness, what is open nearby. */
export function OfficerIncidentsScreen() {
  const { unit, unitId } = useOfficer();
  if (!unit || !unitId) return <NoUnitState />;
  return <IncidentsContent unit={unit} unitId={unitId} />;
}
