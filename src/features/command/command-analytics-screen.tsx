"use client";

import { CircleCheck, Download, Gauge, Hourglass, Timer } from "lucide-react";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { ESCALATION_LEVEL_LABEL } from "@/config/incident";
import type { LoadState } from "@/features/analytics/chart-kit";
import {
  RANGE_OPTIONS,
  SegmentedControl,
  type RangeDays,
} from "@/features/analytics/controls";
import { downloadCsv, toCsv, type CsvSection } from "@/features/analytics/csv";
import {
  formatCount,
  formatDecimal,
  formatPct,
  mean,
  share,
  sum,
} from "@/features/analytics/format";
import {
  ActiveVsResolvedPanel,
  CategoryPanel,
  DistrictDistributionPanel,
  EscalationRatePanel,
  IncidentVolumePanel,
  ResolutionTimePanel,
  ResponseTrendPanel,
  SlaCompliancePanel,
  trendWindow,
  UnitUtilisationPanel,
} from "@/features/analytics/panels";
import {
  activeResolvedTable,
  categoryTable,
  countTable,
  districtDistributionTable,
  resolutionTimeTable,
  responseTable,
  slaTable,
  utilisationTable,
  volumeTable,
} from "@/features/analytics/tables";
import { useOverview } from "@/features/analytics/use-overview";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type { AnalyticsOverview, TrendPoint } from "@/types";
import { ScopeSwitch } from "./command-ui";
import { useCommandScope } from "./use-command-scope";

const FIGURE_GRID = "grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-4";
const ROW_HEIGHT = 256;
const TALL_ROW_HEIGHT = 300;

/* ───────────────────────── Period figures ───────────────────────── */

/** Signed change against the comparison period, with the direction that counts as good. */
function changeAgainst(
  current: number,
  previous: number | null,
  lowerIsBetter: boolean,
) {
  if (previous === null || previous === 0) return undefined;
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.05) return undefined;
  const direction: "up" | "down" = pct > 0 ? "up" : "down";
  return {
    value: `${formatDecimal(Math.abs(pct))}%`,
    direction,
    good: lowerIsBetter ? pct < 0 : pct > 0,
  };
}

function PeriodFigures({
  period,
  previous,
  load,
  days,
}: {
  period: TrendPoint[];
  /** The same number of days immediately before the period, when the series reaches that far. */
  previous: TrendPoint[];
  load: LoadState;
  days: number;
}) {
  if (load.status === "pending")
    return <CardGridSkeleton cards={4} className={FIGURE_GRID} />;
  if (load.status === "error")
    return (
      <Panel>
        <ErrorState compact offline={load.offline} onRetry={load.retry} />
      </Panel>
    );

  const hasPrevious = previous.length === period.length && period.length > 0;
  const compare = hasPrevious ? `vs previous ${days} days` : undefined;
  const response = mean(period.map((t) => t.responseMin));
  const resolution = mean(period.map((t) => t.resolutionMin));
  const opened = sum(period.map((t) => t.opened));
  const resolved = sum(period.map((t) => t.resolved));
  const target = period[period.length - 1]?.targetMin;

  return (
    <section
      aria-label={`Figures for the last ${days} days`}
      className={cn(
        FIGURE_GRID,
        "transition-opacity",
        load.refreshing && "opacity-60",
      )}
    >
      <StatCard
        label="Average response"
        value={formatDecimal(response)}
        unit="min"
        icon={Timer}
        delta={changeAgainst(
          response,
          hasPrevious ? mean(previous.map((t) => t.responseMin)) : null,
          true,
        )}
        hint={
          compare ??
          (target !== undefined ? `Demo target ${target} min` : undefined)
        }
      />
      <StatCard
        label="Incidents opened"
        value={formatCount(opened)}
        icon={Gauge}
        hint={`About ${formatCount(Math.round(opened / Math.max(1, period.length)))} a day`}
      />
      <StatCard
        label="Resolution rate"
        value={formatPct(Math.round(share(resolved, opened)))}
        icon={CircleCheck}
        hint={`${formatCount(resolved)} resolved`}
      />
      <StatCard
        label="Average resolution"
        value={formatDecimal(resolution)}
        unit="min"
        icon={Hourglass}
        delta={changeAgainst(
          resolution,
          hasPrevious ? mean(previous.map((t) => t.resolutionMin)) : null,
          true,
        )}
        hint={compare ?? "Creation to resolution"}
      />
    </section>
  );
}

/* ───────────────────────── Export ───────────────────────── */

function exportSections(
  overview: AnalyticsOverview,
  period: TrendPoint[],
  escalations: { column: string; rows: { label: string; value: number }[] },
): CsvSection[] {
  return [
    { title: "Average response time, minutes", table: responseTable(period) },
    {
      title: "Incident volume, incidents opened per day",
      table: volumeTable(period),
    },
    {
      title: "Average resolution time, minutes",
      table: resolutionTimeTable(period),
    },
    {
      title: "Active and resolved incidents by time window, today",
      table: activeResolvedTable(overview.activeVsResolved),
    },
    {
      title: "Incidents by category",
      table: categoryTable(
        [...overview.categories].sort((a, b) => b.count - a.count),
      ),
    },
    {
      title: "Incidents by district, today",
      table: districtDistributionTable(
        [...overview.districts].sort(
          (a, b) => b.active + b.resolvedToday - (a.active + a.resolvedToday),
        ),
      ),
    },
    {
      title: "Unit utilisation, % of duty time on incidents",
      table: utilisationTable(overview.unitUtilisation),
    },
    {
      title: "SLA compliance against demo targets, % within target",
      table: slaTable(overview.sla),
    },
    {
      title: `Escalation rate ${overview.escalationRatePct}% of incidents; open escalations`,
      table: countTable(
        escalations.column,
        "Open escalations",
        escalations.rows,
      ),
    },
  ];
}

/* ───────────────────────── Screen ───────────────────────── */

export function CommandAnalyticsScreen() {
  const scope = useCommandScope();
  const { actor } = useSession();
  const [range, setRange] = useState<RangeDays>("14");
  const days = Number(range);
  const { overview, load } = useOverview(scope.scope);
  const liveEscalations = useDemoStore((s) => s.escalations);
  const isState = scope.scope === "state";

  const period = trendWindow(overview, days);
  const previous = overview?.trend.slice(-days * 2, -days) ?? [];

  const escalations = useMemo(() => {
    if (isState)
      return {
        title: "Open escalations by district",
        column: "District",
        rows: (overview?.districts ?? [])
          .filter((d) => d.escalations > 0)
          .sort((a, b) => b.escalations - a.escalations)
          .map((d) => ({ label: d.name, value: d.escalations })),
      };
    const open = liveEscalations.filter((e) => e.status === "open");
    return {
      title: "Open escalations by level, live",
      column: "Escalation level",
      rows: ([1, 2, 3] as const).map((level) => ({
        label: ESCALATION_LEVEL_LABEL[level],
        value: open.filter((e) => e.level === level).length,
      })),
    };
  }, [isState, overview, liveEscalations]);

  const recordExport = useAction(services.audit.record, {
    success: "CSV exported",
    onSuccess: () => {
      if (!overview) return;
      const csv = toCsv(
        [
          ["Report", "Command analytics"],
          ["Scope", `${scope.scopeName} (${scope.scope})`],
          ["Range", `Last ${days} days, daily trend series`],
          ["Exported", formatDateTime(Date.now())],
          [
            "Note",
            "Demonstration data. Aggregated counts of incidents and places only.",
          ],
        ],
        exportSections(overview, period, escalations),
      );
      downloadCsv(`sanket-analytics-${scope.scope}-${days}d.csv`, csv);
    },
  });
  const canExport =
    load.status === "ready" && !load.refreshing && overview !== undefined;

  return (
    <PageContainer width="full">
      <PageHeader
        title="Analytics"
        description={`Response, volume and compliance for ${scope.scopeName}. Aggregated demonstration data about incidents and places, never about individuals or communities.`}
      />

      <div
        role="group"
        aria-label="Filters"
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <ScopeSwitch scope={scope} />
        <SegmentedControl
          label="Range for daily trends"
          value={range}
          onChange={setRange}
          options={RANGE_OPTIONS}
        />
        <Button
          variant="outline"
          className="sm:ml-auto"
          disabled={!canExport || recordExport.pending}
          title="Downloads the figures shown and records the export in the audit log"
          onClick={() =>
            recordExport.run(
              {
                action: "Analytics exported",
                category: "access",
                detail: `${scope.scopeName} · last ${days} days · CSV`,
              },
              actor,
            )
          }
        >
          <Download aria-hidden /> Export CSV
        </Button>
      </div>

      <PeriodFigures
        period={period}
        previous={previous}
        load={load}
        days={days}
      />

      <section
        aria-label={`Charts, ${scope.scopeName}`}
        className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3"
      >
        <ResponseTrendPanel
          overview={overview}
          load={load}
          days={days}
          height={ROW_HEIGHT}
        />
        <IncidentVolumePanel
          overview={overview}
          load={load}
          days={days}
          height={ROW_HEIGHT}
        />
        <ResolutionTimePanel
          overview={overview}
          load={load}
          days={days}
          height={ROW_HEIGHT}
        />
        <ActiveVsResolvedPanel
          overview={overview}
          load={load}
          height={ROW_HEIGHT}
        />
        <CategoryPanel overview={overview} load={load} height={ROW_HEIGHT} />
        <SlaCompliancePanel
          overview={overview}
          load={load}
          height={ROW_HEIGHT - 28}
        />
        <DistrictDistributionPanel
          overview={overview}
          load={load}
          height={TALL_ROW_HEIGHT}
        />
        <UnitUtilisationPanel
          overview={overview}
          load={load}
          height={TALL_ROW_HEIGHT}
        />
        <EscalationRatePanel
          overview={overview}
          load={load}
          breakdownTitle={escalations.title}
          breakdownColumn={escalations.column}
          breakdown={escalations.rows}
          className="lg:col-span-2 2xl:col-span-1"
        />
      </section>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        The range applies to the daily trend charts and the figures above. Other
        charts show the current reporting period. No chart here scores risk,
        predicts incidents or breaks figures down by personal characteristics.
      </p>
    </PageContainer>
  );
}
