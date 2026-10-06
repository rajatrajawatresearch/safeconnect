"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ChevronsUpDown,
  Gauge,
  ShieldCheck,
  Siren,
  Timer,
  TriangleAlert,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState, type ReactNode } from "react";
import { OpsMap, type MapSelection } from "@/components/shared/ops-map";
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
import { ToneChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { deployment } from "@/config/deployment";
import { districtById } from "@/data/demo/geo";
import type { LoadState } from "@/features/analytics/chart-kit";
import { InlineBar, MeterList } from "@/features/analytics/charts";
import {
  formatCount,
  formatDecimal,
  mean,
  share,
  sum,
} from "@/features/analytics/format";
import { useOverview } from "@/features/analytics/use-overview";
import { useIsMd } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import type { DistrictSummary } from "@/types";
import { HOME_DISTRICT_ID, useCommandScope } from "./use-command-scope";

/* ───────────────────────── Table model ───────────────────────── */

const NO_DISTRICTS: DistrictSummary[] = [];

const availabilityPct = (d: DistrictSummary) =>
  share(d.unitsAvailable, d.unitsTotal);

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});
const helper = createColumnHelper<typeof features, DistrictSummary>();

const columns = helper.columns([
  helper.accessor("name", { id: "name", sortFn: "alphanumeric" }),
  helper.accessor("active", { id: "active", sortDescFirst: true }),
  helper.accessor("critical", { id: "critical", sortDescFirst: true }),
  helper.accessor("resolvedToday", { id: "resolved", sortDescFirst: true }),
  helper.accessor("avgResponseMin", { id: "response", sortDescFirst: false }),
  helper.accessor(availabilityPct, { id: "units", sortDescFirst: true }),
  helper.accessor("slaPct", { id: "compliance", sortDescFirst: true }),
  helper.accessor("escalations", { id: "escalations", sortDescFirst: true }),
]);

type ColumnId =
  | "name"
  | "active"
  | "critical"
  | "resolved"
  | "response"
  | "units"
  | "compliance"
  | "escalations";

const COLUMN_META: Record<
  ColumnId,
  { label: string; sortLabel: string; desc: boolean; align: "left" | "right" }
> = {
  name: { label: "District", sortLabel: "Name", desc: false, align: "left" },
  active: {
    label: "Active",
    sortLabel: "Active incidents",
    desc: true,
    align: "left",
  },
  critical: {
    label: "Critical",
    sortLabel: "Critical incidents",
    desc: true,
    align: "right",
  },
  resolved: {
    label: "Resolved today",
    sortLabel: "Resolved today",
    desc: true,
    align: "left",
  },
  response: {
    label: "Average response",
    sortLabel: "Fastest response",
    desc: false,
    align: "left",
  },
  units: {
    label: "Units available",
    sortLabel: "Unit availability",
    desc: true,
    align: "left",
  },
  compliance: {
    label: "Target compliance",
    sortLabel: "Target compliance",
    desc: true,
    align: "left",
  },
  escalations: {
    label: "Escalations",
    sortLabel: "Open escalations",
    desc: true,
    align: "right",
  },
};

interface Maxima {
  active: number;
  resolved: number;
  response: number;
}

/** A figure with a thin bar beneath it, so a column can be compared by eye. */
function BarCell({
  children,
  value,
  max,
}: {
  children: ReactNode;
  value: number;
  max: number;
}) {
  return (
    <>
      <span className="tnum font-medium">{children}</span>
      <InlineBar value={value} max={max} className="mt-1.5 max-w-24" />
    </>
  );
}

function DistrictCell({
  column,
  district,
  max,
  onOpen,
}: {
  column: ColumnId;
  district: DistrictSummary;
  max: Maxima;
  onOpen: () => void;
}) {
  switch (column) {
    case "name":
      return (
        <button
          type="button"
          onClick={onOpen}
          className="rounded text-left font-medium hover:underline"
        >
          {district.name}
        </button>
      );
    case "active":
      return (
        <BarCell value={district.active} max={max.active}>
          {district.active}
        </BarCell>
      );
    case "critical":
      return (
        <span
          className={cn(
            "tnum",
            district.critical > 0
              ? "font-semibold text-critical-fg"
              : "text-muted-foreground",
          )}
        >
          {district.critical}
        </span>
      );
    case "resolved":
      return (
        <BarCell value={district.resolvedToday} max={max.resolved}>
          {formatCount(district.resolvedToday)}
        </BarCell>
      );
    case "response":
      return (
        <BarCell value={district.avgResponseMin} max={max.response}>
          {formatDecimal(district.avgResponseMin)}
          <span className="font-normal text-muted-foreground"> min</span>
        </BarCell>
      );
    case "units":
      return (
        <BarCell value={district.unitsAvailable} max={district.unitsTotal}>
          {district.unitsAvailable}
          <span className="font-normal text-muted-foreground">
            {" "}
            of {district.unitsTotal}
          </span>
        </BarCell>
      );
    case "compliance":
      return (
        <BarCell value={district.slaPct} max={100}>
          {district.slaPct}%
        </BarCell>
      );
    case "escalations":
      return district.escalations > 0 ? (
        <ToneChip tone="high">
          <span className="tnum">{district.escalations}</span> open
        </ToneChip>
      ) : (
        <span className="tnum text-muted-foreground">0</span>
      );
  }
}

/* ───────────────────────── Comparison table and cards ───────────────────────── */

function DistrictCard({
  district,
  selected,
  onOpen,
}: {
  district: DistrictSummary;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-pressed={selected}
        className={cn(
          "block w-full rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50",
          selected ? "border-primary/60 bg-accent/60" : "border-border",
        )}
      >
        <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <span className="text-sm font-semibold">{district.name}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            {district.critical > 0 && (
              <ToneChip tone="critical">
                <span className="tnum">{district.critical}</span> critical
              </ToneChip>
            )}
            {district.escalations > 0 && (
              <ToneChip tone="high">
                <span className="tnum">{district.escalations}</span> escalated
              </ToneChip>
            )}
          </span>
        </span>
        <span className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
          {[
            { label: "Active", value: String(district.active) },
            {
              label: "Resolved today",
              value: formatCount(district.resolvedToday),
            },
            {
              label: "Average response",
              value: `${formatDecimal(district.avgResponseMin)} min`,
            },
            {
              label: "Units available",
              value: `${district.unitsAvailable} of ${district.unitsTotal}`,
            },
            { label: "Target compliance", value: `${district.slaPct}%` },
          ].map((item) => (
            <span key={item.label} className="block min-w-0">
              <span className="block text-xs text-muted-foreground">
                {item.label}
              </span>
              <span className="tnum block font-semibold">{item.value}</span>
            </span>
          ))}
        </span>
      </button>
    </li>
  );
}

function ComparisonPanel({
  districts,
  load,
  selectedId,
  onSelect,
  className,
}: {
  districts: DistrictSummary[];
  load: LoadState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const isMd = useIsMd();
  const sortId = useId();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "active", desc: true },
  ]);
  const table = useTable({
    features,
    columns,
    data: districts,
    state: { sorting },
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getRowId: (district) => district.districtId,
  });
  const rows = table.getRowModel().rows;
  const max: Maxima = useMemo(
    () => ({
      active: Math.max(1, ...districts.map((d) => d.active)),
      resolved: Math.max(1, ...districts.map((d) => d.resolvedToday)),
      response: Math.max(1, ...districts.map((d) => d.avgResponseMin)),
    }),
    [districts],
  );
  const sortedBy = (sorting[0]?.id ?? "active") as ColumnId;

  return (
    <Panel className={cn("flex min-w-0 flex-col", className)}>
      <PanelHeader
        title="District comparison"
        description={
          load.status === "ready"
            ? `${districts.length} districts. Select a district for its detail.`
            : undefined
        }
      />
      {load.status === "pending" && <ListSkeleton rows={8} className="p-4" />}
      {load.status === "error" && (
        <ErrorState offline={load.offline} onRetry={load.retry} />
      )}
      {load.status === "ready" && districts.length === 0 && (
        <BlankState
          title="No districts to compare"
          description="District figures appear here once districts report."
        />
      )}
      {load.status === "ready" && districts.length > 0 && isMd && (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <caption className="sr-only">
              District comparison. Column headers sort the table.
            </caption>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b border-border/70">
                  {group.headers.map((header) => {
                    const id = header.column.id as ColumnId;
                    const meta = COLUMN_META[id];
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : "none"
                        }
                        className={cn(
                          "px-2 py-1.5 text-xs font-medium first:pl-3 last:pr-3",
                          meta.align === "right" ? "text-right" : "text-left",
                        )}
                      >
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "inline-flex items-center gap-1 rounded px-1 py-1 whitespace-nowrap hover:text-foreground",
                            sorted
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {meta.label}
                          {sorted === "asc" ? (
                            <ArrowUp aria-hidden className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDown aria-hidden className="size-3.5" />
                          ) : (
                            <ChevronsUpDown
                              aria-hidden
                              className="size-3.5 opacity-50"
                            />
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row) => {
                const district = row.original;
                const selected = district.districtId === selectedId;
                return (
                  <tr
                    key={row.id}
                    data-state={selected ? "selected" : undefined}
                    onClick={() => onSelect(district.districtId)}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40 data-[state=selected]:bg-accent/60"
                  >
                    {row.getAllCells().map((cell) => {
                      const id = cell.column.id as ColumnId;
                      const content = (
                        <DistrictCell
                          column={id}
                          district={district}
                          max={max}
                          onOpen={() => onSelect(district.districtId)}
                        />
                      );
                      return id === "name" ? (
                        <th
                          key={cell.id}
                          scope="row"
                          className="py-2.5 pr-2 pl-4 text-left font-normal"
                        >
                          {content}
                        </th>
                      ) : (
                        <td
                          key={cell.id}
                          className={cn(
                            "px-3 py-2.5 last:pr-4",
                            COLUMN_META[id].align === "right" && "text-right",
                          )}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {load.status === "ready" && districts.length > 0 && !isMd && (
        <div className="p-3">
          <div className="mb-3 flex items-center gap-2">
            <Label htmlFor={sortId} className="text-xs text-muted-foreground">
              Sort by
            </Label>
            <Select
              value={sortedBy}
              onValueChange={(next) =>
                setSorting([
                  { id: next, desc: COLUMN_META[next as ColumnId].desc },
                ])
              }
            >
              <SelectTrigger id={sortId} className="min-w-44 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(COLUMN_META) as ColumnId[]).map((id) => (
                  <SelectItem key={id} value={id}>
                    {COLUMN_META[id].sortLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ul className="space-y-2">
            {rows.map((row) => (
              <DistrictCard
                key={row.id}
                district={row.original}
                selected={row.original.districtId === selectedId}
                onOpen={() => onSelect(row.original.districtId)}
              />
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* ───────────────────────── State map ───────────────────────── */

function StateMapPanel({
  districts,
  load,
  selectedId,
  onSelect,
  className,
}: {
  districts: DistrictSummary[];
  load: LoadState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const isMd = useIsMd();
  // The configured state view fits tablet and desktop panels; a phone needs the view fitted to the districts.
  const focus = useMemo(
    () => (isMd ? undefined : districts.map((d) => d.center)),
    [districts, isMd],
  );
  const selected: MapSelection | null = selectedId
    ? { type: "district", id: selectedId }
    : null;
  return (
    <Panel className={cn("flex min-w-0 flex-col overflow-hidden", className)}>
      <PanelHeader
        title={`${deployment.stateName} by district`}
        description="Select a bubble to open that district"
      />
      <div className="relative min-h-80 flex-1 sm:min-h-[23rem]">
        {load.status === "pending" && (
          <div
            aria-busy="true"
            aria-label="Loading map"
            className="map-ground absolute inset-0 animate-pulse"
          />
        )}
        {load.status === "error" && (
          <div className="absolute inset-0 grid place-items-center">
            <ErrorState compact offline={load.offline} onRetry={load.retry} />
          </div>
        )}
        {load.status === "ready" && (
          <OpsMap
            center={deployment.stateCenter}
            zoom={deployment.stateZoom}
            districts={districts}
            focus={focus}
            selected={selected}
            onSelect={(selection) => {
              if (selection.type === "district") onSelect(selection.id);
            }}
            label={`${deployment.stateName} map with one bubble per district`}
            className="absolute inset-0"
          />
        )}
      </div>
      <ul
        aria-label="Map legend"
        className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground"
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
    </Panel>
  );
}

/* ───────────────────────── Detail drawer ───────────────────────── */

const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/** "Fastest", "3rd fastest" or "Slowest", for a rank where 1 is the quickest. */
const rankLabel = (rank: number, of: number) =>
  rank === 1 ? "Fastest" : rank === of ? "Slowest" : `${ordinal(rank)} fastest`;

function signedDifference(value: number, reference: number, unit: string) {
  const diff = value - reference;
  if (Math.abs(diff) < 0.05) return `level with the state average`;
  return `${formatDecimal(Math.abs(diff))} ${unit} ${diff > 0 ? "above" : "below"} the state average`;
}

function DistrictDetail({
  district,
  all,
}: {
  district: DistrictSummary;
  all: DistrictSummary[];
}) {
  const { setScope } = useCommandScope();
  const profile = districtById(district.districtId);
  const stateResponse = mean(all.map((d) => d.avgResponseMin));
  const stateCompliance = mean(all.map((d) => d.slaPct));
  const responseRank =
    all.filter((d) => d.avgResponseMin < district.avgResponseMin).length + 1;
  const isHome = district.districtId === HOME_DISTRICT_ID;

  return (
    <div className="scroll-thin flex-1 space-y-5 overflow-y-auto px-4 pb-6">
      <div className="flex flex-wrap gap-1.5">
        {profile && (
          <ToneChip tone="neutral">
            {profile.kind === "commissionerate"
              ? "Commissionerate"
              : "District"}
          </ToneChip>
        )}
        {profile && (
          <ToneChip tone="neutral">
            <span className="tnum">{profile.stations}</span> stations
          </ToneChip>
        )}
        {district.critical > 0 && (
          <ToneChip tone="critical">
            <span className="tnum">{district.critical}</span> critical
          </ToneChip>
        )}
        {district.escalations > 0 && (
          <ToneChip tone="high">
            <span className="tnum">{district.escalations}</span> escalated
          </ToneChip>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        {[
          { label: "Active incidents", value: String(district.active) },
          { label: "Critical incidents", value: String(district.critical) },
          {
            label: "Resolved today",
            value: formatCount(district.resolvedToday),
          },
          { label: "Open escalations", value: String(district.escalations) },
        ].map((item) => (
          <div key={item.label}>
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="tnum mt-0.5 text-xl font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Response">
        <h3 className="text-sm font-semibold">Response</h3>
        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight">
            {formatDecimal(district.avgResponseMin)}
          </span>
          <span className="text-sm text-muted-foreground">
            min average response
          </span>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {rankLabel(responseRank, all.length)} of {all.length} districts,{" "}
          {signedDifference(district.avgResponseMin, stateResponse, "min")} (
          {formatDecimal(stateResponse)} min).
        </p>
      </section>

      <section aria-label="Resources and compliance">
        <h3 className="mb-3 text-sm font-semibold">Resources and compliance</h3>
        <MeterList
          items={[
            {
              key: "units",
              label: "Units available",
              name: "Units available",
              detail: `${district.unitsAvailable} of ${district.unitsTotal}`,
              value: district.unitsAvailable,
              max: district.unitsTotal,
              valueLabel: `${Math.round(availabilityPct(district))}%`,
            },
            {
              key: "compliance",
              label: "Target compliance",
              name: "Target compliance",
              detail: "demo targets",
              value: district.slaPct,
              valueLabel: `${district.slaPct}%`,
            },
          ]}
        />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Compliance is{" "}
          {signedDifference(district.slaPct, stateCompliance, "points")} (
          {Math.round(stateCompliance)}%).
        </p>
      </section>

      {isHome ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/command" onClick={() => setScope("district")}>
              Open district overview <ArrowUpRight aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/command/operations">Operations</Link>
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border border-border/70 bg-inset px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          This demonstration carries live incidents and units for{" "}
          {districtById(HOME_DISTRICT_ID)?.name ?? "the home district"} only.
          Other districts show aggregated figures.
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Highlights ───────────────────────── */

const FIGURE_GRID =
  "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-2 xl:grid-rows-3";

const minBy = (
  rows: DistrictSummary[],
  value: (d: DistrictSummary) => number,
) => rows.reduce((best, d) => (value(d) < value(best) ? d : best), rows[0]);

function Highlights({
  districts,
  load,
  className,
}: {
  districts: DistrictSummary[];
  load: LoadState;
  className?: string;
}) {
  if (load.status === "pending")
    return (
      <CardGridSkeleton cards={6} className={cn(FIGURE_GRID, className)} />
    );
  if (load.status === "error" || districts.length === 0) return null;
  const busiest = minBy(districts, (d) => -d.active);
  const critical = sum(districts.map((d) => d.critical));
  const fastest = minBy(districts, (d) => d.avgResponseMin);
  const slowest = minBy(districts, (d) => -d.avgResponseMin);
  const leastCompliant = minBy(districts, (d) => d.slaPct);
  const thinnest = minBy(districts, availabilityPct);
  return (
    <section
      aria-label="Comparison highlights"
      className={cn(FIGURE_GRID, className)}
    >
      <StatCard
        label="Active incidents"
        value={formatCount(sum(districts.map((d) => d.active)))}
        icon={Siren}
        hint={`Most in ${busiest.name} (${busiest.active})`}
      />
      <StatCard
        label="Critical incidents"
        value={critical}
        icon={TriangleAlert}
        tone={critical > 0 ? "critical" : undefined}
        hint={`In ${districts.filter((d) => d.critical > 0).length} of ${districts.length} districts`}
      />
      <StatCard
        label="Fastest average response"
        value={formatDecimal(fastest.avgResponseMin)}
        unit="min"
        icon={Timer}
        hint={fastest.name}
      />
      <StatCard
        label="Slowest average response"
        value={formatDecimal(slowest.avgResponseMin)}
        unit="min"
        icon={Gauge}
        hint={slowest.name}
      />
      <StatCard
        label="Lowest target compliance"
        value={`${leastCompliant.slaPct}%`}
        icon={ShieldCheck}
        hint={`${leastCompliant.name} · demo targets`}
      />
      <StatCard
        label="Lowest unit availability"
        value={`${Math.round(availabilityPct(thinnest))}%`}
        icon={Truck}
        hint={`${thinnest.name} · ${thinnest.unitsAvailable} of ${thinnest.unitsTotal}`}
      />
    </section>
  );
}

/* ───────────────────────── Screen ───────────────────────── */

export function DistrictsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const isMd = useIsMd();
  const { overview, load } = useOverview("state");
  const districts = overview?.districts ?? NO_DISTRICTS;
  const selectedId = params.get("id");
  const selected = districts.find((d) => d.districtId === selectedId);

  const select = (id: string | null) =>
    router.replace(id ? `${pathname}?id=${encodeURIComponent(id)}` : pathname, {
      scroll: false,
    });

  return (
    <PageContainer width="full">
      <PageHeader
        title="Districts"
        description={`Compare districts across ${deployment.stateName} on activity, response and resources. Figures are aggregated demonstration data.`}
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Highlights
          districts={districts}
          load={load}
          className="xl:order-last xl:col-span-5"
        />
        <StateMapPanel
          districts={districts}
          load={load}
          selectedId={selectedId}
          onSelect={select}
          className="xl:col-span-7"
        />
      </div>

      <ComparisonPanel
        districts={districts}
        load={load}
        selectedId={selectedId}
        onSelect={select}
        className="mt-4"
      />

      <Sheet
        open={selected !== undefined}
        onOpenChange={(open) => {
          if (!open) select(null);
        }}
      >
        <SheetContent
          side={isMd ? "right" : "bottom"}
          className={cn(
            "gap-0",
            isMd ? "w-full sm:max-w-md" : "max-h-[85dvh] rounded-t-2xl",
          )}
        >
          <SheetHeader>
            <SheetTitle>{selected?.name ?? "District"}</SheetTitle>
            <SheetDescription>
              District detail, compared with the state average
            </SheetDescription>
          </SheetHeader>
          {selected && <DistrictDetail district={selected} all={districts} />}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
