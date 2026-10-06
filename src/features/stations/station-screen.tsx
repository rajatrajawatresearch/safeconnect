"use client";

import {
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  FileClock,
  Lock,
  Siren,
  TriangleAlert,
  Truck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/shared/page";
import { BlankState, EmptyState } from "@/components/shared/states";
import { StatCard } from "@/components/shared/stat-card";
import {
  PriorityBadge,
  ToneChip,
  UnitStatusChip,
} from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UNIT_STATUS_META } from "@/config/incident";
import { STATIONS, districtById, stationById } from "@/data/demo/geo";
import { OFFICERS } from "@/data/demo/people";
import { IncidentLink } from "@/features/evidence/incident-link";
import { useUrlParam } from "@/features/evidence/use-url-param";
import { useIncidents, useOpsStats, useUnits } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import type { Incident, Officer, Station, Unit } from "@/types";
import { ResponseTargets } from "./response-targets";
import { ReviewDialog } from "./review-dialog";

const DEFAULT_STATION = "st-nav";

function StationSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Station"
        className="w-full bg-card data-[size=default]:h-9 sm:w-64"
      >
        <SelectValue placeholder="Choose a station" />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {STATIONS.map((station) => (
          <SelectItem key={station.id} value={station.id}>
            {station.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DutyChip({ onDuty }: { onDuty: boolean }) {
  return (
    <ToneChip tone={onDuty ? "resolved" : "neutral"} dot>
      {onDuty ? "On duty" : "Off duty"}
    </ToneChip>
  );
}

function UnitRef({ unit }: { unit: Unit | undefined }) {
  if (!unit) return <span className="text-muted-foreground">Station duty</span>;
  return (
    <Link
      href={`/control/units?id=${unit.id}`}
      className="tnum rounded font-mono text-[13px] text-primary hover:underline"
    >
      {unit.callSign}
    </Link>
  );
}

function OfficersPanel({
  officers,
  units,
}: {
  officers: Officer[];
  units: Unit[];
}) {
  const unitOf = (officer: Officer) =>
    officer.unitId ? units.find((u) => u.id === officer.unitId) : undefined;
  const onDuty = officers.filter((o) => o.onDuty).length;

  return (
    <Panel className="@container overflow-hidden">
      <PanelHeader
        title="Officers"
        description={`${onDuty} of ${officers.length} on duty this shift`}
      />
      {officers.length === 0 ? (
        <BlankState
          compact
          title="No officers are posted to this station"
          description="The demonstration roster covers only some stations."
        />
      ) : (
        <>
          <div className="hidden @xl:block">
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Officer</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Duty</TableHead>
                  <TableHead className="pr-4">Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {officers.map((officer) => (
                  <TableRow key={officer.id}>
                    <TableCell className="pl-4">
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground"
                        >
                          {officer.initials}
                        </span>
                        <span className="font-medium">{officer.name}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {officer.rank}
                    </TableCell>
                    <TableCell className="tnum font-mono text-xs">
                      {officer.badgeNo}
                    </TableCell>
                    <TableCell>
                      <DutyChip onDuty={officer.onDuty} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <UnitRef unit={unitOf(officer)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-border/70 @xl:hidden">
            {officers.map((officer) => (
              <li key={officer.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
                >
                  {officer.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">
                    {officer.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {officer.rank} ·{" "}
                    <span className="tnum font-mono">{officer.badgeNo}</span>
                  </p>
                  <p className="mt-1 text-xs">
                    <UnitRef unit={unitOf(officer)} />
                  </p>
                </div>
                <DutyChip onDuty={officer.onDuty} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function UnitsPanel({ units }: { units: Unit[] }) {
  const available = units.filter((u) => u.status === "available").length;
  const off = units.filter(
    (u) => u.status === "off_duty" || u.status === "unavailable",
  ).length;
  const engaged = units.length - available - off;
  const segments = [
    { key: "available", count: available, className: "bg-resolved" },
    { key: "engaged", count: engaged, className: "bg-high" },
    { key: "off", count: off, className: "bg-subtle" },
  ].filter((s) => s.count > 0);

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Unit availability"
        description={`${available} of ${units.length} available`}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/control/units">
              All units <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        }
      />
      {units.length === 0 ? (
        <BlankState
          compact
          icon={Truck}
          title="No units are based at this station"
        />
      ) : (
        <>
          <div className="px-4 pt-3.5">
            <div
              role="img"
              aria-label={`${available} available, ${engaged} engaged, ${off} off duty or unavailable`}
              className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted"
            >
              {segments.map((segment) => (
                <span
                  key={segment.key}
                  className={cn("h-full rounded-full", segment.className)}
                  style={{ flexGrow: segment.count }}
                />
              ))}
            </div>
            <p className="tnum mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{available} available</span>
              <span>{engaged} engaged</span>
              <span>{off} off duty or unavailable</span>
            </p>
          </div>
          <ul className="mt-2 divide-y divide-border/70">
            {units.map((unit) => {
              const officer = OFFICERS.find((o) => o.id === unit.officerId);
              return (
                <li key={unit.id}>
                  <Link
                    href={`/control/units?id=${unit.id}`}
                    aria-label={`Unit ${unit.callSign}, ${UNIT_STATUS_META[unit.status].label}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 focus-visible:outline-offset-[-2px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="tnum font-mono text-[13px] font-medium">
                        {unit.callSign}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {unit.vehicle}
                        {officer && ` · ${officer.name}`}
                      </p>
                      {unit.currentIncidentId && (
                        <p className="tnum truncate font-mono text-[11px] text-subtle">
                          {unit.currentIncidentId}
                        </p>
                      )}
                    </div>
                    <UnitStatusChip status={unit.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}

function ReviewQueue({
  ready,
  waiting,
}: {
  ready: Incident[];
  waiting: Incident[];
}) {
  const { can } = useSession();
  const units = useUnits();
  const [reviewing, setReviewing] = useState<string | null>(null);
  const canClose = can("incident.resolve");
  const target = reviewing ? ready.find((i) => i.id === reviewing) : undefined;
  const callSigns = (incident: Incident) =>
    incident.assignments
      .filter((a) => a.response !== "rejected")
      .map((a) => units.find((u) => u.id === a.unitId)?.callSign)
      .filter(Boolean)
      .join(", ");

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Supervisor review queue"
        description="Resolved incidents whose response report has been submitted and is waiting to be closed"
      />
      {ready.length === 0 ? (
        <EmptyState
          compact
          icon={ClipboardCheck}
          title="No reports are waiting for review"
          description={
            waiting.length > 0
              ? "Reports appear here once the responding officer submits them."
              : "Every resolved incident at this station has been reviewed."
          }
        />
      ) : (
        <ul className="divide-y divide-border/70">
          {ready.map((incident) => (
            <li
              key={incident.id}
              className="flex flex-wrap items-start gap-x-4 gap-y-3 px-4 py-3.5"
            >
              <div className="min-w-0 flex-1 basis-64">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge
                    priority={incident.priority}
                    variant="outline"
                  />
                  <p className="text-sm font-semibold">{incident.title}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <Link
                    href={`/control/incidents?id=${incident.id}`}
                    className="tnum rounded font-mono text-primary hover:underline"
                  >
                    {incident.id}
                  </Link>{" "}
                  · {incident.location.area}
                  {callSigns(incident) && ` · ${callSigns(incident)}`}
                  {incident.resolvedAt && (
                    <>
                      {" "}
                      · resolved{" "}
                      <RelativeTime at={incident.resolvedAt} friendly />
                    </>
                  )}
                </p>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                  {incident.handoff.reportDraft ?? incident.resolution}
                </p>
              </div>
              <Button
                size="lg"
                disabled={!canClose}
                onClick={() => setReviewing(incident.id)}
              >
                <ClipboardCheck aria-hidden /> Review and close
              </Button>
            </li>
          ))}
        </ul>
      )}
      {ready.length > 0 && !canClose && (
        <p className="flex items-start gap-1.5 border-t border-border/70 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Your role does not include resolving and closing incidents. A station
          supervisor reviews these.
        </p>
      )}

      {waiting.length > 0 && (
        <div className="border-t border-border/70 bg-inset px-4 py-3">
          <h3 className="text-xs font-medium text-muted-foreground">
            Waiting for the officer&apos;s report
          </h3>
          <ul className="mt-2 space-y-1.5">
            {waiting.map((incident) => (
              <li
                key={incident.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[13px]"
              >
                <span className="min-w-0">
                  <Link
                    href={`/control/incidents?id=${incident.id}`}
                    className="tnum rounded font-mono text-xs text-primary hover:underline"
                  >
                    {incident.id}
                  </Link>{" "}
                  <span className="font-medium">{incident.title}</span>
                  {callSigns(incident) && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {callSigns(incident)}
                    </span>
                  )}
                </span>
                {incident.resolvedAt && (
                  <span className="text-xs text-muted-foreground">
                    resolved <RelativeTime at={incident.resolvedAt} friendly />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {target && (
        <ReviewDialog incident={target} onClose={() => setReviewing(null)} />
      )}
    </Panel>
  );
}

function StationDashboard({
  station,
  onChange,
}: {
  station: Station;
  onChange: (id: string) => void;
}) {
  const { persona } = useSession();
  const stats = useOpsStats(station.id);
  const incidents = useIncidents();
  const units = useUnits();
  const slaPolicies = useDemoStore((s) => s.slaPolicies);

  const stationIncidents = useMemo(
    () =>
      incidents
        .filter((i) => i.location.stationId === station.id)
        .sort((a, b) => b.createdAt - a.createdAt),
    [incidents, station.id],
  );
  const stationUnits = useMemo(
    () => units.filter((u) => u.stationId === station.id),
    [units, station.id],
  );
  const officers = useMemo(
    () =>
      OFFICERS.filter((o) => o.stationId === station.id).sort(
        (a, b) => Number(b.onDuty) - Number(a.onDuty),
      ),
    [station.id],
  );
  const reportsDue = stationIncidents.filter(
    (i) => i.status === "resolved" && i.handoff.reportStatus === "draft",
  );
  const reviewReady = stationIncidents.filter(
    (i) => i.status === "resolved" && i.handoff.reportStatus === "submitted",
  );
  const onDuty = officers.filter((o) => o.onDuty).length;
  const district = districtById(station.districtId);
  const own = persona.stationId === station.id;

  return (
    <PageContainer width="full">
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {district?.name ?? "District"} · station code{" "}
              <span className="font-mono">{station.code}</span>
            </span>
            {own && (
              <ToneChip tone="normal" variant="outline">
                Your station
              </ToneChip>
            )}
          </span>
        }
        title={`${station.name} — Demo`}
        description={`In charge: ${station.inChargeName} · ${station.area} · ${station.phoneMasked}`}
        actions={<StationSelect value={station.id} onChange={onChange} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="On-duty officers"
          value={onDuty}
          unit={`of ${officers.length}`}
          icon={UserCheck}
          hint="Posted to this station"
          className="col-span-2 sm:col-span-1"
        />
        <StatCard
          label="Available units"
          value={stats.unitsAvailable}
          unit={`of ${stats.unitsTotal}`}
          icon={Truck}
          tone={
            stats.unitsTotal > 0 && stats.unitsAvailable === 0
              ? "high"
              : undefined
          }
          hint={`${stats.unitsEnRoute} en route · ${stats.unitsOnScene} on scene`}
        />
        <StatCard
          label="Active incidents"
          value={stats.activeEmergencies}
          icon={Siren}
          tone={stats.critical > 0 ? "critical" : undefined}
          hint={`${stats.critical} critical · ${stats.unassigned} unassigned`}
        />
        <StatCard
          label="Pending reports"
          value={reportsDue.length}
          icon={FileClock}
          tone={reportsDue.length > 0 ? "medium" : undefined}
          hint="Officer report due"
        />
        <StatCard
          label="Escalations"
          value={stats.escalationsOpen}
          icon={TriangleAlert}
          tone={stats.escalationsOpen > 0 ? "high" : undefined}
          hint={
            stats.escalationsOpen > 0 ? (
              <Link
                href="/control/escalations"
                className="rounded text-primary hover:underline"
              >
                Open and waiting
              </Link>
            ) : (
              "None open"
            )
          }
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="min-w-0 space-y-5 xl:col-span-2">
          <ReviewQueue ready={reviewReady} waiting={reportsDue} />
          <OfficersPanel officers={officers} units={units} />
          <ResponseTargets
            incidents={stationIncidents}
            policies={slaPolicies}
          />
        </div>
        <div className="min-w-0 space-y-5">
          <UnitsPanel units={stationUnits} />
          <Panel>
            <PanelHeader
              title="Recent incidents"
              description={`${stationIncidents.length} in this station's area`}
              actions={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/control/incidents">
                    Live queue <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
              }
            />
            {stationIncidents.length === 0 ? (
              <EmptyState
                compact
                title="No incidents in this station's area"
                description="New incidents appear here as soon as they are raised."
              />
            ) : (
              <ul className="space-y-2 p-3">
                {stationIncidents.slice(0, 6).map((incident) => (
                  <li key={incident.id}>
                    <IncidentLink incident={incident} showTimer />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </PageContainer>
  );
}

export function StationScreen() {
  const { persona } = useSession();
  const [paramId, setParamId] = useUrlParam("id");
  const stationId = paramId ?? persona.stationId ?? DEFAULT_STATION;
  const station = stationById(stationId);

  if (!station) {
    return (
      <PageContainer>
        <PageHeader
          title="Station dashboard"
          actions={<StationSelect value="" onChange={setParamId} />}
        />
        <Panel>
          <BlankState
            icon={Building2}
            title="No station has this reference"
            description="Choose a station from the list to open its dashboard."
            action={
              <Button
                variant="outline"
                onClick={() => setParamId(persona.stationId ?? DEFAULT_STATION)}
              >
                Open my station
              </Button>
            }
          />
        </Panel>
      </PageContainer>
    );
  }
  return <StationDashboard station={station} onChange={setParamId} />;
}
