"use client";

import { useMemo, type ReactNode } from "react";
import type { AnalyticsOverview, DistrictSummary, TrendPoint } from "@/types";
import {
  ChartPanel,
  SERIES,
  rowsHeight,
  type ChartTableData,
  type LoadState,
} from "./chart-kit";
import { BarRowsChart, ColumnChart, MeterList, TrendLineChart } from "./charts";
import {
  formatCount,
  formatDecimal,
  formatNumber,
  formatPct,
  mean,
  share,
  sum,
} from "./format";
import {
  activeResolvedTable,
  categoryTable,
  countTable,
  districtActivityTable,
  districtDistributionTable,
  flowTable,
  hourlyTable,
  resolutionTimeTable,
  resourceTable,
  responseTable,
  slaTable,
  utilisationTable,
  volumeTable,
} from "./tables";

/**
 * The analytics panels shared by the command centre and the control room.
 * Each one takes the overview (or nothing yet) plus its load state, so a page can lay panels out
 * before the data arrives and every panel shows the same skeleton, error and table view.
 */

interface PanelProps {
  overview: AnalyticsOverview | undefined;
  load: LoadState;
  height?: number;
  className?: string;
}

interface TrendPanelProps extends PanelProps {
  /** How many of the most recent days to plot. */
  days: number;
}

export const trendWindow = (
  overview: AnalyticsOverview | undefined,
  days: number,
): TrendPoint[] => overview?.trend.slice(-days) ?? [];

const lastOf = <T,>(rows: T[]): T | undefined => rows[rows.length - 1];

const maxBy = <T,>(rows: T[], value: (row: T) => number): T | undefined =>
  rows.reduce<T | undefined>(
    (best, row) =>
      best === undefined || value(row) > value(best) ? row : best,
    undefined,
  );

/** A value axis that frames the data with a little room and lands every tick on a round number. */
function framedAxis(
  values: number[],
  step: number,
): { domain: [number, number]; ticks: number[] } | undefined {
  if (values.length === 0) return undefined;
  const low = Math.max(0, Math.floor(Math.min(...values) / step) * step - step);
  const top = Math.ceil(Math.max(...values) / step) * step + step;
  let tickStep = step;
  while ((top - low) / tickStep > 6) tickStep *= 2;
  const count = Math.ceil((top - low) / tickStep);
  const ticks = Array.from({ length: count + 1 }, (_, i) => low + i * tickStep);
  return { domain: [low, low + count * tickStep], ticks };
}

/* ───────────────────────── Volume ───────────────────────── */

export function HourlyVolumePanel({
  overview,
  load,
  height,
  className,
}: PanelProps) {
  const rows = useMemo(() => overview?.hourly ?? [], [overview]);
  const data = useMemo(
    () =>
      rows.map((r) => ({
        hour: r.hour,
        critical: r.critical,
        other: Math.max(0, r.incidents - r.critical),
      })),
    [rows],
  );
  const peak = maxBy(rows, (r) => r.incidents);
  const critical = sum(rows.map((r) => r.critical));
  return (
    <ChartPanel
      title="Incidents by hour of day"
      description="Count per hour. Critical (P1) incidents sit at the base of each column."
      load={load}
      height={height}
      className={className}
      table={hourlyTable(rows)}
      legend={[
        { label: "Critical (P1)", color: SERIES.critical },
        { label: "Other priorities", color: SERIES.primary },
      ]}
      summary={
        peak
          ? `Incidents by hour of day. The busiest hour is ${peak.hour} with ${formatCount(peak.incidents)} incidents. ${formatCount(critical)} critical incidents across the day.`
          : "Incidents by hour of day."
      }
    >
      <ColumnChart
        data={data}
        xKey="hour"
        stacked
        totalLabel="All incidents"
        xInterval={2}
        formatTick={(label) => label.slice(0, 2)}
        formatValue={formatCount}
        series={[
          { key: "critical", label: "Critical (P1)", color: SERIES.critical },
          { key: "other", label: "Other priorities", color: SERIES.primary },
        ]}
      />
    </ChartPanel>
  );
}

export function IncidentVolumePanel({
  overview,
  load,
  days,
  height,
  className,
}: TrendPanelProps) {
  const rows = useMemo(() => trendWindow(overview, days), [overview, days]);
  const data = useMemo(
    () => rows.map((r) => ({ day: r.day, opened: r.opened })),
    [rows],
  );
  const total = sum(rows.map((r) => r.opened));
  const busiest = maxBy(rows, (r) => r.opened);
  return (
    <ChartPanel
      title="Incident volume, incidents opened per day"
      description={`Last ${rows.length || days} days. The latest day is still in progress.`}
      load={load}
      height={height}
      className={className}
      table={volumeTable(rows)}
      summary={
        busiest
          ? `Incidents opened per day over the last ${rows.length} days: ${formatCount(total)} in total, about ${formatCount(Math.round(total / rows.length))} a day. The busiest day was ${busiest.day} with ${formatCount(busiest.opened)}.`
          : "Incidents opened per day."
      }
    >
      <ColumnChart
        data={data}
        xKey="day"
        formatValue={formatCount}
        series={[{ key: "opened", label: "Opened", color: SERIES.primary }]}
      />
    </ChartPanel>
  );
}

export function ResolutionTrendPanel({
  overview,
  load,
  days,
  height,
  className,
}: TrendPanelProps) {
  const rows = useMemo(() => trendWindow(overview, days), [overview, days]);
  const data = useMemo(
    () =>
      rows.map((r) => ({
        day: r.day,
        opened: r.opened,
        resolved: r.resolved,
      })),
    [rows],
  );
  const opened = sum(rows.map((r) => r.opened));
  const resolved = sum(rows.map((r) => r.resolved));
  return (
    <ChartPanel
      title="Incidents opened and resolved per day"
      description={`Last ${rows.length || days} days. The latest day is still in progress.`}
      load={load}
      height={height}
      className={className}
      table={flowTable(rows)}
      legend={[
        { label: "Opened", color: SERIES.primary, shape: "line" },
        { label: "Resolved", color: SERIES.resolved, shape: "line" },
      ]}
      summary={`Incidents opened and resolved per day over the last ${rows.length} days: ${formatCount(opened)} opened and ${formatCount(resolved)} resolved, a resolution rate of ${formatPct(Math.round(share(resolved, opened)))}.`}
    >
      <TrendLineChart
        data={data}
        xKey="day"
        endLabel={false}
        formatValue={formatCount}
        series={[
          { key: "opened", label: "Opened", color: SERIES.primary },
          { key: "resolved", label: "Resolved", color: SERIES.resolved },
        ]}
      />
    </ChartPanel>
  );
}

export function ActiveVsResolvedPanel({
  overview,
  load,
  height,
  className,
}: PanelProps) {
  const rows = useMemo(() => overview?.activeVsResolved ?? [], [overview]);
  const data = useMemo(
    () =>
      rows.map((r) => ({
        window: r.label,
        active: r.active,
        resolved: r.resolved,
      })),
    [rows],
  );
  return (
    <ChartPanel
      title="Active and resolved incidents by time window"
      description="Today so far, in four-hour windows."
      load={load}
      height={height}
      className={className}
      table={activeResolvedTable(rows)}
      legend={[
        { label: "Still active", color: SERIES.primary },
        { label: "Resolved", color: SERIES.resolved },
      ]}
      summary={`Active and resolved incidents by four-hour window today: ${formatCount(sum(rows.map((r) => r.resolved)))} resolved and ${formatCount(sum(rows.map((r) => r.active)))} still active.`}
    >
      <ColumnChart
        data={data}
        xKey="window"
        formatValue={formatCount}
        series={[
          { key: "active", label: "Still active", color: SERIES.primary },
          { key: "resolved", label: "Resolved", color: SERIES.resolved },
        ]}
      />
    </ChartPanel>
  );
}

/* ───────────────────────── Time ───────────────────────── */

export function ResponseTrendPanel({
  overview,
  load,
  days,
  height,
  className,
}: TrendPanelProps) {
  const rows = useMemo(() => trendWindow(overview, days), [overview, days]);
  const data = useMemo(
    () =>
      rows.map((r) => ({
        day: r.day,
        response: r.responseMin,
        target: r.targetMin,
      })),
    [rows],
  );
  const responseAxis = useMemo(
    () =>
      framedAxis(
        rows.flatMap((r) => [r.responseMin, r.targetMin]),
        1,
      ),
    [rows],
  );
  const latest = lastOf(rows);
  const met = rows.filter((r) => r.responseMin <= r.targetMin).length;
  return (
    <ChartPanel
      title="Average response time, minutes"
      description="Creation to first unit on scene, daily mean. The dashed line is the demo target."
      load={load}
      height={height}
      className={className}
      table={responseTable(rows)}
      legend={[
        { label: "Average response", color: SERIES.primary, shape: "line" },
        {
          label: latest
            ? `Demo target, ${formatNumber(latest.targetMin)} min`
            : "Demo target",
          color: SERIES.quiet,
          shape: "dash",
        },
      ]}
      summary={
        latest
          ? `Average response time over the last ${rows.length} days. Latest ${formatDecimal(latest.responseMin)} minutes against a demo target of ${formatNumber(latest.targetMin)} minutes. ${met} of ${rows.length} days met the target.`
          : "Average response time."
      }
    >
      <TrendLineChart
        data={data}
        xKey="day"
        unit="min"
        domain={responseAxis?.domain}
        ticks={responseAxis?.ticks}
        series={[
          { key: "response", label: "Average response", color: SERIES.primary },
          {
            key: "target",
            label: "Demo target",
            color: SERIES.quiet,
            dashed: true,
          },
        ]}
      />
    </ChartPanel>
  );
}

export function ResolutionTimePanel({
  overview,
  load,
  days,
  height,
  className,
}: TrendPanelProps) {
  const rows = useMemo(() => trendWindow(overview, days), [overview, days]);
  const data = useMemo(
    () => rows.map((r) => ({ day: r.day, resolution: r.resolutionMin })),
    [rows],
  );
  const resolutionAxis = useMemo(
    () =>
      framedAxis(
        rows.map((r) => r.resolutionMin),
        5,
      ),
    [rows],
  );
  const latest = lastOf(rows);
  return (
    <ChartPanel
      title="Average resolution time, minutes"
      description={`Creation to resolution, daily mean. Last ${rows.length || days} days.`}
      load={load}
      height={height}
      className={className}
      table={resolutionTimeTable(rows)}
      summary={
        latest
          ? `Average resolution time over the last ${rows.length} days. Latest ${formatNumber(latest.resolutionMin)} minutes; the period mean is ${formatDecimal(mean(rows.map((r) => r.resolutionMin)))} minutes.`
          : "Average resolution time."
      }
    >
      <TrendLineChart
        data={data}
        xKey="day"
        unit="min"
        domain={resolutionAxis?.domain}
        ticks={resolutionAxis?.ticks}
        series={[
          {
            key: "resolution",
            label: "Average resolution",
            color: SERIES.primary,
          },
        ]}
      />
    </ChartPanel>
  );
}

/* ───────────────────────── Rankings ───────────────────────── */

/** Single-series horizontal bars over named rows. Every bar takes the same hue; length is the encoding. */
export function RankedBarsPanel({
  title,
  description,
  rows,
  firstColumn,
  valueColumn,
  load,
  summary,
  table,
  unit,
  max,
  note,
  empty,
  height,
  className,
}: {
  title: string;
  description?: ReactNode;
  rows: { label: string; value: number }[];
  /** Column headings for the table view, for example "Station" and "Active incidents". */
  firstColumn: string;
  valueColumn: string;
  load: LoadState;
  summary: string;
  /** Overrides the default two-column table. */
  table?: ChartTableData;
  unit?: string;
  max?: number;
  note?: ReactNode;
  empty?: { title: string; description?: string };
  height?: number;
  className?: string;
}) {
  return (
    <ChartPanel
      title={title}
      description={description}
      load={load}
      height={height ?? rowsHeight(rows.length)}
      className={className}
      table={table ?? countTable(firstColumn, valueColumn, rows)}
      summary={summary}
      note={note}
      empty={rows.length === 0 ? empty : undefined}
    >
      <BarRowsChart
        data={rows.map((r) => ({ label: r.label, value: r.value }))}
        labelKey="label"
        unit={unit}
        max={max}
        formatValue={formatCount}
        series={[{ key: "value", label: valueColumn, color: SERIES.primary }]}
      />
    </ChartPanel>
  );
}

export function CategoryPanel({
  overview,
  load,
  height,
  className,
}: PanelProps) {
  const rows = [...(overview?.categories ?? [])].sort(
    (a, b) => b.count - a.count,
  );
  const total = sum(rows.map((r) => r.count));
  const top = rows[0];
  return (
    <RankedBarsPanel
      title="Incidents by category"
      description="Reporting period total, by category group."
      rows={rows.map((r) => ({ label: r.category, value: r.count }))}
      firstColumn="Category"
      valueColumn="Incidents"
      table={categoryTable(rows)}
      load={load}
      height={height}
      className={className}
      summary={
        top
          ? `Incidents by category. ${top.category} is the largest group with ${formatCount(top.count)} incidents, ${formatPct(Math.round(share(top.count, total)))} of ${formatCount(total)}.`
          : "Incidents by category."
      }
    />
  );
}

const byActive = (a: DistrictSummary, b: DistrictSummary) =>
  b.active - a.active || b.critical - a.critical;

export function DistrictActivityPanel({
  overview,
  load,
  limit,
  note,
  height,
  className,
}: PanelProps & { limit?: number; note?: ReactNode }) {
  const all = [...(overview?.districts ?? [])].sort(byActive);
  const rows = limit ? all.slice(0, limit) : all;
  const top = rows[0];
  return (
    <RankedBarsPanel
      title="Active incidents by district"
      description={
        limit && all.length > limit
          ? `The ${limit} most active of ${all.length} districts, right now.`
          : "Open incidents in each district, right now."
      }
      rows={rows.map((d) => ({ label: d.name, value: d.active }))}
      firstColumn="District"
      valueColumn="Active incidents"
      table={districtActivityTable(rows)}
      load={load}
      height={height}
      className={className}
      note={note}
      summary={
        top
          ? `Active incidents by district. ${top.name} has the most with ${top.active}, ${top.critical} of them critical. ${formatCount(sum(all.map((d) => d.active)))} active across ${all.length} districts.`
          : "Active incidents by district."
      }
    />
  );
}

export function DistrictDistributionPanel({
  overview,
  load,
  height,
  className,
}: PanelProps) {
  const rows = [...(overview?.districts ?? [])].sort(
    (a, b) => b.active + b.resolvedToday - (a.active + a.resolvedToday),
  );
  const total = sum(rows.map((d) => d.active + d.resolvedToday));
  const top = rows[0];
  return (
    <RankedBarsPanel
      title="Incidents by district, today"
      description="Active plus resolved today, statewide."
      rows={rows.map((d) => ({
        label: d.name,
        value: d.active + d.resolvedToday,
      }))}
      firstColumn="District"
      valueColumn="Incidents today"
      table={districtDistributionTable(rows)}
      load={load}
      height={height}
      className={className}
      summary={
        top
          ? `Incidents handled today by district. ${top.name} leads with ${formatCount(top.active + top.resolvedToday)}, ${formatPct(Math.round(share(top.active + top.resolvedToday, total)))} of ${formatCount(total)} statewide.`
          : "Incidents by district."
      }
    />
  );
}

export function UnitUtilisationPanel({
  overview,
  load,
  height,
  className,
}: PanelProps) {
  const rows = [...(overview?.unitUtilisation ?? [])].sort(
    (a, b) => b.pct - a.pct,
  );
  const top = rows[0];
  return (
    <RankedBarsPanel
      title="Unit utilisation, % of duty time on incidents"
      description="Most engaged units this shift."
      rows={rows.map((r) => ({ label: r.unit, value: r.pct }))}
      firstColumn="Unit"
      valueColumn="Utilisation (%)"
      table={utilisationTable(rows)}
      unit="%"
      max={100}
      load={load}
      height={height}
      className={className}
      summary={
        top
          ? `Unit utilisation. ${top.unit} is the most engaged at ${top.pct}%; the mean across ${rows.length} listed units is ${Math.round(mean(rows.map((r) => r.pct)))}%.`
          : "Unit utilisation."
      }
    />
  );
}

/* ───────────────────────── Resources ───────────────────────── */

export type AvailabilityRow = AnalyticsOverview["resource"][number];

/** Available, engaged and off-duty units, stacked per row (vehicle type or station). */
export function AvailabilityPanel({
  title,
  description,
  rows,
  firstColumn = "Vehicle type",
  load,
  note,
  height,
  className,
}: {
  title: string;
  description?: ReactNode;
  rows: AvailabilityRow[];
  firstColumn?: string;
  load: LoadState;
  note?: ReactNode;
  height?: number;
  className?: string;
}) {
  const available = sum(rows.map((r) => r.available));
  const total = sum(rows.map((r) => r.available + r.engaged + r.offDuty));
  return (
    <ChartPanel
      title={title}
      description={description}
      load={load}
      height={height ?? rowsHeight(rows.length)}
      className={className}
      table={resourceTable(rows, firstColumn)}
      note={note}
      legend={[
        { label: "Available", color: SERIES.resolved },
        { label: "Engaged", color: SERIES.primary },
        { label: "Off duty", color: SERIES.quiet },
      ]}
      empty={
        rows.length === 0
          ? { title: "No units on the roster for this scope" }
          : undefined
      }
      summary={`${title}. ${formatCount(available)} of ${formatCount(total)} units are available, ${formatPct(Math.round(share(available, total)))}.`}
    >
      <BarRowsChart
        data={rows.map((r) => ({
          label: r.label,
          available: r.available,
          engaged: r.engaged,
          offDuty: r.offDuty,
        }))}
        labelKey="label"
        stacked
        totalLabel="Units"
        formatValue={formatCount}
        series={[
          { key: "available", label: "Available", color: SERIES.resolved },
          { key: "engaged", label: "Engaged", color: SERIES.primary },
          { key: "offDuty", label: "Off duty", color: SERIES.quiet },
        ]}
      />
    </ChartPanel>
  );
}

/* ───────────────────────── Compliance ───────────────────────── */

export function SlaCompliancePanel({
  overview,
  load,
  height = 232,
  className,
}: PanelProps) {
  const rows = overview?.sla ?? [];
  const lowest = [...rows].sort((a, b) => a.pct - b.pct)[0];
  return (
    <ChartPanel
      title="SLA compliance, % of incidents within target"
      description="Measured against demo targets for critical (P1) incidents."
      load={load}
      height={height}
      className={className}
      table={slaTable(rows)}
      note="Targets are demonstration values, not a published service standard."
      summary={
        lowest
          ? `Share of incidents handled within the demo target at each stage. ${rows.map((r) => `${r.stage} ${r.pct}%`).join(", ")}. ${lowest.stage} is the lowest.`
          : "Target compliance by stage."
      }
    >
      <MeterList
        items={rows.map((r) => ({
          key: r.stage,
          label: r.stage,
          name: `${r.stage}, ${r.targetLabel}`,
          detail: r.targetLabel,
          value: r.pct,
          valueLabel: `${r.pct}%`,
        }))}
      />
    </ChartPanel>
  );
}

export function EscalationRatePanel({
  overview,
  load,
  breakdownTitle,
  breakdown,
  breakdownColumn,
  height = 168,
  className,
}: PanelProps & {
  /** Where open escalations sit right now, for example by level or by district. */
  breakdownTitle: string;
  breakdown: { label: string; value: number }[];
  breakdownColumn: string;
}) {
  const open = sum(breakdown.map((b) => b.value));
  const max = Math.max(1, ...breakdown.map((b) => b.value));
  const rate = overview?.escalationRatePct ?? 0;
  return (
    <ChartPanel
      title="Escalation rate, % of incidents"
      description="Share of incidents escalated to a supervisor or above in the reporting period."
      load={load}
      height={height}
      className={className}
      table={countTable(breakdownColumn, "Open escalations", breakdown)}
      summary={`${formatPct(rate)} of incidents were escalated in the reporting period. ${open} escalations are open now.`}
    >
      <div className="flex h-full flex-col gap-4 @lg:flex-row @lg:gap-8">
        <div className="shrink-0">
          <p className="text-4xl leading-none font-semibold tracking-tight">
            {formatDecimal(rate)}
            <span className="ml-0.5 text-xl text-muted-foreground">%</span>
          </p>
          <p className="mt-2 max-w-48 text-xs leading-relaxed text-muted-foreground">
            of incidents escalated. {open} open right now.
          </p>
        </div>
        <div className="min-w-0 flex-1 @lg:max-w-sm">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {breakdownTitle}
          </p>
          {open === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open escalations.
            </p>
          ) : (
            <ul className="space-y-2">
              {breakdown.map((item) => (
                <li
                  key={item.label}
                  className="grid grid-cols-[minmax(0,1fr)_4rem_1.5rem] items-center gap-2 text-sm"
                >
                  <span className="truncate">{item.label}</span>
                  <span
                    aria-hidden
                    className="block h-1.5 overflow-hidden rounded-full bg-chart-1/15"
                  >
                    <span
                      className="block h-full rounded-full bg-chart-1"
                      style={{ width: `${(item.value / max) * 100}%` }}
                    />
                  </span>
                  <span className="tnum text-right font-semibold">
                    {item.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ChartPanel>
  );
}
