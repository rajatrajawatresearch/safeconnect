"use client";

import {
  ChevronsUp,
  Hourglass,
  Siren,
  Timer,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { StatCard } from "@/components/shared/stat-card";
import { districtById, stationById } from "@/data/demo/geo";
import { useOpsStats } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { RANGE_OPTIONS, SegmentedControl, type RangeDays } from "./controls";
import { formatDecimal } from "./format";
import {
  CategoryPanel,
  HourlyVolumePanel,
  ResolutionTrendPanel,
  ResponseTrendPanel,
  SlaCompliancePanel,
} from "./panels";
import { useOverview } from "./use-overview";

type ControlScope = "station" | "district";

const DEFAULT_STATION_ID = "st-nav";
const DEFAULT_DISTRICT_ID = "d-ahd";
const PLOT_HEIGHT = 256;

/** Operational analytics for the control room: one station, or the district it belongs to. */
export function ControlAnalyticsScreen() {
  const { persona } = useSession();
  const stationId = persona.stationId ?? DEFAULT_STATION_ID;
  const station = stationById(stationId);
  const district = districtById(
    persona.districtId ?? station?.districtId ?? DEFAULT_DISTRICT_ID,
  );
  const stationName = station?.area ?? "Station";
  const districtName = district?.name ?? "District";

  // A station supervisor starts on their station; the district control room starts on the district.
  const [scope, setScope] = useState<ControlScope>(
    persona.stationId ? "station" : "district",
  );
  const [range, setRange] = useState<RangeDays>("14");
  const days = Number(range);
  const { overview, load } = useOverview(scope);
  const stats = useOpsStats(scope === "station" ? stationId : undefined);
  const scopeName =
    scope === "station" ? (station?.name ?? stationName) : districtName;

  return (
    <PageContainer width="full">
      <PageHeader
        title="Analytics"
        description={`Operational figures for ${scopeName}. The counts are live; trend charts use aggregated demonstration data about incidents and places.`}
      />

      <div
        role="group"
        aria-label="Filters"
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <SegmentedControl
          label="Scope"
          value={scope}
          onChange={setScope}
          className="w-full sm:w-fit"
          options={[
            { value: "station", label: `${stationName} (station)` },
            { value: "district", label: `${districtName} (district)` },
          ]}
        />
        <SegmentedControl
          label="Range for daily trends"
          value={range}
          onChange={setRange}
          options={RANGE_OPTIONS}
        />
      </div>

      <section
        aria-label={`Live figures, ${scopeName}`}
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      >
        <StatCard
          label="Active incidents"
          value={stats.activeEmergencies}
          icon={Siren}
          hint="Open right now"
        />
        <StatCard
          label="Critical incidents"
          value={stats.critical}
          icon={TriangleAlert}
          tone={stats.critical > 0 ? "critical" : undefined}
          hint="P1, open now"
        />
        <StatCard
          label="Awaiting a unit"
          value={stats.unassigned}
          icon={Hourglass}
          tone={stats.unassigned > 0 ? "high" : undefined}
          hint="New or acknowledged"
        />
        <StatCard
          label="Available units"
          value={stats.unitsAvailable}
          unit={`of ${stats.unitsTotal}`}
          icon={Truck}
          hint={`${stats.unitsEnRoute} en route · ${stats.unitsOnScene} on scene`}
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
          hint={
            stats.avgResponseSec > 0
              ? "Creation to arrival"
              : "No arrivals recorded yet"
          }
        />
        <StatCard
          label="Escalations"
          value={stats.escalationsOpen}
          icon={ChevronsUp}
          tone={stats.escalationsOpen > 0 ? "high" : undefined}
          hint="Open"
        />
      </section>

      <section
        aria-label={`Charts, ${scopeName}`}
        className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3"
      >
        <ResponseTrendPanel
          overview={overview}
          load={load}
          days={days}
          height={PLOT_HEIGHT}
        />
        <SlaCompliancePanel
          overview={overview}
          load={load}
          height={PLOT_HEIGHT - 28}
        />
        <HourlyVolumePanel
          overview={overview}
          load={load}
          height={PLOT_HEIGHT}
        />
        <CategoryPanel overview={overview} load={load} height={PLOT_HEIGHT} />
        <ResolutionTrendPanel
          overview={overview}
          load={load}
          days={days}
          height={PLOT_HEIGHT}
          className="lg:col-span-2"
        />
      </section>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        The range applies to the daily trend charts. Compliance is measured
        against demo targets. Nothing here scores risk, predicts incidents or
        describes individuals or communities.
      </p>
    </PageContainer>
  );
}
