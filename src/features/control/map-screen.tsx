"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LoaderCircle,
  PanelLeftClose,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  MapLegend,
  OpsMap,
  type MapSelection,
} from "@/components/shared/ops-map";
import { Panel } from "@/components/shared/page";
import { RestrictedState } from "@/components/shared/states";
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
import { Switch } from "@/components/ui/switch";
import {
  ACTIVE_STATUSES,
  CATEGORY_GROUP_LABEL,
  PRIORITIES,
  PRIORITY_META,
  STATUS_META,
  TONE,
  UNIT_STATUS_META,
} from "@/config/incident";
import { FACILITIES, STATIONS } from "@/data/demo/geo";
import { IncidentInspector } from "@/features/incidents/incident-inspector";
import { isActive } from "@/features/incidents/incident-rules";
import { UnitDetail } from "@/features/units/unit-detail";
import { UNIT_STATUSES } from "@/features/units/unit-meta";
import {
  useCategoryLookup,
  useIncidents,
  useUnits,
} from "@/hooks/use-demo-data";
import { useIs2xl, useIsMd } from "@/hooks/use-mounted";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { ServiceError, services } from "@/services";
import type {
  CategoryGroup,
  IncidentPriority,
  IncidentStatus,
  UnitStatus,
} from "@/types";
import { DetailPanel } from "./detail-panel";
import { FacilityDetail, StationDetail } from "./map-details";
import { useLastValue } from "./use-query-params";

type TimeWindow = "15m" | "1h" | "6h" | "all";
type LayerKey =
  | "incidents"
  | "units"
  | "stations"
  | "hospitals"
  | "fire"
  | "density";

interface Filters {
  group: CategoryGroup | "all";
  priorities: IncidentPriority[];
  /** "open" is every status still being worked. */
  status: IncidentStatus | "open";
  stationId: string;
  unitStatus: UnitStatus | "all";
  window: TimeWindow;
  layers: Record<LayerKey, boolean>;
}

const DEFAULTS: Filters = {
  group: "all",
  priorities: PRIORITIES,
  status: "open",
  stationId: "all",
  unitStatus: "all",
  window: "all",
  layers: {
    incidents: true,
    units: true,
    stations: true,
    hospitals: true,
    fire: true,
    density: false,
  },
};

const WINDOWS: { key: TimeWindow; label: string; ms: number | null }[] = [
  { key: "15m", label: "15 min", ms: 15 * 60_000 },
  { key: "1h", label: "1 h", ms: 60 * 60_000 },
  { key: "6h", label: "6 h", ms: 6 * 60 * 60_000 },
  { key: "all", label: "All", ms: null },
];

const LAYERS: { key: LayerKey; label: string }[] = [
  { key: "incidents", label: "Incidents" },
  { key: "units", label: "Units" },
  { key: "stations", label: "Stations" },
  { key: "hospitals", label: "Hospitals" },
  { key: "fire", label: "Fire stations" },
  { key: "density", label: "Historical incident density" },
];

const GROUPS = Object.keys(CATEGORY_GROUP_LABEL) as CategoryGroup[];

/** How many filters differ from the defaults, for the badge on the phone's Filters button. */
function changedCount(f: Filters): number {
  return (
    Number(f.group !== "all") +
    Number(f.priorities.length !== PRIORITIES.length) +
    Number(f.status !== "open") +
    Number(f.stationId !== "all") +
    Number(f.unitStatus !== "all") +
    Number(f.window !== "all") +
    (Object.keys(f.layers) as LayerKey[]).filter(
      (key) => f.layers[key] !== DEFAULTS.layers[key],
    ).length
  );
}

function FilterGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {htmlFor ? (
        <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
          {label}
        </Label>
      ) : (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      )}
      {children}
    </div>
  );
}

function MapFilters({
  filters,
  onChange,
  counts,
  density,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  counts: Partial<Record<LayerKey, number>>;
  density: { loading: boolean; error: boolean; retry: () => void };
}) {
  const id = useId();

  const togglePriority = (priority: IncidentPriority) =>
    onChange({
      priorities: filters.priorities.includes(priority)
        ? filters.priorities.filter((p) => p !== priority)
        : PRIORITIES.filter(
            (p) => p === priority || filters.priorities.includes(p),
          ),
    });

  return (
    <div className="space-y-4">
      <FilterGroup label="Incident type" htmlFor={`${id}-group`}>
        <Select
          value={filters.group}
          onValueChange={(v) => onChange({ group: v as Filters["group"] })}
        >
          <SelectTrigger id={`${id}-group`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All incident types</SelectItem>
            {GROUPS.map((group) => (
              <SelectItem key={group} value={group}>
                {CATEGORY_GROUP_LABEL[group]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Severity">
        <div
          className="grid grid-cols-2 gap-1.5"
          role="group"
          aria-label="Severity"
        >
          {PRIORITIES.map((priority) => {
            const on = filters.priorities.includes(priority);
            return (
              <button
                key={priority}
                type="button"
                aria-pressed={on}
                onClick={() => togglePriority(priority)}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[13px] font-medium transition-colors",
                  on
                    ? "border-primary/60 bg-accent text-accent-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 rounded-full",
                    on ? TONE[PRIORITY_META[priority].tone].dot : "bg-subtle",
                  )}
                />
                {priority} {PRIORITY_META[priority].label}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup label="Incident status" htmlFor={`${id}-status`}>
        <Select
          value={filters.status}
          onValueChange={(v) => onChange({ status: v as Filters["status"] })}
        >
          <SelectTrigger id={`${id}-status`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="open">All open incidents</SelectItem>
            {ACTIVE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_META[status].label}
              </SelectItem>
            ))}
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Station" htmlFor={`${id}-station`}>
        <Select
          value={filters.stationId}
          onValueChange={(v) => onChange({ stationId: v })}
        >
          <SelectTrigger id={`${id}-station`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All stations</SelectItem>
            {STATIONS.map((station) => (
              <SelectItem key={station.id} value={station.id}>
                {station.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Unit status" htmlFor={`${id}-unit`}>
        <Select
          value={filters.unitStatus}
          onValueChange={(v) =>
            onChange({ unitStatus: v as Filters["unitStatus"] })
          }
        >
          <SelectTrigger id={`${id}-unit`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All unit statuses</SelectItem>
            {UNIT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {UNIT_STATUS_META[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Incidents raised in the last">
        <div
          className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-[3px]"
          role="group"
          aria-label="Time window"
        >
          {WINDOWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={filters.window === key}
              onClick={() => onChange({ window: key })}
              className={cn(
                "tnum h-7 rounded-md text-[13px] font-medium transition-colors",
                filters.window === key
                  ? "bg-background text-foreground shadow-sm dark:bg-input/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Layers">
        <ul className="divide-y divide-border/70 rounded-lg border border-border">
          {LAYERS.map(({ key, label }) => (
            <li key={key} className="px-3 py-2">
              <div className="flex items-center gap-3">
                <Label
                  htmlFor={`${id}-layer-${key}`}
                  className="min-w-0 flex-1 text-[13px] leading-snug font-normal"
                >
                  {label}
                  {counts[key] !== undefined && (
                    <span className="tnum text-xs text-muted-foreground">
                      {counts[key]}
                    </span>
                  )}
                  {key === "density" &&
                    filters.layers.density &&
                    density.loading && (
                      <LoaderCircle
                        aria-label="Loading"
                        className="size-3.5 animate-spin text-muted-foreground"
                      />
                    )}
                </Label>
                <Switch
                  id={`${id}-layer-${key}`}
                  checked={filters.layers[key]}
                  onCheckedChange={(checked) =>
                    onChange({ layers: { ...filters.layers, [key]: checked } })
                  }
                />
              </div>
              {key === "density" && (
                <>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    An aggregate of past incidents by place. It describes
                    locations, not people, and predicts nothing.
                  </p>
                  {filters.layers.density && density.error && (
                    <p
                      role="alert"
                      className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-high-fg"
                    >
                      The density layer did not load.
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={density.retry}
                      >
                        Try again
                      </Button>
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </FilterGroup>
    </div>
  );
}

export function OperationsMapScreen() {
  const { can } = useSession();
  const incidents = useIncidents();
  const units = useUnits();
  const lookup = useCategoryLookup();
  const now = useNow(30_000);
  const isMd = useIsMd();
  const wide = useIs2xl();
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const shown = useLastValue(selection);

  const densityQuery = useQuery({
    queryKey: ["analytics", "density"],
    queryFn: () => services.analytics.getDensity(),
    enabled: filters.layers.density,
  });

  const visibleIncidents = useMemo(() => {
    const span = WINDOWS.find((w) => w.key === filters.window)?.ms ?? null;
    return incidents.filter((incident) => {
      if (filters.status === "open") {
        if (!isActive(incident)) return false;
      } else if (incident.status !== filters.status) return false;
      if (!filters.priorities.includes(incident.priority)) return false;
      if (
        filters.stationId !== "all" &&
        incident.location.stationId !== filters.stationId
      )
        return false;
      if (
        filters.group !== "all" &&
        lookup(incident.categoryId)?.group !== filters.group
      )
        return false;
      if (span !== null && now > 0 && incident.createdAt < now - span)
        return false;
      return true;
    });
  }, [incidents, filters, lookup, now]);

  const visibleUnits = useMemo(
    () =>
      units.filter(
        (unit) =>
          (filters.unitStatus === "all" ||
            unit.status === filters.unitStatus) &&
          (filters.stationId === "all" || unit.stationId === filters.stationId),
      ),
    [units, filters.unitStatus, filters.stationId],
  );

  const visibleStations = useMemo(
    () =>
      filters.stationId === "all"
        ? STATIONS
        : STATIONS.filter((s) => s.id === filters.stationId),
    [filters.stationId],
  );

  const visibleFacilities = useMemo(
    () =>
      FACILITIES.filter((f) =>
        f.kind === "hospital" ? filters.layers.hospitals : filters.layers.fire,
      ),
    [filters.layers.hospitals, filters.layers.fire],
  );

  // Opening an incident from a station or facility list brings it into view.
  const focus = useMemo(() => {
    const target = incidents.find((i) => i.id === focusId);
    return target ? [target.location] : undefined;
  }, [incidents, focusId]);

  if (!(can("incident.read.all") || can("incident.read.station")))
    return (
      <div className="p-4">
        <Panel>
          <RestrictedState
            title="Operations map is restricted"
            description="Your role does not permit access to live incidents."
          />
        </Panel>
      </div>
    );

  const update = (patch: Partial<Filters>) =>
    setFilters((current) => ({ ...current, ...patch }));
  const changed = changedCount(filters);
  const counts: Partial<Record<LayerKey, number>> = {
    incidents: visibleIncidents.length,
    units: visibleUnits.length,
  };
  const density = {
    loading: densityQuery.isFetching,
    error: densityQuery.isError,
    retry: () => void densityQuery.refetch(),
  };
  const offline =
    densityQuery.error instanceof ServiceError &&
    densityQuery.error.code === "offline";

  const select = (next: MapSelection | null) => {
    setSelection(next);
    setFocusId(null);
  };
  const openIncident = (id: string) => {
    setSelection({ type: "incident", id });
    setFocusId(id);
  };
  const close = () => select(null);

  const filterPanel = (
    <MapFilters
      filters={filters}
      onChange={update}
      counts={counts}
      density={density}
    />
  );
  const resetButton = (
    <Button
      variant="ghost"
      size="sm"
      disabled={changed === 0}
      onClick={() => setFilters(DEFAULTS)}
    >
      <RotateCcw aria-hidden /> Reset
    </Button>
  );

  return (
    <div className="flex h-full min-h-0">
      <h1 className="sr-only">Live operations map</h1>

      {isMd && panelOpen && (
        <aside
          aria-label="Map filters and layers"
          className="flex w-72 shrink-0 flex-col border-r border-border bg-card"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 py-2.5 pr-2 pl-4">
            <h2 className="text-sm font-semibold">Filters and layers</h2>
            <div className="flex items-center gap-0.5">
              {resetButton}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPanelOpen(false)}
                aria-label="Hide filters"
              >
                <PanelLeftClose aria-hidden />
              </Button>
            </div>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
            {filterPanel}
          </div>
        </aside>
      )}

      <div className="relative min-w-0 flex-1">
        <OpsMap
          incidents={filters.layers.incidents ? visibleIncidents : []}
          units={filters.layers.units ? visibleUnits : []}
          stations={filters.layers.stations ? visibleStations : []}
          facilities={visibleFacilities}
          density={
            filters.layers.density ? (densityQuery.data ?? []) : undefined
          }
          focus={focus}
          selected={selection}
          onSelect={select}
          label="Live operations map. Markers open details."
          className="absolute inset-0"
        />

        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start gap-2">
          {(!isMd || !panelOpen) && (
            <Button
              variant="outline"
              onClick={() => (isMd ? setPanelOpen(true) : setSheetOpen(true))}
              aria-expanded={isMd ? panelOpen : sheetOpen}
              className="pointer-events-auto h-9 bg-card shadow-card dark:bg-card"
            >
              <SlidersHorizontal aria-hidden />
              Filters
              {changed > 0 && (
                <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                  {changed}
                  <span className="sr-only"> changed</span>
                </span>
              )}
            </Button>
          )}
          <p
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex min-h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium shadow-card"
          >
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inset-0 animate-beacon rounded-full bg-resolved" />
              <span className="relative size-2 rounded-full bg-resolved" />
            </span>
            <span className="tnum">
              {filters.layers.incidents ? visibleIncidents.length : 0}{" "}
              {visibleIncidents.length === 1 ? "incident" : "incidents"} ·{" "}
              {filters.layers.units ? visibleUnits.length : 0}{" "}
              {visibleUnits.length === 1 ? "unit" : "units"}
            </span>
          </p>
          {filters.layers.incidents && visibleIncidents.length === 0 && (
            <p className="pointer-events-auto flex min-h-9 items-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground shadow-card">
              {changed > 0
                ? "No incidents match these filters."
                : "All clear. No active emergency incidents."}
            </p>
          )}
          {filters.layers.density && (
            <p className="pointer-events-auto flex min-h-9 items-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground shadow-card">
              {densityQuery.isError
                ? offline
                  ? "Density layer unavailable while offline."
                  : "Density layer did not load."
                : densityQuery.isPending
                  ? "Loading historical incident density…"
                  : "Shaded areas show historical incident density by place."}
            </p>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden max-w-[calc(100%-5.5rem)] rounded-lg border border-border bg-card px-3 py-2 shadow-card md:block">
          <MapLegend />
        </div>
      </div>

      <DetailPanel
        open={selection !== null}
        onClose={close}
        inline={wide}
        label={
          shown?.type === "incident"
            ? `Incident ${shown.id}`
            : "Details for the selected marker"
        }
        className="w-[440px] rounded-none border-y-0 border-r-0 shadow-none"
      >
        {shown?.type === "incident" ? (
          <IncidentInspector incidentId={shown.id} onClose={close} />
        ) : shown?.type === "unit" ? (
          <UnitDetail unitId={shown.id} mode="summary" onClose={close} />
        ) : shown?.type === "station" ? (
          <StationDetail
            stationId={shown.id}
            onClose={close}
            onSelectIncident={openIncident}
          />
        ) : shown?.type === "facility" ? (
          <FacilityDetail
            facilityId={shown.id}
            onClose={close}
            onSelectIncident={openIncident}
          />
        ) : null}
      </DetailPanel>

      <Sheet open={sheetOpen && !isMd} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] gap-0 rounded-t-2xl"
        >
          <SheetHeader className="pr-12">
            <SheetTitle>Filters and layers</SheetTitle>
            <SheetDescription>
              {visibleIncidents.length}{" "}
              {visibleIncidents.length === 1 ? "incident" : "incidents"} and{" "}
              {visibleUnits.length}{" "}
              {visibleUnits.length === 1 ? "unit" : "units"} match.
            </SheetDescription>
          </SheetHeader>
          <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            {filterPanel}
            <div className="rounded-lg border border-border px-3 py-2.5">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Legend
              </p>
              <MapLegend />
            </div>
          </div>
          <div className="pb-safe flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3">
            {resetButton}
            <Button size="lg" onClick={() => setSheetOpen(false)}>
              Show map
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
