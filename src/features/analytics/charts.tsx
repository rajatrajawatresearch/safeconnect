"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  BarStack,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Rectangle,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  AXIS_TICK,
  ChartTooltip,
  GRID_STROKE,
  SURFACE,
  TOOLTIP_WRAPPER,
  useChartMotion,
  type ChartSeries,
} from "./chart-kit";
import { formatNumber } from "./format";

/**
 * Themed Recharts wrappers. Marks are thin, grids are hairlines, and every colour is a token.
 * Each wrapper fills its parent, so give the parent a fixed height (ChartPanel does).
 */

export type ChartDatum = Record<string, string | number>;

const INITIAL = { width: 480, height: 240 };
// Layout props are module constants: a fresh object on every render would make the chart
// recompute its geometry and replay its animation whenever the page re-renders.
const AXIS_LINE = { stroke: GRID_STROKE };
const LINE_CURSOR = { stroke: "var(--input)", strokeWidth: 1 };
const BAND_CURSOR = { fill: "var(--muted)", opacity: 0.7 };
const LINE_MARGIN = { top: 8, right: 12, bottom: 0, left: 0 };
const LINE_MARGIN_LABELLED = { top: 8, right: 40, bottom: 0, left: 0 };
const COLUMN_MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };
const ROWS_MARGIN = { top: 0, right: 12, bottom: 0, left: 0 };
const ROWS_MARGIN_LABELLED = { top: 0, right: 48, bottom: 0, left: 0 };
const ZERO_BASED: [number, "auto"] = [0, "auto"];
const ANIMATION_MS = 280;
/** Surface-coloured gap between touching fills, so neighbours separate without an outline. */
const GAP = 2;

/* ───────────────────────── Line: change over time ───────────────────────── */

export function TrendLineChart({
  data,
  xKey,
  series,
  unit,
  formatValue = formatNumber,
  domain,
  ticks,
  endLabel = true,
}: {
  data: ChartDatum[];
  xKey: string;
  series: ChartSeries[];
  unit?: string;
  formatValue?: (value: number) => string;
  /** Value-axis range. Defaults to zero-based. */
  domain?: [number, number];
  /** Explicit value-axis ticks, when the range should land on round numbers. */
  ticks?: number[];
  /** Marks and labels the latest value of each measured series. */
  endLabel?: boolean;
}) {
  const animate = useChartMotion(data);
  const last = data[data.length - 1];
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={0}
      initialDimension={INITIAL}
    >
      <LineChart
        data={data}
        margin={endLabel ? LINE_MARGIN_LABELLED : LINE_MARGIN}
      >
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis
          dataKey={xKey}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={AXIS_LINE}
          tickMargin={8}
          minTickGap={20}
          interval="preserveStartEnd"
        />
        <YAxis
          width="auto"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickCount={5}
          ticks={ticks}
          domain={domain ?? ZERO_BASED}
          tickFormatter={formatValue}
        />
        <Tooltip
          content={<ChartTooltip unit={unit} formatValue={formatValue} />}
          cursor={LINE_CURSOR}
          isAnimationActive={false}
          wrapperStyle={TOOLTIP_WRAPPER}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.label}
            type="linear"
            stroke={s.color}
            strokeWidth={s.dashed ? 1.5 : 2}
            strokeDasharray={s.dashed ? "4 4" : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={
              s.dashed
                ? false
                : { r: 4, fill: s.color, stroke: SURFACE, strokeWidth: 2 }
            }
            isAnimationActive={animate}
            animationDuration={ANIMATION_MS}
          />
        ))}
        {endLabel &&
          last &&
          series
            .filter((s) => !s.dashed)
            .map((s) => (
              <ReferenceDot
                key={s.key}
                x={last[xKey]}
                y={Number(last[s.key])}
                r={4}
                fill={s.color}
                stroke={SURFACE}
                strokeWidth={2}
                ifOverflow="visible"
                label={{
                  value: formatValue(Number(last[s.key])),
                  position: "right",
                  offset: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  fill: "var(--foreground)",
                }}
              />
            ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ───────────────────────── Columns and rows: magnitude ───────────────────────── */

/**
 * Upper (or right-hand) segments of a stack give up two pixels where they touch the one before,
 * leaving a surface gap. A segment with nothing beneath it stays on the baseline.
 */
function stackedSegment(before: string[], direction: "up" | "right") {
  return function renderSegment(props: BarShapeProps) {
    const touches = before.some((key) => Number(props.payload?.[key]) > 0);
    if (!touches) return <Rectangle {...props} />;
    return direction === "up" ? (
      <Rectangle {...props} height={Math.max(0, props.height - GAP)} />
    ) : (
      <Rectangle
        {...props}
        x={props.x + GAP}
        width={Math.max(0, props.width - GAP)}
      />
    );
  };
}

/** Vertical columns over an ordered axis (hours, days). Stacked for part-to-whole, grouped otherwise. */
export function ColumnChart({
  data,
  xKey,
  series,
  stacked,
  unit,
  formatValue = formatNumber,
  totalLabel,
  xInterval = "preserveStartEnd",
  formatTick,
}: {
  data: ChartDatum[];
  xKey: string;
  series: ChartSeries[];
  stacked?: boolean;
  unit?: string;
  formatValue?: (value: number) => string;
  totalLabel?: string;
  /** Show every nth category label (0 shows all). Defaults to as many as fit. */
  xInterval?: number | "preserveStartEnd";
  /** Shortens category labels on the axis; the tooltip keeps the full label. */
  formatTick?: (label: string) => string;
}) {
  const animate = useChartMotion(data);
  const bars = series.map((s, index) => (
    <Bar
      key={s.key}
      dataKey={s.key}
      name={s.label}
      fill={s.color}
      radius={stacked ? undefined : [4, 4, 0, 0]}
      shape={
        stacked && index > 0
          ? stackedSegment(
              series.slice(0, index).map((x) => x.key),
              "up",
            )
          : undefined
      }
      isAnimationActive={animate}
      animationDuration={ANIMATION_MS}
    />
  ));
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={0}
      initialDimension={INITIAL}
    >
      <BarChart
        data={data}
        margin={COLUMN_MARGIN}
        barCategoryGap="24%"
        barGap={GAP}
        maxBarSize={24}
      >
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis
          dataKey={xKey}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={AXIS_LINE}
          tickMargin={8}
          minTickGap={12}
          interval={xInterval}
          tickFormatter={formatTick}
        />
        <YAxis
          width="auto"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickCount={5}
          allowDecimals={false}
          tickFormatter={formatValue}
        />
        <Tooltip
          content={
            <ChartTooltip
              unit={unit}
              formatValue={formatValue}
              totalLabel={stacked ? totalLabel : undefined}
            />
          }
          cursor={BAND_CURSOR}
          isAnimationActive={false}
          wrapperStyle={TOOLTIP_WRAPPER}
        />
        {stacked ? <BarStack radius={[4, 4, 0, 0]}>{bars}</BarStack> : bars}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars, one row per named category. The form for rankings and long labels. */
export function BarRowsChart({
  data,
  labelKey,
  series,
  stacked,
  unit,
  formatValue = formatNumber,
  totalLabel,
  max,
}: {
  data: ChartDatum[];
  labelKey: string;
  series: ChartSeries[];
  stacked?: boolean;
  unit?: string;
  formatValue?: (value: number) => string;
  totalLabel?: string;
  /** Fixes the end of the value axis, for example 100 for percentages. */
  max?: number;
}) {
  const single = series.length === 1;
  const bars = series.map((s, index) => (
    <Bar
      key={s.key}
      dataKey={s.key}
      name={s.label}
      fill={s.color}
      radius={stacked ? undefined : [0, 4, 4, 0]}
      shape={
        stacked && index > 0
          ? stackedSegment(
              series.slice(0, index).map((x) => x.key),
              "right",
            )
          : undefined
      }
      // Value labels ride these bars, and several of these charts follow live data:
      // animating every update would make the labels blink.
      isAnimationActive={false}
    >
      {single && (
        <LabelList
          dataKey={s.key}
          position="right"
          offset={8}
          fontSize={12}
          fill="var(--foreground)"
          formatter={(value: unknown) =>
            `${formatValue(Number(value))}${unit === "%" ? "%" : ""}`
          }
        />
      )}
    </Bar>
  ));
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={0}
      initialDimension={INITIAL}
    >
      <BarChart
        layout="vertical"
        data={data}
        margin={single ? ROWS_MARGIN_LABELLED : ROWS_MARGIN}
        barCategoryGap="28%"
        barGap={GAP}
        maxBarSize={16}
      >
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tickCount={5}
          minTickGap={12}
          allowDecimals={false}
          domain={[0, max ?? "auto"]}
          tickFormatter={formatValue}
        />
        <YAxis
          type="category"
          dataKey={labelKey}
          width="auto"
          interval={0}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={AXIS_LINE}
          tickMargin={6}
        />
        <Tooltip
          content={
            <ChartTooltip
              unit={unit}
              formatValue={formatValue}
              totalLabel={stacked ? totalLabel : undefined}
            />
          }
          cursor={BAND_CURSOR}
          isAnimationActive={false}
          wrapperStyle={TOOLTIP_WRAPPER}
        />
        {stacked ? <BarStack radius={[0, 4, 4, 0]}>{bars}</BarStack> : bars}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ───────────────────────── Meters: one ratio against a limit ───────────────────────── */

export interface MeterItem {
  key: string;
  label: ReactNode;
  /** Plain-text name for assistive technology when `label` is not a string. */
  name: string;
  detail?: ReactNode;
  value: number;
  max?: number;
  valueLabel: string;
}

/** Labelled meters. The track is a lighter step of the fill, so the whole bar reads as one scale. */
export function MeterList({
  items,
  className,
}: {
  items: MeterItem[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-3.5", className)}>
      {items.map((item) => {
        const max = item.max ?? 100;
        const pct = max > 0 ? Math.min(100, (item.value / max) * 100) : 0;
        return (
          <li key={item.key}>
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 text-sm">
                <span className="font-medium">{item.label}</span>
                {item.detail && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                )}
              </div>
              <span className="tnum shrink-0 text-sm font-semibold">
                {item.valueLabel}
              </span>
            </div>
            <div
              role="meter"
              aria-label={item.name}
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={item.value}
              aria-valuetext={item.valueLabel}
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-chart-1/15"
            >
              <div
                className="h-full rounded-full bg-chart-1"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Small bar under a table figure, for comparing rows at a glance. */
export function InlineBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <span
      aria-hidden
      className={cn(
        "block h-1 overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <span
        className="block h-full rounded-full bg-chart-1"
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}
