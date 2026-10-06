"use client";

import {
  ChevronsUp,
  CircleCheck,
  Siren,
  Timer,
  TriangleAlert,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { StatCard } from "@/components/shared/stat-card";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  ListSkeleton,
} from "@/components/shared/states";
import { ToneChip } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { deployment } from "@/config/deployment";
import { STATIONS } from "@/data/demo/geo";
import { READY, type LoadState } from "@/features/analytics/chart-kit";
import { formatCount, formatDecimal, sum } from "@/features/analytics/format";
import {
  AvailabilityPanel,
  CategoryPanel,
  DistrictActivityPanel,
  HourlyVolumePanel,
  RankedBarsPanel,
  ResolutionTrendPanel,
  ResponseTrendPanel,
} from "@/features/analytics/panels";
import { useOverview } from "@/features/analytics/use-overview";
import {
  useActiveIncidents,
  useIncidents,
  useOpsStats,
  useUnits,
} from "@/hooks/use-demo-data";
import { useIsMd } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import type { AnalyticsOverview, DistrictSummary } from "@/types";
import {
  districtHref,
  EscalationLevelChip,
  incidentHref,
  MapSelectionCard,
  PanelLink,
  ScopeSwitch,
} from "./command-ui";
import { useCommandScope, type CommandScopeState } from "./use-command-scope";
import { useStationOps, vehicleAvailability } from "./use-station-ops";

const FIGURE_GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6";
const TREND_DAYS = 14;
const PLOT_HEIGHT = 256;

/* ───────────────────────── Key figures ───────────────────────── */

function DistrictFigures({ districtName }: { districtName: string }) {
  const stats = useOpsStats();
  return (
    <section
      aria-label={`Key figures, ${districtName}, live`}
      className={FIGURE_GRID}
    >
      <StatCard
        label="Active incidents"
        value={stats.activeEmergencies}
        icon={Siren}
        hint={`${stats.unassigned} awaiting a unit`}
      />
      <StatCard
        label="Critical incidents"
        value={stats.critical}
        icon={TriangleAlert}
        tone={stats.critical > 0 ? "critical" : undefined}
        hint="P1, open now"
      />
      <StatCard
        label="Average response"
        value={
          stats.avgResponseSec > 0
            ? formatDecimal(stats.avgResponseSec / 60)
            : "—"
        }
        unit={stats.avgResponseSec > 0 ? "min" : undefined}
        icon={Timer}
        hint="Creation to arrival"
      />
      <StatCard
        label="Resolved today"
        value={stats.resolvedToday}
        icon={CircleCheck}
        hint="Resolved or closed"
      />
      <StatCard
        label="Available units"
        value={stats.unitsAvailable}
        unit={`of ${stats.unitsTotal}`}
        icon={Truck}
        hint={`${stats.unitsEnRoute} en route · ${stats.unitsOnScene} on scene`}
      />
      <StatCard
        label="Escalations"
        value={stats.escalationsOpen}
        icon={ChevronsUp}
        tone={stats.escalationsOpen > 0 ? "high" : undefined}
        hint="Open, all levels"
      />
    </section>
  );
}

function StateFigures({
  overview,
  load,
  stateName,
}: {
  overview: AnalyticsOverview | undefined;
  load: LoadState;
  stateName: string;
}) {
  if (load.status === "pending")
    return <CardGridSkeleton cards={6} className={FIGURE_GRID} />;
  if (load.status === "error" || !overview)
    return (
      <Panel>
        <ErrorState
          compact
          offline={load.status === "error" && load.offline}
          onRetry={load.status === "error" ? load.retry : undefined}
        />
      </Panel>
    );

  const districts = overview.districts;
  const critical = sum(districts.map((d) => d.critical));
  const escalations = sum(districts.map((d) => d.escalations));
  const resolved = sum(districts.map((d) => d.resolvedToday));
  const weightedResponse =
    resolved > 0
      ? sum(districts.map((d) => d.avgResponseMin * d.resolvedToday)) / resolved
      : 0;
  return (
    <section
      aria-label={`Key figures, ${stateName}, aggregated from districts`}
      className={cn(
        FIGURE_GRID,
        "transition-opacity",
        load.refreshing && "opacity-60",
      )}
    >
      <StatCard
        label="Active incidents"
        value={formatCount(sum(districts.map((d) => d.active)))}
        icon={Siren}
        hint={`Across ${districts.length} districts`}
      />
      <StatCard
        label="Critical incidents"
        value={critical}
        icon={TriangleAlert}
        tone={critical > 0 ? "critical" : undefined}
        hint={`In ${districts.filter((d) => d.critical > 0).length} districts`}
      />
      <StatCard
        label="Average response"
        value={formatDecimal(weightedResponse)}
        unit="min"
        icon={Timer}
        hint="Weighted by volume"
      />
      <StatCard
        label="Resolved today"
        value={formatCount(resolved)}
        icon={CircleCheck}
        hint="All districts"
      />
      <StatCard
        label="Available units"
        value={formatCount(sum(districts.map((d) => d.unitsAvailable)))}
        unit={`of ${formatCount(sum(districts.map((d) => d.unitsTotal)))}`}
        icon={Truck}
        hint="District rosters combined"
      />
      <StatCard
        label="Escalations"
        value={escalations}
        icon={ChevronsUp}
        tone={escalations > 0 ? "high" : undefined}
        hint="Open, all districts"
      />
    </section>
  );
}

/* ───────────────────────── Operations map ───────────────────────── */

function OperationsMapPanel({
  scope,
  overview,
  load,
  className,
}: {
  scope: CommandScopeState;
  overview: AnalyticsOverview | undefined;
  load: LoadState;
  className?: string;
}) {
  const incidents = useActiveIncidents();
  const units = useUnits();
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const isState = scope.scope === "state";
  const districts = overview?.districts;
  const isMd = useIsMd();
  // The configured state view fits tablet and desktop panels; a phone needs the view fitted to the districts.
  const focus = useMemo(
    () => (isMd ? undefined : districts?.map((d) => d.center)),
    [districts, isMd],
  );

  return (
    <Panel className={cn("flex min-w-0 flex-col overflow-hidden", className)}>
      <PanelHeader
        title={isState ? "State operations map" : "District operations map"}
        description={
          isState
            ? `${scope.stateName}: one bubble per district`
            : `${scope.districtName}: ${incidents.length} open incidents and ${units.length} units, live`
        }
        actions={
          !isState && <PanelLink href="/control/map">Live map</PanelLink>
        }
      />
      <div className="relative min-h-80 flex-1 sm:min-h-[26rem]">
        {!isState && (
          <OpsMap
            incidents={incidents}
            units={units}
            stations={STATIONS}
            selected={selection}
            onSelect={setSelection}
            label={`${scope.districtName} operations map with open incidents, units and stations`}
            className="absolute inset-0"
          />
        )}
        {isState && load.status === "pending" && (
          <div
            aria-busy="true"
            aria-label="Loading map"
            className="map-ground absolute inset-0 animate-pulse"
          />
        )}
        {isState && load.status === "error" && (
          <div className="absolute inset-0 grid place-items-center">
            <ErrorState compact offline={load.offline} onRetry={load.retry} />
          </div>
        )}
        {isState && load.status === "ready" && districts && (
          <OpsMap
            center={deployment.stateCenter}
            zoom={deployment.stateZoom}
            districts={districts}
            focus={focus}
            selected={selection}
            onSelect={setSelection}
            label={`${scope.stateName} operations map with one bubble per district`}
            className="absolute inset-0"
          />
        )}
        <MapSelectionCard
          selection={selection}
          districts={districts}
          onClear={() => setSelection(null)}
          className="absolute inset-x-3 top-3 z-10 sm:right-auto sm:w-80"
        />
      </div>
      <div className="border-t border-border/70 px-4 py-2.5">
        {isState ? (
          <ul
            aria-label="Map legend"
            className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
          >
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-critical" />
              District with a critical incident
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-primary" />
              No critical incident
            </li>
            <li>Bubble size and number: active incidents</li>
          </ul>
        ) : (
          <MapLegend />
        )}
      </div>
    </Panel>
  );
}

/* ───────────────────────── District scope: live lists ───────────────────────── */

const LIST_LIMIT = 4;

function CriticalIncidentsPanel() {
  const active = useActiveIncidents();
  const critical = useMemo(
    () => active.filter((i) => i.priority === "P1"),
    [active],
  );
  return (
    <Panel>
      <PanelHeader
        title="Critical incidents"
        description={
          critical.length === 0
            ? "None open right now"
            : `${critical.length} open, timers running`
        }
        actions={
          <PanelLink href="/control/incidents?priority=P1">Queue</PanelLink>
        }
      />
      {critical.length === 0 ? (
        <EmptyState
          compact
          title="No critical incidents open"
          description="P1 incidents appear here the moment they reach the control room."
        />
      ) : (
        <ul className="space-y-2 p-3">
          {critical.slice(0, LIST_LIMIT).map((incident) => (
            <li key={incident.id}>
              <Link
                href={incidentHref(incident.id)}
                className="block rounded-xl"
              >
                <IncidentRow
                  incident={incident}
                  showTimer
                  className="hover:border-input hover:bg-muted/50"
                />
              </Link>
            </li>
          ))}
          {critical.length > LIST_LIMIT && (
            <li className="px-1 pt-1 text-xs text-muted-foreground">
              {critical.length - LIST_LIMIT} more in the queue
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}

function EscalationsPanel() {
  const escalations = useDemoStore((s) => s.escalations);
  const incidents = useIncidents();
  const { open, acknowledged, resolved } = useMemo(() => {
    const titles = new Map(incidents.map((i) => [i.id, i.title]));
    return {
      open: escalations
        .filter((e) => e.status === "open")
        .sort((a, b) => b.level - a.level || b.raisedAt - a.raisedAt)
        .map((e) => ({ ...e, title: titles.get(e.incidentId) })),
      acknowledged: escalations.filter((e) => e.status === "acknowledged")
        .length,
      resolved: escalations.filter((e) => e.status === "resolved").length,
    };
  }, [escalations, incidents]);

  return (
    <Panel>
      <PanelHeader
        title="Escalations"
        description="Raised by policy timers and by staff"
        actions={<PanelLink href="/control/escalations">Review</PanelLink>}
      />
      <dl className="grid grid-cols-3 divide-x divide-border/70 border-b border-border/70 text-center">
        {[
          { label: "Open", value: open.length },
          { label: "Acknowledged", value: acknowledged },
          { label: "Resolved", value: resolved },
        ].map((figure) => (
          <div key={figure.label} className="px-2 py-3">
            <dt className="text-xs text-muted-foreground">{figure.label}</dt>
            <dd className="tnum mt-0.5 text-xl font-semibold">
              {figure.value}
            </dd>
          </div>
        ))}
      </dl>
      {open.length === 0 ? (
        <EmptyState
          compact
          title="No open escalations"
          description="Nothing is waiting on a supervisor or on command."
        />
      ) : (
        <ul className="divide-y divide-border/70">
          {open.slice(0, LIST_LIMIT).map((escalation) => (
            <li key={escalation.id}>
              <Link
                href={incidentHref(escalation.incidentId)}
                className="block px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <EscalationLevelChip level={escalation.level} />
                  <RelativeTime
                    at={escalation.raisedAt}
                    className="text-xs text-muted-foreground"
                  />
                </div>
                <p className="mt-1.5 truncate text-sm font-medium">
                  {escalation.title ?? escalation.incidentId}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {escalation.reason} · raised by {escalation.raisedBy}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ───────────────────────── State scope: district aggregates ───────────────────────── */

function DistrictListPanel({
  title,
  description,
  rows,
  load,
  emptyTitle,
  emptyDescription,
  renderMeta,
}: {
  title: string;
  description: string;
  rows: DistrictSummary[];
  load: LoadState;
  emptyTitle: string;
  emptyDescription: string;
  renderMeta: (district: DistrictSummary) => React.ReactNode;
}) {
  return (
    <Panel>
      <PanelHeader
        title={title}
        description={load.status === "ready" ? description : undefined}
        actions={<PanelLink href="/command/districts">Compare</PanelLink>}
      />
      {load.status === "pending" && <ListSkeleton rows={3} className="p-4" />}
      {load.status === "error" && (
        <ErrorState compact offline={load.offline} onRetry={load.retry} />
      )}
      {load.status === "ready" &&
        (rows.length === 0 ? (
          <EmptyState
            compact
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <ul className="divide-y divide-border/70">
            {rows.map((district) => (
              <li key={district.districtId}>
                <Link
                  href={districtHref(district.districtId)}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <span className="min-w-0 truncate text-sm font-medium">
                    {district.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {renderMeta(district)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </Panel>
  );
}

function StateSidePanels({
  overview,
  load,
}: {
  overview: AnalyticsOverview | undefined;
  load: LoadState;
}) {
  const districts = overview?.districts ?? [];
  const critical = districts
    .filter((d) => d.critical > 0)
    .sort((a, b) => b.critical - a.critical || b.active - a.active);
  const escalated = districts
    .filter((d) => d.escalations > 0)
    .sort((a, b) => b.escalations - a.escalations);
  return (
    <>
      <DistrictListPanel
        title="Critical incidents by district"
        description={`${sum(critical.map((d) => d.critical))} critical in ${critical.length} districts`}
        rows={critical}
        load={load}
        emptyTitle="No district is reporting a critical incident"
        emptyDescription="Districts with open P1 incidents are listed here."
        renderMeta={(d) => (
          <>
            <span className="tnum">{d.active} active</span>
            <ToneChip tone="critical">
              <span className="tnum">{d.critical}</span> critical
            </ToneChip>
          </>
        )}
      />
      <DistrictListPanel
        title="Open escalations by district"
        description={`${sum(escalated.map((d) => d.escalations))} open in ${escalated.length} districts`}
        rows={escalated}
        load={load}
        emptyTitle="No open escalations"
        emptyDescription="No district has an incident waiting on command."
        renderMeta={(d) => (
          <>
            <span className="tnum">
              {formatDecimal(d.avgResponseMin)} min response
            </span>
            <ToneChip tone="high">
              <span className="tnum">{d.escalations}</span> open
            </ToneChip>
          </>
        )}
      />
    </>
  );
}

/* ───────────────────────── Live district charts ───────────────────────── */

function StationActivityPanel({ districtId }: { districtId: string }) {
  const stations = useStationOps(districtId);
  const rows = useMemo(
    () =>
      [...stations]
        .sort((a, b) => b.active - a.active || b.critical - a.critical)
        .map((s) => ({ label: s.station.area, value: s.active })),
    [stations],
  );
  const top = rows[0];
  const total = sum(rows.map((r) => r.value));
  return (
    <RankedBarsPanel
      title="Active incidents by station"
      description="Open incidents in each station area, live."
      rows={rows}
      firstColumn="Station"
      valueColumn="Active incidents"
      load={READY}
      height={PLOT_HEIGHT}
      empty={{ title: "No stations in this district" }}
      summary={
        top
          ? `Active incidents by station, live. ${top.label} has the most with ${top.value}. ${total} open across ${rows.length} stations.`
          : "Active incidents by station."
      }
    />
  );
}

function LiveAvailabilityPanel({ districtName }: { districtName: string }) {
  const units = useUnits();
  const rows = useMemo(() => vehicleAvailability(units), [units]);
  return (
    <AvailabilityPanel
      title="Resource availability by vehicle type"
      description={`${districtName} roster, live.`}
      rows={rows}
      load={READY}
      height={PLOT_HEIGHT}
    />
  );
}

/* ───────────────────────── Screen ───────────────────────── */

export function CommandOverviewScreen() {
  const scope = useCommandScope();
  const { overview, load } = useOverview(scope.scope);
  const isState = scope.scope === "state";

  return (
    <PageContainer width="full">
      <PageHeader
        title="Command overview"
        description={
          isState
            ? `Statewide picture for ${scope.stateName}, aggregated from district figures. Trend charts use demonstration data.`
            : `Live operations for ${scope.districtName}. Figures, lists and the map follow the control room; trend charts use demonstration data.`
        }
        actions={<ScopeSwitch scope={scope} />}
      />

      {isState ? (
        <StateFigures
          overview={overview}
          load={load}
          stateName={scope.stateName}
        />
      ) : (
        <DistrictFigures districtName={scope.districtName} />
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <OperationsMapPanel
          key={scope.scope}
          scope={scope}
          overview={overview}
          load={load}
          className="xl:col-span-7 2xl:col-span-8"
        />
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-5 2xl:col-span-4">
          {isState ? (
            <StateSidePanels overview={overview} load={load} />
          ) : (
            <>
              <CriticalIncidentsPanel />
              <EscalationsPanel />
            </>
          )}
        </div>
      </div>

      <section
        aria-label={`Trends, ${scope.scopeName}`}
        className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3"
      >
        <HourlyVolumePanel overview={overview} load={load} />
        <ResponseTrendPanel overview={overview} load={load} days={TREND_DAYS} />
        <ResolutionTrendPanel
          overview={overview}
          load={load}
          days={TREND_DAYS}
        />
        <CategoryPanel overview={overview} load={load} height={PLOT_HEIGHT} />
        {isState ? (
          <DistrictActivityPanel
            overview={overview}
            load={load}
            limit={8}
            height={PLOT_HEIGHT}
          />
        ) : (
          <StationActivityPanel districtId={scope.districtId} />
        )}
        {isState ? (
          <AvailabilityPanel
            title="Resource availability by vehicle type"
            description={`${scope.stateName} fleet, all districts.`}
            rows={overview?.resource ?? []}
            load={load}
            height={PLOT_HEIGHT}
          />
        ) : (
          <LiveAvailabilityPanel districtName={scope.districtName} />
        )}
      </section>
    </PageContainer>
  );
}
