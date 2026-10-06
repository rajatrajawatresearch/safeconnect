"use client";

import { ChevronRight, MapPin, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { IncidentRow } from "@/components/shared/incident-row";
import { Panel } from "@/components/shared/page";
import {
  BlankState,
  EmptyState,
  RestrictedState,
} from "@/components/shared/states";
import {
  PriorityBadge,
  StatusChip,
  ToneChip,
} from "@/components/shared/status-chips";
import { ResponseTimer } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ACTIVE_STATUSES,
  CATEGORY_GROUP_LABEL,
  PRIORITIES,
  PRIORITY_META,
  SOURCE_LABEL,
  STATUS_META,
  TONE,
} from "@/config/incident";
import { STATIONS } from "@/data/demo/geo";
import { DetailPanel } from "@/features/control/detail-panel";
import {
  useLastValue,
  useQueryParams,
} from "@/features/control/use-query-params";
import { stationShort } from "@/features/units/unit-meta";
import {
  byUrgency,
  useCategoryLookup,
  useIncidents,
  useUnits,
} from "@/hooks/use-demo-data";
import { useIsXl } from "@/hooks/use-mounted";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import type {
  CategoryGroup,
  Incident,
  IncidentPriority,
  IncidentStatus,
} from "@/types";
import { IncidentInspector } from "./incident-inspector";
import { frozenAt, isActive, liveAssignments } from "./incident-rules";

type Sort = "urgency" | "newest";

const CLOSED_STATUSES: IncidentStatus[] = ["resolved", "closed", "cancelled"];
const GROUPS = Object.keys(CATEGORY_GROUP_LABEL) as CategoryGroup[];

const isPriority = (value: string | null): value is IncidentPriority =>
  value !== null && (PRIORITIES as string[]).includes(value);

const TH = "h-9 px-3 text-left text-xs font-medium text-muted-foreground";
const TD = "px-3 py-2.5 align-middle";

function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
        pressed
          ? "border-primary/60 bg-accent text-accent-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function IncidentTable({
  incidents,
  selectedId,
  onSelect,
  callSigns,
}: {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  callSigns: (incident: Incident) => string[];
}) {
  return (
    <table className="w-full border-separate border-spacing-0 text-sm">
      <caption className="sr-only">
        Incidents matching the current filters. Select a row to open it.
      </caption>
      <thead>
        <tr>
          {/* Header cells stick to the top of the scrolling column. */}
          <th
            scope="col"
            className={cn(
              TH,
              "sticky top-0 z-10 border-b border-border bg-card pl-4",
            )}
          >
            Priority
          </th>
          <th
            scope="col"
            className={cn(
              TH,
              "sticky top-0 z-10 w-full border-b border-border bg-card",
            )}
          >
            Incident
          </th>
          <th
            scope="col"
            className={cn(
              TH,
              "sticky top-0 z-10 hidden border-b border-border bg-card @2xl:table-cell",
            )}
          >
            Location
          </th>
          <th
            scope="col"
            className={cn(
              TH,
              "sticky top-0 z-10 border-b border-border bg-card",
            )}
          >
            Status
          </th>
          <th
            scope="col"
            className={cn(
              TH,
              "sticky top-0 z-10 hidden border-b border-border bg-card @4xl:table-cell",
            )}
          >
            Unit
          </th>
          <th
            scope="col"
            className={cn(
              TH,
              "sticky top-0 z-10 hidden border-b border-border bg-card @5xl:table-cell",
            )}
          >
            Source
          </th>
          <th
            scope="col"
            className={cn(
              TH,
              "sticky top-0 z-10 border-b border-border bg-card text-right",
            )}
          >
            Elapsed
          </th>
          <th
            scope="col"
            className={cn(
              TH,
              "sticky top-0 z-10 w-8 border-b border-border bg-card pr-3",
            )}
          >
            <span className="sr-only">Open</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {incidents.map((incident) => {
          const active = isActive(incident);
          const selected = incident.id === selectedId;
          const signs = callSigns(incident);
          const pending = liveAssignments(incident).some(
            (a) => a.response === "pending",
          );
          const cell = cn(TD, "border-b border-border/70");
          return (
            <tr
              key={incident.id}
              // The row is a pointer shortcut; the button in the Incident cell is the real control.
              onClick={() => onSelect(incident.id)}
              data-state={selected ? "selected" : undefined}
              className={cn(
                "group cursor-pointer transition-colors last:[&>td]:border-b-0",
                selected ? "bg-accent/60" : "hover:bg-muted/50",
              )}
            >
              <td className={cn(cell, "relative pl-4")}>
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-1.5 left-0 w-1 rounded-r",
                    active
                      ? TONE[PRIORITY_META[incident.priority].tone].dot
                      : "bg-border",
                  )}
                />
                <PriorityBadge
                  priority={incident.priority}
                  variant={
                    active && incident.priority === "P1"
                      ? "solid"
                      : active
                        ? "soft"
                        : "outline"
                  }
                />
              </td>
              <td className={cn(cell, "w-full max-w-0")}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(incident.id);
                  }}
                  aria-pressed={selected}
                  aria-label={`Open ${incident.id}, ${incident.title}, ${incident.location.area}`}
                  className="flex w-full min-w-0 items-center gap-2 rounded-md text-left"
                >
                  <CategoryIcon
                    categoryId={incident.categoryId}
                    className="text-muted-foreground"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {incident.title}
                    </span>
                    <span className="tnum block truncate font-mono text-[11px] text-muted-foreground">
                      {incident.id}
                      <span className="font-sans @2xl:hidden">
                        {" "}
                        · {incident.location.area}
                      </span>
                    </span>
                  </span>
                </button>
              </td>
              <td
                className={cn(cell, "hidden whitespace-nowrap @2xl:table-cell")}
              >
                <span className="flex items-center gap-1">
                  <MapPin
                    aria-hidden
                    className="size-3.5 shrink-0 text-muted-foreground"
                  />
                  {incident.location.area}
                </span>
                <span className="block pl-[18px] text-xs text-muted-foreground">
                  {stationShort(incident.location.stationId)}
                </span>
              </td>
              <td className={cn(cell, "whitespace-nowrap")}>
                <StatusChip status={incident.status} />
              </td>
              <td
                className={cn(cell, "hidden whitespace-nowrap @4xl:table-cell")}
              >
                {signs.length > 0 ? (
                  <>
                    <span className="tnum block font-mono text-xs">
                      {signs.join(", ")}
                    </span>
                    {pending && active && (
                      <span className="block text-xs text-muted-foreground">
                        Awaiting acceptance
                      </span>
                    )}
                  </>
                ) : active ? (
                  <ToneChip tone="high" variant="outline">
                    Unassigned
                  </ToneChip>
                ) : (
                  <span className="text-subtle">—</span>
                )}
              </td>
              <td
                className={cn(
                  cell,
                  "hidden whitespace-nowrap text-muted-foreground @5xl:table-cell",
                )}
              >
                {SOURCE_LABEL[incident.source]}
              </td>
              <td className={cn(cell, "text-right whitespace-nowrap")}>
                <ResponseTimer
                  since={incident.createdAt}
                  until={frozenAt(incident)}
                  priority={incident.priority}
                  size="sm"
                />
              </td>
              <td className={cn(cell, "pr-3 text-subtle")}>
                <ChevronRight
                  aria-hidden
                  className="size-4 group-hover:text-foreground"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function IncidentsScreen() {
  const { can } = useSession();
  const incidents = useIncidents();
  const units = useUnits();
  const lookup = useCategoryLookup();
  const isXl = useIsXl();
  const { params, patch } = useQueryParams();
  const fieldId = useId();

  const [status, setStatus] = useState<IncidentStatus | "all">("all");
  const [group, setGroup] = useState<CategoryGroup | "all">("all");
  const [stationId, setStationId] = useState("all");
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);
  const [sort, setSort] = useState<Sort>("urgency");

  // Selection and the priority preset live in the URL so a view can be linked to.
  const selectedId = params.get("id");
  const shownId = useLastValue(selectedId);
  const priorityParam = params.get("priority");
  const priority = isPriority(priorityParam) ? priorityParam : "all";

  const callSigns = useMemo(() => {
    const byId = new Map(units.map((u) => [u.id, u.callSign]));
    return (incident: Incident) =>
      liveAssignments(incident)
        .map((a) => byId.get(a.unitId))
        .filter((sign): sign is string => Boolean(sign));
  }, [units]);

  const pool = useMemo(
    () => (includeClosed ? incidents : incidents.filter(isActive)),
    [incidents, includeClosed],
  );

  const priorityCounts = useMemo(() => {
    const out: Record<IncidentPriority, number> = {
      P1: 0,
      P2: 0,
      P3: 0,
      P4: 0,
    };
    for (const incident of pool) out[incident.priority] += 1;
    return out;
  }, [pool]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pool
      .filter((incident) => {
        if (priority !== "all" && incident.priority !== priority) return false;
        if (status !== "all" && incident.status !== status) return false;
        if (stationId !== "all" && incident.location.stationId !== stationId)
          return false;
        if (group !== "all" && lookup(incident.categoryId)?.group !== group)
          return false;
        if (!term) return true;
        return [
          incident.id,
          incident.title,
          incident.description,
          incident.location.area,
          incident.location.address,
          incident.reporterName,
          ...callSigns(incident),
        ].some((value) => value.toLowerCase().includes(term));
      })
      .sort(
        sort === "urgency"
          ? (a, b) =>
              Number(isActive(b)) - Number(isActive(a)) || byUrgency(a, b)
          : (a, b) => b.createdAt - a.createdAt,
      );
  }, [
    pool,
    priority,
    status,
    stationId,
    group,
    search,
    sort,
    lookup,
    callSigns,
  ]);

  if (!(can("incident.read.all") || can("incident.read.station")))
    return (
      <div className="p-4">
        <Panel>
          <RestrictedState
            title="Incidents are restricted"
            description="Your role does not permit access to incident records."
          />
        </Panel>
      </div>
    );

  const open = incidents.filter(isActive);
  const unassigned = open.filter(
    (i) => i.status === "new" || i.status === "acknowledged",
  ).length;
  const filtered =
    priority !== "all" ||
    status !== "all" ||
    group !== "all" ||
    stationId !== "all" ||
    search !== "";
  const statusOptions = includeClosed
    ? [...ACTIVE_STATUSES, ...CLOSED_STATUSES]
    : ACTIVE_STATUSES;

  const select = (id: string | null) => patch({ id });
  const clear = () => {
    setStatus("all");
    setGroup("all");
    setStationId("all");
    setSearch("");
    patch({ priority: null });
  };

  return (
    <div className="flex h-full min-h-0 gap-3 xl:p-4">
      <div className="@container scroll-thin min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 xl:p-0 xl:pr-1">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              Live incidents
            </h1>
            <p
              className="mt-1 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <span className="tnum">{open.length}</span> open ·{" "}
              <span className="tnum">
                {open.filter((i) => i.priority === "P1").length}
              </span>{" "}
              critical · <span className="tnum">{unassigned}</span> waiting for
              a unit
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <Switch
                id={`${fieldId}-closed`}
                checked={includeClosed}
                onCheckedChange={(checked) => {
                  setIncludeClosed(checked);
                  // A closed status cannot stay selected once closed incidents are hidden.
                  if (
                    !checked &&
                    status !== "all" &&
                    CLOSED_STATUSES.includes(status)
                  )
                    setStatus("all");
                }}
              />
              <Label
                htmlFor={`${fieldId}-closed`}
                className="text-[13px] font-normal"
              >
                Include resolved and closed
              </Label>
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger aria-label="Sort order" className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                <SelectItem value="urgency">Sort by urgency</SelectItem>
                <SelectItem value="newest">Sort by newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <div
          className="no-scrollbar -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 sm:flex-wrap xl:mx-0 xl:px-0"
          role="group"
          aria-label="Filter by priority"
        >
          <FilterChip
            pressed={priority === "all"}
            onClick={() => patch({ priority: null })}
          >
            All priorities
            <span className="tnum text-xs opacity-80">{pool.length}</span>
          </FilterChip>
          {PRIORITIES.map((value) => (
            <FilterChip
              key={value}
              pressed={priority === value}
              onClick={() =>
                patch({ priority: priority === value ? null : value })
              }
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  TONE[PRIORITY_META[value].tone].dot,
                )}
              />
              {value} {PRIORITY_META[value].label}
              <span className="tnum text-xs opacity-80">
                {priorityCounts[value]}
              </span>
            </FilterChip>
          ))}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-52 @3xl:max-w-xs">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID, place, category, unit"
              aria-label="Search incidents"
              className="bg-card pl-8"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as IncidentStatus | "all")}
          >
            <SelectTrigger aria-label="Status" className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {STATUS_META[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={group}
            onValueChange={(v) => setGroup(v as CategoryGroup | "all")}
          >
            <SelectTrigger aria-label="Incident type" className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All incident types</SelectItem>
              {GROUPS.map((value) => (
                <SelectItem key={value} value={value}>
                  {CATEGORY_GROUP_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger aria-label="Station" className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All stations</SelectItem>
              {STATIONS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered && (
            <Button variant="ghost" onClick={clear}>
              <X aria-hidden /> Clear filters
            </Button>
          )}
          <p className="ml-auto text-xs text-muted-foreground">
            <span className="tnum">{visible.length}</span> shown
          </p>
        </div>

        <div className="mt-3">
          {visible.length === 0 ? (
            <Panel>
              {filtered || includeClosed ? (
                <BlankState
                  icon={Search}
                  title="No incidents match these filters"
                  description="Change or clear the filters to see more of the queue."
                  action={
                    <Button variant="outline" onClick={clear}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="All clear."
                  description="No active emergency incidents in this view."
                />
              )}
            </Panel>
          ) : (
            <>
              <Panel className="hidden overflow-clip @xl:block">
                <IncidentTable
                  incidents={visible}
                  selectedId={selectedId}
                  onSelect={select}
                  callSigns={callSigns}
                />
              </Panel>
              <ul className="space-y-2 @xl:hidden" aria-label="Incidents">
                {visible.map((incident) => (
                  <li key={incident.id}>
                    <IncidentRow
                      incident={incident}
                      selected={incident.id === selectedId}
                      showTimer={incident.priority === "P1"}
                      onSelect={(i) => select(i.id)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <DetailPanel
        open={selectedId !== null}
        onClose={() => select(null)}
        inline={isXl}
        label={shownId ? `Incident ${shownId}` : "Incident details"}
        className="w-[440px] min-[1440px]:w-[460px]"
      >
        <IncidentInspector incidentId={shownId} onClose={() => select(null)} />
      </DetailPanel>
    </div>
  );
}
