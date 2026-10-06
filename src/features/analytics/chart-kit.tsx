"use client";

import { Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Panel, PanelHeader } from "@/components/shared/page";
import {
  BlankState,
  ChartSkeleton,
  ErrorState,
} from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { formatNumber } from "./format";

/**
 * Chart kit: the frame, legend, tooltip and table view every chart in the product shares.
 * Colour comes only from tokens, so light and dark stay in step and nothing here introduces a hue.
 */

/** Series colours. Categorical slots are assigned in this fixed order and never cycled. */
export const SERIES = {
  primary: "var(--chart-1)",
  second: "var(--chart-2)",
  third: "var(--chart-3)",
  fourth: "var(--chart-4)",
  /** De-emphasis: targets, "off duty", context series. */
  quiet: "var(--subtle)",
  /** Severity tokens, used only when the series means that status. */
  critical: "var(--critical)",
  resolved: "var(--resolved)",
} as const;

export const AXIS_TICK = {
  fontSize: 12,
  fill: "var(--muted-foreground)",
} as const;
export const GRID_STROKE = "var(--border)";
export const SURFACE = "var(--card)";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  /** Drawn as a dashed reference (a target), not as measured data. */
  dashed?: boolean;
}

/**
 * Whether marks should animate. A chart appears in place, with no entrance animation; motion is
 * kept for the moment its data changes (a new scope or range) and is off under reduced motion.
 * Pass the chart's `data` array, and keep that array memoised: a new array reads as new data.
 */
export function useChartMotion(data: unknown): boolean {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [initial] = useState(data);
  return !reduced && data !== initial;
}

/* ───────────────────────── Loading state ───────────────────────── */

export type LoadState =
  | { status: "pending" }
  | { status: "error"; offline: boolean; retry: () => void }
  /** `refreshing` holds the previous render, dimmed, while the next slice loads. */
  | { status: "ready"; refreshing?: boolean };

export const READY: LoadState = { status: "ready" };

/* ───────────────────────── Table view ───────────────────────── */

/** The same rows feed the "View as table" twin of a chart and the CSV export. */
export interface ChartTableData {
  columns: { label: string; numeric?: boolean }[];
  rows: (string | number)[][];
}

function ChartDataTable({
  data,
  caption,
  height,
}: {
  data: ChartTableData;
  caption: string;
  height: number;
}) {
  return (
    <div style={{ minHeight: height }}>
      <div
        role="region"
        aria-label={`${caption}, data table`}
        tabIndex={0}
        className="scroll-thin overflow-auto rounded-lg border border-border/70"
        style={{ maxHeight: height }}
      >
        <table className="w-full border-collapse text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-inset">
            <tr>
              {data.columns.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={cn(
                    "px-3 py-2 font-medium whitespace-nowrap text-muted-foreground",
                    column.numeric ? "text-right" : "text-left",
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, r) => (
              <tr key={r} className="border-t border-border/60">
                {row.map((cell, c) => {
                  const text =
                    typeof cell === "number" ? formatNumber(cell) : cell;
                  return c === 0 ? (
                    <th
                      key={c}
                      scope="row"
                      className="px-3 py-1.5 text-left font-medium"
                    >
                      {text}
                    </th>
                  ) : (
                    <td
                      key={c}
                      className={cn(
                        "px-3 py-1.5",
                        data.columns[c]?.numeric && "tnum text-right",
                      )}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────────────────── Legend ───────────────────────── */

export interface LegendItem {
  label: string;
  color: string;
  /** Mirrors the mark: `rect` for bars, `line` for lines, `dash` for a target. */
  shape?: "rect" | "line" | "dash";
}

/** Compact legend. The swatch carries the colour; the text stays in text tokens. */
export function ChartLegend({
  items,
  className,
}: {
  items: LegendItem[];
  className?: string;
}) {
  return (
    <ul
      aria-label="Legend"
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          {item.shape === "dash" ? (
            <span
              aria-hidden
              className="w-3.5 border-t-2 border-dashed"
              style={{ borderColor: item.color }}
            />
          ) : (
            <span
              aria-hidden
              className={
                item.shape === "line"
                  ? "h-0.5 w-3.5 rounded-full"
                  : "size-2.5 rounded-[3px]"
              }
              style={{ background: item.color }}
            />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────── Tooltip ───────────────────────── */

interface TooltipEntry {
  name?: string | number;
  value?: unknown;
  color?: string;
  hide?: boolean;
}

/**
 * Shared tooltip body. Recharts clones this element and injects `active`, `payload` and `label`.
 * One readout lists every series at that position; the value leads and the series name follows.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  formatValue = formatNumber,
  totalLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: string | number;
  /** Appended to each value, for example "min" or "%". */
  unit?: string;
  formatValue?: (value: number) => string;
  /** When set, adds a row with the sum of the series (stacked charts). */
  totalLabel?: string;
}) {
  const rows = (payload ?? []).filter(
    (entry) => !entry.hide && typeof entry.value === "number",
  );
  if (!active || rows.length === 0) return null;
  const suffix = unit ? (unit === "%" ? "%" : ` ${unit}`) : "";
  const total = rows.reduce((acc, entry) => acc + (entry.value as number), 0);
  return (
    <div className="min-w-36 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-raised">
      {label !== undefined && label !== "" && (
        <p className="mb-1.5 font-medium text-muted-foreground">{label}</p>
      )}
      <ul className="space-y-1">
        {rows.map((entry) => (
          <li key={String(entry.name)} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="tnum ml-auto pl-4 font-semibold text-foreground">
              {formatValue(entry.value as number)}
              {suffix}
            </span>
          </li>
        ))}
      </ul>
      {totalLabel && rows.length > 1 && (
        <p className="mt-1.5 flex items-center justify-between gap-4 border-t border-border/70 pt-1.5">
          <span className="text-muted-foreground">{totalLabel}</span>
          <span className="tnum font-semibold text-foreground">
            {formatValue(total)}
            {suffix}
          </span>
        </p>
      )}
    </div>
  );
}

export const TOOLTIP_WRAPPER = { outline: "none", zIndex: 20 } as const;

/* ───────────────────────── Panel ───────────────────────── */

/**
 * One chart on a surface: title with its unit, optional legend, the plot in a fixed-height frame,
 * and a table twin behind "View as table". Loading, error and empty states live here so every
 * chart behaves the same way.
 */
export function ChartPanel({
  title,
  description,
  load,
  summary,
  table,
  legend,
  height = 256,
  note,
  actions,
  aside,
  empty,
  className,
  children,
}: {
  /** Name the measure and its unit: "Average response time, minutes". */
  title: string;
  description?: ReactNode;
  load: LoadState;
  /** One-sentence reading of the chart for screen readers. */
  summary: string;
  table?: ChartTableData;
  legend?: LegendItem[];
  /** Plot height in pixels, including the axis band. */
  height?: number;
  /** Caption under the plot: method, caveats, what the data is not. */
  note?: ReactNode;
  actions?: ReactNode;
  /** Companion detail for the plot: beside it on a wide panel, beneath it on a narrow one. */
  aside?: ReactNode;
  /** Set when the query succeeded but there is nothing to plot. */
  empty?: { title: string; description?: string };
  className?: string;
  children: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  const ready = load.status === "ready";
  const showTable = asTable && table !== undefined;

  return (
    <Panel className={cn("@container flex min-w-0 flex-col", className)}>
      <PanelHeader
        title={<span className="whitespace-normal">{title}</span>}
        description={description}
        actions={
          <>
            {actions}
            {table && (
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={asTable}
                disabled={!ready || Boolean(empty)}
                onClick={() => setAsTable((value) => !value)}
                title="View as table"
                className="text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
              >
                <Table2 aria-hidden />
                <span className="sr-only @md:not-sr-only">View as table</span>
              </Button>
            )}
          </>
        }
      />
      <div className="min-w-0 flex-1 p-4">
        {load.status === "pending" && (
          <div style={{ height }}>
            <ChartSkeleton className="h-full" />
          </div>
        )}
        {load.status === "error" && (
          <div
            className="grid place-items-center"
            style={{ minHeight: height }}
          >
            <ErrorState compact offline={load.offline} onRetry={load.retry} />
          </div>
        )}
        {ready && empty && (
          <div
            className="grid place-items-center"
            style={{ minHeight: height }}
          >
            <BlankState
              compact
              title={empty.title}
              description={empty.description}
            />
          </div>
        )}
        {ready && !empty && (
          <figure
            aria-busy={load.refreshing || undefined}
            className={cn(
              "m-0 transition-opacity",
              load.refreshing && "opacity-60",
            )}
          >
            <div
              className={cn(
                aside &&
                  "grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]",
              )}
            >
              <div className="min-w-0">
                {legend && !showTable && (
                  <ChartLegend items={legend} className="mb-3" />
                )}
                {showTable ? (
                  <ChartDataTable
                    data={table}
                    caption={title}
                    height={height}
                  />
                ) : (
                  <div
                    role="group"
                    aria-label={summary}
                    className="w-full min-w-0"
                    style={{ height }}
                  >
                    {children}
                  </div>
                )}
              </div>
              {aside && <div className="min-w-0">{aside}</div>}
            </div>
            {note && (
              <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {note}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </Panel>
  );
}

/** Height for a horizontal bar chart with one row per category, including the value axis. */
export const rowsHeight = (rows: number, pitch = 30) =>
  Math.max(120, rows * pitch + 34);
