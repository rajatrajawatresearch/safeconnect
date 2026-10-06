"use client";

import { CircleCheck, Clock, Moon, Radio, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/shared/page";
import { StatCard } from "@/components/shared/stat-card";
import {
  BlankState,
  CardGridSkeleton,
  ErrorState,
  ListSkeleton,
} from "@/components/shared/states";
import { ToneChip, UnitStatusChip } from "@/components/shared/status-chips";
import { UNIT_STATUS_META } from "@/config/incident";
import { stationById } from "@/data/demo/geo";
import {
  ChartPanel,
  READY,
  SERIES,
  type LoadState,
} from "@/features/analytics/chart-kit";
import { ColumnChart, InlineBar } from "@/features/analytics/charts";
import { SegmentedControl } from "@/features/analytics/controls";
import {
  formatCount,
  formatPct,
  share,
  sum,
} from "@/features/analytics/format";
import { AvailabilityPanel } from "@/features/analytics/panels";
import { useOverview } from "@/features/analytics/use-overview";
import { useUnits } from "@/hooks/use-demo-data";
import { useNow } from "@/hooks/use-now";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyticsOverview, Unit, UnitStatus } from "@/types";
import { PanelLink, ScopeSwitch, unitHref } from "./command-ui";
import { useCommandScope } from "./use-command-scope";
import {
  stationAvailability,
  unitBuckets,
  useStationOps,
  vehicleAvailability,
} from "./use-station-ops";

const FIGURE_GRID = "grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-4";
const PLOT_HEIGHT = 264;
const HOUR = 3_600_000;

/* ───────────────────────── Figures ───────────────────────── */

function FleetFigures({
  buckets,
  scopeName,
  live,
}: {
  buckets: {
    available: number;
    engaged: number;
    offDuty: number;
    total: number;
  };
  scopeName: string;
  live: boolean;
}) {
  return (
    <section aria-label={`Fleet figures, ${scopeName}`} className={FIGURE_GRID}>
      <StatCard
        label="Units on roster"
        value={formatCount(buckets.total)}
        icon={Truck}
        hint={live ? `${scopeName}, live` : `${scopeName}, all districts`}
      />
      <StatCard
        label="Available now"
        value={formatCount(buckets.available)}
        icon={CircleCheck}
        hint={`${formatPct(Math.round(share(buckets.available, buckets.total)))} of the roster`}
      />
      <StatCard
        label="Engaged"
        value={formatCount(buckets.engaged)}
        icon={Radio}
        hint="Assigned, en route or on scene"
      />
      <StatCard
        label="Off duty"
        value={formatCount(buckets.offDuty)}
        icon={Moon}
        hint="Off duty or unavailable"
      />
    </section>
  );
}

function StateFleetFigures({
  overview,
  load,
  stateName,
}: {
  overview: AnalyticsOverview | undefined;
  load: LoadState;
  stateName: string;
}) {
  if (load.status === "pending")
    return <CardGridSkeleton cards={4} className={FIGURE_GRID} />;
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
  const available = sum(overview.resource.map((r) => r.available));
  const engaged = sum(overview.resource.map((r) => r.engaged));
  const offDuty = sum(overview.resource.map((r) => r.offDuty));
  return (
    <FleetFigures
      buckets={{
        available,
        engaged,
        offDuty,
        total: available + engaged + offDuty,
      }}
      scopeName={stateName}
      live={false}
    />
  );
}

/* ───────────────────────── Live unit status ───────────────────────── */

const STATUS_ORDER: UnitStatus[] = [
  "available",
  "assigned",
  "en_route",
  "on_scene",
  "unavailable",
  "off_duty",
];

function UnitStatusPanel({
  units,
  districtName,
}: {
  units: Unit[];
  districtName: string;
}) {
  const max = Math.max(
    1,
    ...STATUS_ORDER.map((s) => units.filter((u) => u.status === s).length),
  );
  return (
    <Panel className="flex min-w-0 flex-col">
      <PanelHeader
        title="Unit status, live"
        description={`${districtName}: ${units.length} units by current status`}
        actions={<PanelLink href="/control/units">Units</PanelLink>}
      />
      {units.length === 0 ? (
        <BlankState
          compact
          title="No units on the roster"
          description="Units appear here once they are added to a station."
        />
      ) : (
        <ul className="divide-y divide-border/70">
          {STATUS_ORDER.map((status) => {
            const count = units.filter((u) => u.status === status).length;
            return (
              <li key={status}>
                <Link
                  href={`/control/units?status=${status}`}
                  aria-label={`${UNIT_STATUS_META[status].label}: ${count} units. Open the unit list.`}
                  className="grid grid-cols-[7.5rem_minmax(0,1fr)_2rem] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <span>
                    <UnitStatusChip status={status} />
                  </span>
                  <InlineBar value={count} max={max} className="h-1.5" />
                  <span className="tnum text-right text-sm font-semibold">
                    {count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ───────────────────────── Utilisation ranking ───────────────────────── */

function UtilisationRankingPanel({
  overview,
  load,
  units,
}: {
  overview: AnalyticsOverview | undefined;
  load: LoadState;
  units: Unit[];
}) {
  const rows = useMemo(
    () =>
      [...(overview?.unitUtilisation ?? [])]
        .sort((a, b) => b.pct - a.pct)
        .map((row) => ({
          ...row,
          live: units.find((u) => u.callSign === row.unit),
        })),
    [overview, units],
  );
  return (
    <Panel className="flex min-w-0 flex-col">
      <PanelHeader
        title="Unit utilisation ranking"
        description="% of duty time on incidents this shift, most engaged first"
      />
      {load.status === "pending" && <ListSkeleton rows={6} className="p-4" />}
      {load.status === "error" && (
        <ErrorState compact offline={load.offline} onRetry={load.retry} />
      )}
      {load.status === "ready" && rows.length === 0 && (
        <BlankState compact title="No utilisation figures for this shift" />
      )}
      {load.status === "ready" && rows.length > 0 && (
        <ol
          className={cn(
            "divide-y divide-border/70 transition-opacity",
            load.refreshing && "opacity-60",
          )}
        >
          {rows.map((row, index) => (
            <li
              key={row.unit}
              className="grid grid-cols-[1.25rem_minmax(0,1fr)_4.5rem_2.75rem] items-center gap-3 px-4 py-2 text-sm sm:grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem]"
            >
              <span className="tnum text-xs text-muted-foreground">
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                {row.live ? (
                  <Link
                    href={unitHref(row.live.id)}
                    className="font-mono text-[13px] font-medium hover:underline"
                  >
                    {row.unit}
                  </Link>
                ) : (
                  <span className="font-mono text-[13px] font-medium">
                    {row.unit}
                  </span>
                )}
                {row.live && (
                  <span className="truncate text-xs text-muted-foreground">
                    {stationById(row.live.stationId)?.area}
                  </span>
                )}
              </span>
              <InlineBar value={row.pct} max={100} className="h-1.5" />
              <span className="tnum text-right font-semibold">{row.pct}%</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/* ───────────────────────── Shift coverage ───────────────────────── */

type CoverageWindow = "2" | "4" | "8";

const ENGAGED: UnitStatus[] = ["assigned", "en_route", "on_scene"];

function remaining(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const m = minutes % 60;
  return `${Math.floor(minutes / 60)} h ${String(m).padStart(2, "0")} min`;
}

function ShiftCoveragePanel({
  units,
  districtName,
  className,
}: {
  units: Unit[];
  districtName: string;
  className?: string;
}) {
  const now = useNow(30_000);
  const [hours, setHours] = useState<CoverageWindow>("8");
  const onShift = useMemo(
    () => units.filter((u) => u.status !== "off_duty" && u.shiftEndsAt > now),
    [units, now],
  );
  const horizon = now + Number(hours) * HOUR;
  const ending = useMemo(
    () =>
      onShift
        .filter((u) => u.shiftEndsAt <= horizon)
        .sort((a, b) => a.shiftEndsAt - b.shiftEndsAt),
    [onShift, horizon],
  );
  const engagedEnding = ending.filter((u) => ENGAGED.includes(u.status)).length;
  const coverage = useMemo(
    () =>
      Array.from({ length: 9 }, (_, k) => {
        const at = now + k * HOUR;
        return {
          time: k === 0 ? "Now" : formatTime(at),
          units: onShift.filter((u) => u.shiftEndsAt > at).length,
        };
      }),
    [onShift, now],
  );

  return (
    <ChartPanel
      title="Shift coverage, units on shift by hour"
      description={`${districtName}: units still on shift at each hour for the next 8 hours`}
      load={READY}
      className={className}
      height={PLOT_HEIGHT}
      table={{
        columns: [
          { label: "Time" },
          { label: "Units on shift", numeric: true },
        ],
        rows: coverage.map((c) => [c.time, c.units]),
      }}
      summary={`${onShift.length} units are on shift now. ${ending.length} finish within the next ${hours} hours.`}
      note="Relief rosters are not modelled in this demonstration, so coverage falls away when the current shift ends."
      aside={
        <ShiftEndingList
          ending={ending}
          engagedEnding={engagedEnding}
          onShift={onShift.length}
          hours={hours}
          setHours={setHours}
          now={now}
        />
      }
    >
      <ColumnChart
        data={coverage}
        xKey="time"
        series={[
          { key: "units", label: "Units on shift", color: SERIES.primary },
        ]}
      />
    </ChartPanel>
  );
}

function ShiftEndingList({
  ending,
  engagedEnding,
  onShift,
  hours,
  setHours,
  now,
}: {
  ending: Unit[];
  engagedEnding: number;
  onShift: number;
  hours: CoverageWindow;
  setHours: (hours: CoverageWindow) => void;
  now: number;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Shifts ending
        </p>
        <SegmentedControl
          label="Shift ending window"
          value={hours}
          onChange={setHours}
          options={[
            { value: "2", label: "2 h" },
            { value: "4", label: "4 h" },
            { value: "8", label: "8 h" },
          ]}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {ending.length} of {onShift} units on shift finish within {hours} hours
        {ending.length > 0 &&
          `, ${engagedEnding} of them engaged on an incident right now`}
        .
      </p>
      {ending.length === 0 ? (
        <BlankState
          compact
          title={`No shifts end in the next ${hours} hours`}
          description="Widen the window to see later shift ends."
        />
      ) : (
        <ul className="scroll-thin mt-2 max-h-52 divide-y divide-border/70 overflow-y-auto rounded-lg border border-border/70">
          {ending.map((unit) => (
            <li
              key={unit.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <span className="min-w-0">
                <Link
                  href={unitHref(unit.id)}
                  className="font-mono text-[13px] font-medium hover:underline"
                >
                  {unit.callSign}
                </Link>
                <span className="block text-xs text-muted-foreground">
                  {stationById(unit.stationId)?.area} · ends{" "}
                  <span className="tnum">{formatTime(unit.shiftEndsAt)}</span>,
                  in {remaining(unit.shiftEndsAt - now)}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <UnitStatusChip status={unit.status} />
                {ENGAGED.includes(unit.status) &&
                  unit.shiftEndsAt - now <= HOUR && (
                    <ToneChip tone="high">
                      <Clock aria-hidden className="size-3" /> Engaged at shift
                      end
                    </ToneChip>
                  )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ───────────────────────── Screen ───────────────────────── */

export function ResourcesScreen() {
  const scope = useCommandScope();
  const isState = scope.scope === "state";
  const { overview, load } = useOverview(scope.scope);
  const units = useUnits();
  const stations = useStationOps(scope.districtId);
  const liveByVehicle = useMemo(() => vehicleAvailability(units), [units]);
  const liveByStation = useMemo(
    () => stationAvailability(stations),
    [stations],
  );

  return (
    <PageContainer width="full">
      <PageHeader
        title="Resources"
        description={
          isState
            ? `Fleet availability across ${scope.stateName}, with live unit detail for ${scope.districtName}.`
            : `Unit availability, utilisation and shift coverage for ${scope.districtName}, live from the control room.`
        }
        actions={<ScopeSwitch scope={scope} />}
      />

      {isState ? (
        <StateFleetFigures
          overview={overview}
          load={load}
          stateName={scope.stateName}
        />
      ) : (
        <FleetFigures
          buckets={unitBuckets(units)}
          scopeName={scope.districtName}
          live
        />
      )}

      <section
        aria-label="Availability and utilisation"
        className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3"
      >
        {isState ? (
          <AvailabilityPanel
            title="Availability by vehicle type"
            description={`${scope.stateName} fleet, all districts.`}
            rows={overview?.resource ?? []}
            load={load}
            height={PLOT_HEIGHT}
          />
        ) : (
          <AvailabilityPanel
            title="Availability by vehicle type"
            description={`${scope.districtName} roster, live.`}
            rows={liveByVehicle}
            load={READY}
            height={PLOT_HEIGHT}
          />
        )}
        <AvailabilityPanel
          title="Availability by station"
          description={`${scope.districtName}: units at each station, live.`}
          rows={liveByStation}
          firstColumn="Station"
          load={READY}
          height={PLOT_HEIGHT}
        />
        <UtilisationRankingPanel
          overview={overview}
          load={load}
          units={units}
        />
        <UnitStatusPanel units={units} districtName={scope.districtName} />
        <ShiftCoveragePanel
          units={units}
          districtName={scope.districtName}
          className="lg:col-span-2 2xl:col-span-2"
        />
      </section>
    </PageContainer>
  );
}
