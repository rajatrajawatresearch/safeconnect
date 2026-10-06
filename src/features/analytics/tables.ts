import type {
  AnalyticsOverview,
  CategoryShare,
  DistrictSummary,
  HourlyVolumePoint,
  TrendPoint,
} from "@/types";
import type { ChartTableData } from "./chart-kit";
import { share, sum } from "./format";

/**
 * Table twins of the charts. The same rows back "View as table" and the CSV export,
 * so what is exported is exactly what is on screen.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;

export const hourlyTable = (rows: HourlyVolumePoint[]): ChartTableData => ({
  columns: [
    { label: "Hour" },
    { label: "Incidents", numeric: true },
    { label: "Critical (P1)", numeric: true },
  ],
  rows: rows.map((r) => [r.hour, r.incidents, r.critical]),
});

export const responseTable = (trend: TrendPoint[]): ChartTableData => ({
  columns: [
    { label: "Day" },
    { label: "Average response (min)", numeric: true },
    { label: "Demo target (min)", numeric: true },
  ],
  rows: trend.map((t) => [t.day, t.responseMin, t.targetMin]),
});

export const volumeTable = (trend: TrendPoint[]): ChartTableData => ({
  columns: [{ label: "Day" }, { label: "Incidents opened", numeric: true }],
  rows: trend.map((t) => [t.day, t.opened]),
});

export const flowTable = (trend: TrendPoint[]): ChartTableData => ({
  columns: [
    { label: "Day" },
    { label: "Opened", numeric: true },
    { label: "Resolved", numeric: true },
  ],
  rows: trend.map((t) => [t.day, t.opened, t.resolved]),
});

export const resolutionTimeTable = (trend: TrendPoint[]): ChartTableData => ({
  columns: [
    { label: "Day" },
    { label: "Average resolution (min)", numeric: true },
  ],
  rows: trend.map((t) => [t.day, t.resolutionMin]),
});

export const activeResolvedTable = (
  rows: AnalyticsOverview["activeVsResolved"],
): ChartTableData => ({
  columns: [
    { label: "Time window" },
    { label: "Active", numeric: true },
    { label: "Resolved", numeric: true },
  ],
  rows: rows.map((r) => [r.label, r.active, r.resolved]),
});

export const categoryTable = (rows: CategoryShare[]): ChartTableData => {
  const total = sum(rows.map((r) => r.count));
  return {
    columns: [
      { label: "Category" },
      { label: "Incidents", numeric: true },
      { label: "Share (%)", numeric: true },
    ],
    rows: rows.map((r) => [r.category, r.count, round1(share(r.count, total))]),
  };
};

export const districtActivityTable = (
  rows: DistrictSummary[],
): ChartTableData => ({
  columns: [
    { label: "District" },
    { label: "Active", numeric: true },
    { label: "Critical", numeric: true },
  ],
  rows: rows.map((d) => [d.name, d.active, d.critical]),
});

export const districtDistributionTable = (
  rows: DistrictSummary[],
): ChartTableData => ({
  columns: [
    { label: "District" },
    { label: "Incidents today", numeric: true },
    { label: "Active", numeric: true },
    { label: "Resolved today", numeric: true },
  ],
  rows: rows.map((d) => [
    d.name,
    d.active + d.resolvedToday,
    d.active,
    d.resolvedToday,
  ]),
});

export const resourceTable = (
  rows: AnalyticsOverview["resource"],
  firstColumn = "Vehicle type",
): ChartTableData => ({
  columns: [
    { label: firstColumn },
    { label: "Available", numeric: true },
    { label: "Engaged", numeric: true },
    { label: "Off duty", numeric: true },
    { label: "Total", numeric: true },
  ],
  rows: rows.map((r) => [
    r.label,
    r.available,
    r.engaged,
    r.offDuty,
    r.available + r.engaged + r.offDuty,
  ]),
});

export const utilisationTable = (
  rows: AnalyticsOverview["unitUtilisation"],
): ChartTableData => ({
  columns: [{ label: "Unit" }, { label: "Utilisation (%)", numeric: true }],
  rows: rows.map((r) => [r.unit, r.pct]),
});

export const slaTable = (rows: AnalyticsOverview["sla"]): ChartTableData => ({
  columns: [
    { label: "Stage" },
    { label: "Within target (%)", numeric: true },
    { label: "Demo target" },
  ],
  rows: rows.map((r) => [r.stage, r.pct, r.targetLabel]),
});

export const countTable = (
  firstColumn: string,
  valueColumn: string,
  rows: { label: string; value: number }[],
): ChartTableData => ({
  columns: [{ label: firstColumn }, { label: valueColumn, numeric: true }],
  rows: rows.map((r) => [r.label, r.value]),
});
