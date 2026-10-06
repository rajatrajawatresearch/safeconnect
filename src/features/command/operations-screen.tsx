"use client";

import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  FolderLock,
  Map as MapIcon,
  Radio,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { IncidentRow } from "@/components/shared/incident-row";
import {
  MapLegend,
  OpsMap,
  type MapSelection,
} from "@/components/shared/ops-map";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/shared/page";
import { BlankState, EmptyState } from "@/components/shared/states";
import {
  PriorityBadge,
  StatusChip,
  ToneChip,
} from "@/components/shared/status-chips";
import { ResponseTimer } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Tone } from "@/config/incident";
import { STATIONS } from "@/data/demo/geo";
import { InlineBar } from "@/features/analytics/charts";
import { SegmentedControl } from "@/features/analytics/controls";
import { formatDecimal, sum } from "@/features/analytics/format";
import { useDensity } from "@/features/analytics/use-overview";
import {
  useActiveIncidents,
  useOpsStats,
  useUnits,
} from "@/hooks/use-demo-data";
import { useIsMd } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Connectivity, Incident, Integration } from "@/types";
import {
  EscalationLevelChip,
  incidentHref,
  MapSelectionCard,
  PanelLink,
  stationHref,
} from "./command-ui";
import { useCommandScope } from "./use-command-scope";
import { useStationOps, type StationOps } from "./use-station-ops";

/* ───────────────────────── Major incidents ───────────────────────── */

type MajorFilter = "all" | "critical" | "unassigned";

const awaitingUnit = (incident: Incident) =>
  incident.status === "new" || incident.status === "acknowledged";

function MajorIncidentsPanel({ className }: { className?: string }) {
  const active = useActiveIncidents();
  const units = useUnits();
  const isMd = useIsMd();
  const [filter, setFilter] = useState<MajorFilter>("all");

  const major = useMemo(
    () => active.filter((i) => i.priority === "P1" || i.priority === "P2"),
    [active],
  );
  const counts = {
    all: major.length,
    critical: major.filter((i) => i.priority === "P1").length,
    unassigned: major.filter(awaitingUnit).length,
  };
  const rows =
    filter === "critical"
      ? major.filter((i) => i.priority === "P1")
      : filter === "unassigned"
        ? major.filter(awaitingUnit)
        : major;

  const callSigns = (incident: Incident) =>
    incident.assignments
      .filter((a) => a.response !== "rejected")
      .map((a) => units.find((u) => u.id === a.unitId)?.callSign)
      .filter((sign): sign is string => Boolean(sign));

  return (
    <Panel className={cn("flex min-w-0 flex-col", className)}>
      <PanelHeader
        title="Major incidents"
        description="Open critical (P1) and high (P2) incidents, live"
        actions={<PanelLink href="/control/incidents">Queue</PanelLink>}
      />
      <div className="border-b border-border/70 px-4 py-2.5">
        <SegmentedControl
          label="Filter major incidents"
          value={filter}
          onChange={setFilter}
          className="w-full sm:w-fit"
          options={[
            { value: "all", label: `All (${counts.all})` },
            { value: "critical", label: `Critical (${counts.critical})` },
            {
              value: "unassigned",
              label: `Awaiting unit (${counts.unassigned})`,
            },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={
            filter === "unassigned"
              ? "Every major incident has a unit"
              : filter === "critical"
                ? "No critical incidents open"
                : "No major incidents open"
          }
          description="Critical and high priority incidents appear here as soon as they reach the control room."
        />
      ) : isMd ? (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Open critical and high priority incidents with status, assigned
              units, escalation level and elapsed time
            </caption>
            <thead>
              <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">
                  Priority
                </th>
                <th scope="col" className="w-full px-2 py-2 font-medium">
                  Incident
                </th>
                <th
                  scope="col"
                  className="px-2 py-2 font-medium whitespace-nowrap"
                >
                  Status and escalation
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  Units
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Elapsed
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((incident) => {
                const signs = callSigns(incident);
                return (
                  <tr
                    key={incident.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-2.5 align-top">
                      <PriorityBadge priority={incident.priority} />
                    </td>
                    <th
                      scope="row"
                      className="w-full max-w-0 px-2 py-2.5 text-left align-top font-normal"
                    >
                      <Link
                        href={incidentHref(incident.id)}
                        className="block truncate font-medium hover:underline"
                      >
                        {incident.title}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">
                        {incident.location.area} ·{" "}
                        <span className="font-mono">{incident.id}</span>
                      </span>
                    </th>
                    <td className="px-2 py-2.5 align-top">
                      <span className="flex flex-col items-start gap-1.5">
                        <StatusChip status={incident.status} />
                        {incident.escalationLevel > 0 ? (
                          <EscalationLevelChip
                            level={incident.escalationLevel as 1 | 2 | 3}
                          />
                        ) : (
                          <span className="text-xs whitespace-nowrap text-muted-foreground">
                            Not escalated
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 align-top whitespace-nowrap">
                      {signs.length > 0 ? (
                        <span className="flex flex-col font-mono text-xs leading-5">
                          {signs.map((sign) => (
                            <span key={sign}>{sign}</span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs text-high-fg">
                          None assigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right align-top">
                      <ResponseTimer
                        since={incident.createdAt}
                        priority={incident.priority}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="space-y-2 p-3">
          {rows.map((incident) => (
            <li key={incident.id}>
              <Link
                href={incidentHref(incident.id)}
                className="block rounded-xl"
              >
                <IncidentRow incident={incident} showTimer />
              </Link>
              {incident.escalationLevel > 0 && (
                <p className="mt-1.5 flex items-center gap-2 px-1 text-xs text-muted-foreground">
                  Escalated to
                  <EscalationLevelChip
                    level={incident.escalationLevel as 1 | 2 | 3}
                  />
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ───────────────────────── Operations map with the density layer ───────────────────────── */

function OperationsMapPanel({
  districtName,
  className,
}: {
  districtName: string;
  className?: string;
}) {
  const incidents = useActiveIncidents();
  const units = useUnits();
  const switchId = useId();
  const [layerOn, setLayerOn] = useState(false);
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const { density, load } = useDensity(layerOn);
  const showing = layerOn && load.status === "ready" && density !== undefined;

  return (
    <Panel className={cn("flex min-w-0 flex-col overflow-hidden", className)}>
      <PanelHeader
        title="Operations map"
        description={`${districtName}: open incidents, units and stations, live`}
        actions={<PanelLink href="/control/map">Live map</PanelLink>}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-border/70 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Switch
            id={switchId}
            checked={layerOn}
            onCheckedChange={setLayerOn}
          />
          <Label htmlFor={switchId} className="text-sm font-medium">
            Historical incident density
          </Label>
        </div>
        <p
          role="status"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          {!layerOn && "Layer off"}
          {layerOn && load.status === "pending" && "Loading layer…"}
          {showing && `${density.length} areas · last 30 days`}
          {layerOn && load.status === "error" && (
            <>
              {load.offline
                ? "Connection interrupted. The layer loads when it returns."
                : "The layer did not load."}
              <Button variant="outline" size="xs" onClick={load.retry}>
                <RefreshCw aria-hidden /> Try again
              </Button>
            </>
          )}
        </p>
      </div>
      <div className="relative min-h-80 flex-1 sm:min-h-[24rem]">
        <OpsMap
          incidents={incidents}
          units={units}
          stations={STATIONS}
          density={showing ? density : undefined}
          selected={selection}
          onSelect={setSelection}
          label={`${districtName} operations map${showing ? " with the historical incident density layer" : ""}`}
          className="absolute inset-0"
        />
        <MapSelectionCard
          selection={selection}
          onClear={() => setSelection(null)}
          className="absolute inset-x-3 top-3 z-10 sm:right-auto sm:w-80"
        />
      </div>
      <div className="space-y-2 border-t border-border/70 px-4 py-2.5">
        <MapLegend />
        {layerOn && (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <span
              aria-hidden
              className="mt-0.5 size-3 shrink-0 rounded-full bg-primary/25"
            />
            <span>
              <span className="font-medium text-foreground">
                Historical incident density
              </span>{" "}
              is an aggregate of past incidents by place over the last 30 days.
              It describes locations, never people or communities, and it is not
              a prediction.
            </span>
          </p>
        )}
      </div>
    </Panel>
  );
}

/* ───────────────────────── Cross-station operations ───────────────────────── */

const responseLabel = (minutes: number | null) =>
  minutes === null ? "—" : `${formatDecimal(minutes)} min`;

function StationCard({
  row,
  maxActive,
}: {
  row: StationOps;
  maxActive: number;
}) {
  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <Link
          href={stationHref(row.station.id)}
          className="text-sm font-semibold hover:underline"
        >
          {row.station.name}
        </Link>
        {row.escalationsOpen > 0 && (
          <ToneChip tone="high">
            <span className="tnum">{row.escalationsOpen}</span> escalated
          </ToneChip>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Active</dt>
          <dd className="tnum font-semibold">{row.active}</dd>
          <InlineBar value={row.active} max={maxActive} className="mt-1" />
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Critical</dt>
          <dd
            className={cn(
              "tnum font-semibold",
              row.critical > 0 && "text-critical-fg",
            )}
          >
            {row.critical}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Units available</dt>
          <dd className="tnum font-semibold">
            {row.unitsAvailable} of {row.unitsTotal}
          </dd>
          <InlineBar
            value={row.unitsAvailable}
            max={row.unitsTotal}
            className="mt-1"
          />
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Average response</dt>
          <dd className="tnum font-semibold">
            {responseLabel(row.avgResponseMin)}
          </dd>
        </div>
      </dl>
    </li>
  );
}

function CrossStationPanel({
  districtId,
  districtName,
  className,
}: {
  districtId: string;
  districtName: string;
  className?: string;
}) {
  const stations = useStationOps(districtId);
  const stats = useOpsStats();
  const isMd = useIsMd();
  const rows = useMemo(
    () =>
      [...stations].sort(
        (a, b) =>
          b.active - a.active ||
          b.critical - a.critical ||
          a.station.name.localeCompare(b.station.name),
      ),
    [stations],
  );
  const maxActive = Math.max(1, ...rows.map((r) => r.active));

  return (
    <Panel className={cn("flex min-w-0 flex-col", className)}>
      <PanelHeader
        title="Cross-station operations"
        description={`${rows.length} stations in ${districtName}, computed from live incidents and units`}
        actions={<PanelLink href="/control/stations">Stations</PanelLink>}
      />
      {rows.length === 0 ? (
        <BlankState
          title="No stations in this district"
          description="Stations appear here once they are added to the organisation."
        />
      ) : isMd ? (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Live operations by station: active and critical incidents, unit
              availability, average response and open escalations
            </caption>
            <thead>
              <tr className="border-b border-border/70 text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 text-left font-medium">
                  Station
                </th>
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  Active
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Critical
                </th>
                <th
                  scope="col"
                  className="px-2 py-2 text-left font-medium whitespace-nowrap"
                >
                  Units available
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Average response
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Open escalations
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.station.id}
                  className="border-b border-border/60 hover:bg-muted/40"
                >
                  <th
                    scope="row"
                    className="w-full max-w-0 min-w-44 px-4 py-2.5 text-left font-normal"
                  >
                    <Link
                      href={stationHref(row.station.id)}
                      className="block truncate font-medium hover:underline"
                    >
                      {row.station.name}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="font-mono">{row.station.code}</span> ·{" "}
                      {row.station.inChargeName}
                    </span>
                  </th>
                  <td className="px-2 py-2.5">
                    <span className="tnum font-medium">{row.active}</span>
                    <InlineBar
                      value={row.active}
                      max={maxActive}
                      className="mt-1.5 w-20"
                    />
                  </td>
                  <td
                    className={cn(
                      "tnum px-2 py-2.5 text-right",
                      row.critical > 0
                        ? "font-semibold text-critical-fg"
                        : "text-muted-foreground",
                    )}
                  >
                    {row.critical}
                  </td>
                  <td className="px-2 py-2.5">
                    <span className="tnum font-medium">
                      {row.unitsAvailable}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        of {row.unitsTotal}
                      </span>
                    </span>
                    <InlineBar
                      value={row.unitsAvailable}
                      max={row.unitsTotal}
                      className="mt-1.5 w-24"
                    />
                  </td>
                  <td className="tnum px-2 py-2.5 text-right">
                    {responseLabel(row.avgResponseMin)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.escalationsOpen > 0 ? (
                      <ToneChip tone="high">
                        <span className="tnum">{row.escalationsOpen}</span> open
                      </ToneChip>
                    ) : (
                      <span className="tnum text-muted-foreground">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-inset text-sm font-medium">
                <th scope="row" className="px-4 py-2.5 text-left">
                  {districtName}
                </th>
                <td className="tnum px-2 py-2.5">
                  {sum(rows.map((r) => r.active))}
                </td>
                <td className="tnum px-2 py-2.5 text-right">
                  {sum(rows.map((r) => r.critical))}
                </td>
                <td className="tnum px-2 py-2.5">
                  {sum(rows.map((r) => r.unitsAvailable))} of{" "}
                  {sum(rows.map((r) => r.unitsTotal))}
                </td>
                <td className="tnum px-2 py-2.5 text-right">
                  {stats.avgResponseSec > 0
                    ? `${formatDecimal(stats.avgResponseSec / 60)} min`
                    : "—"}
                </td>
                <td className="tnum px-4 py-2.5 text-right">
                  {sum(rows.map((r) => r.escalationsOpen))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <ul className="space-y-2 p-3">
          {rows.map((row) => (
            <StationCard key={row.station.id} row={row} maxActive={maxActive} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ───────────────────────── System health ───────────────────────── */

interface ServiceState {
  label: string;
  tone: Tone;
  note: string;
}

const PLATFORM_SERVICES: {
  key: string;
  name: string;
  icon: LucideIcon;
  states: Record<Connectivity, ServiceState>;
}[] = [
  {
    key: "realtime",
    name: "Realtime stream",
    icon: Radio,
    states: {
      online: {
        label: "Operational",
        tone: "resolved",
        note: "Incident and unit updates arrive as they happen.",
      },
      weak: {
        label: "Degraded",
        tone: "medium",
        note: "Updates are arriving late.",
      },
      offline: {
        label: "Disconnected",
        tone: "critical",
        note: "No new updates. The last known picture stays on screen.",
      },
    },
  },
  {
    key: "tiles",
    name: "Map tiles",
    icon: MapIcon,
    states: {
      online: {
        label: "Operational",
        tone: "resolved",
        note: "Street tiles load normally.",
      },
      weak: {
        label: "Slow",
        tone: "medium",
        note: "Tiles load slowly. Markers stay accurate.",
      },
      offline: {
        label: "Unavailable",
        tone: "high",
        note: "Maps fall back to a plain grid with markers.",
      },
    },
  },
  {
    key: "evidence",
    name: "Evidence store",
    icon: FolderLock,
    states: {
      online: {
        label: "Operational",
        tone: "resolved",
        note: "Uploads are stored and an integrity digest is recorded.",
      },
      weak: {
        label: "Degraded",
        tone: "medium",
        note: "Uploads are slow to complete.",
      },
      offline: {
        label: "Unreachable",
        tone: "critical",
        note: "Uploads cannot be saved until the connection returns.",
      },
    },
  },
  {
    key: "notifications",
    name: "Notification gateway",
    icon: Bell,
    states: {
      online: {
        label: "Operational",
        tone: "resolved",
        note: "In-app alerts are delivered. No SMS or push is sent.",
      },
      weak: {
        label: "Delayed",
        tone: "medium",
        note: "Alerts may arrive late.",
      },
      offline: {
        label: "Held",
        tone: "high",
        note: "Alerts cannot be delivered until the connection returns.",
      },
    },
  },
];

const HEALTH_SUMMARY: Record<Connectivity, ServiceState> = {
  online: {
    label: "All services operational",
    tone: "resolved",
    note: "Connection is steady.",
  },
  weak: {
    label: "Degraded performance",
    tone: "medium",
    note: "The connection is weak, so services respond slowly.",
  },
  offline: {
    label: "Connection interrupted",
    tone: "critical",
    note: "Services are unreachable. Reconnecting.",
  },
};

const ADAPTER_STATUS: Record<
  Integration["status"],
  { label: string; tone: Tone; outline?: boolean }
> = {
  sandbox: { label: "Sandbox", tone: "normal" },
  placeholder: { label: "Placeholder", tone: "neutral" },
  disabled: { label: "Disabled", tone: "neutral", outline: true },
};

const DIRECTION: Record<
  Integration["direction"],
  { label: string; icon: LucideIcon }
> = {
  inbound: { label: "Inbound", icon: ArrowDownLeft },
  outbound: { label: "Outbound", icon: ArrowUpRight },
  bidirectional: { label: "Two-way", icon: ArrowLeftRight },
};

function SystemHealthPanel({ className }: { className?: string }) {
  const connectivity = usePrefsStore((s) => s.connectivity);
  const integrations = useDemoStore((s) => s.integrations);
  const summary = HEALTH_SUMMARY[connectivity];

  return (
    <Panel className={cn("flex min-w-0 flex-col", className)}>
      <PanelHeader
        title="System health"
        description="Simulated statuses that follow the demo connection setting"
      />
      <div
        role="status"
        className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3"
      >
        <p className="min-w-0 text-xs text-muted-foreground">{summary.note}</p>
        <ToneChip tone={summary.tone} dot>
          {summary.label}
        </ToneChip>
      </div>

      <ul className="divide-y divide-border/70">
        {PLATFORM_SERVICES.map((service) => {
          const state = service.states[connectivity];
          return (
            <li key={service.key} className="flex items-start gap-3 px-4 py-3">
              <service.icon
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-subtle"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{service.name}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {state.note}
                </p>
              </div>
              <ToneChip tone={state.tone} dot>
                {state.label}
              </ToneChip>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border/70">
        <div className="px-4 pt-3 pb-1">
          <h3 className="text-sm font-semibold">Inter-agency adapters</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Interface seams to other agencies. None of them exchanges data in
            this demonstration.
          </p>
        </div>
        {integrations.length === 0 ? (
          <BlankState compact title="No adapters configured" />
        ) : (
          <ul className="divide-y divide-border/70">
            {integrations.map((adapter) => {
              const status = ADAPTER_STATUS[adapter.status];
              const direction = DIRECTION[adapter.direction];
              return (
                <li
                  key={adapter.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {adapter.name}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <direction.icon aria-hidden className="size-3 shrink-0" />
                      {direction.label} · {adapter.agency}
                    </p>
                  </div>
                  <ToneChip
                    tone={status.tone}
                    variant={status.outline ? "outline" : "soft"}
                  >
                    {status.label}
                  </ToneChip>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}

/* ───────────────────────── Screen ───────────────────────── */

export function OperationsScreen() {
  const { districtId, districtName } = useCommandScope();
  return (
    <PageContainer width="full">
      <PageHeader
        title="Operations"
        description={`Major incidents, cross-station activity and platform health for ${districtName}, live from the control room.`}
      />
      <div className="grid gap-4 xl:grid-cols-12">
        <MajorIncidentsPanel className="xl:col-span-7" />
        <OperationsMapPanel
          districtName={districtName}
          className="xl:col-span-5"
        />
      </div>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-12">
        <CrossStationPanel
          districtId={districtId}
          districtName={districtName}
          className="xl:col-span-8"
        />
        <SystemHealthPanel className="xl:col-span-4" />
      </div>
    </PageContainer>
  );
}
