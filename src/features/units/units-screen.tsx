"use client";

import { ChevronRight, MapPin, Search, Truck, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { BlankState, RestrictedState } from "@/components/shared/states";
import { UnitStatusChip } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TONE, UNIT_STATUS_META } from "@/config/incident";
import { STATIONS } from "@/data/demo/geo";
import { DetailPanel } from "@/features/control/detail-panel";
import {
  useLastValue,
  useQueryParams,
} from "@/features/control/use-query-params";
import { nearestAreaName } from "@/features/incidents/incident-rules";
import { officerOfUnit, useIncidents, useUnits } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import type { Incident, Unit, UnitStatus } from "@/types";
import { ShiftEnd, UnitDetail } from "./unit-detail";
import {
  UNIT_STATUSES,
  VEHICLE_ICON,
  isUnitStatus,
  stationShort,
} from "./unit-meta";

const STATUS_ORDER = Object.fromEntries(
  UNIT_STATUSES.map((status, index) => [status, index]),
) as Record<UnitStatus, number>;

function AssignmentLink({ incident }: { incident: Incident | undefined }) {
  if (!incident) return <span className="text-subtle">—</span>;
  return (
    <Link
      href={`/control/incidents?id=${incident.id}`}
      onClick={(e) => e.stopPropagation()}
      className="group/link block min-w-0 max-w-56 rounded-md"
    >
      <span className="tnum block truncate font-mono text-xs text-primary underline-offset-2 group-hover/link:underline">
        {incident.id}
      </span>
      <span className="block truncate text-xs text-muted-foreground">
        {incident.title} · {incident.location.area}
      </span>
    </Link>
  );
}

function UnitCard({
  unit,
  incident,
  selected,
  onSelect,
}: {
  unit: Unit;
  incident: Incident | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = VEHICLE_ICON[unit.vehicle];
  const officer = officerOfUnit(unit);
  return (
    <li
      className={cn(
        "rounded-xl border bg-card",
        selected ? "border-primary/60 bg-accent/60" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Unit ${unit.callSign}, ${UNIT_STATUS_META[unit.status].label}`}
        className="block w-full rounded-xl p-3.5 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Icon aria-hidden className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="tnum block font-mono text-sm font-semibold">
              {unit.callSign}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {officer?.name ?? "Officer not set"}
            </span>
          </span>
          <UnitStatusChip status={unit.status} />
        </span>
        <span className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <span className="min-w-0">
            <span className="block text-muted-foreground">Vehicle</span>
            <span className="block truncate">{unit.vehicle}</span>
            <span className="tnum block truncate font-mono text-muted-foreground">
              {unit.vehicleNo}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-muted-foreground">Station</span>
            <span className="block truncate">
              {stationShort(unit.stationId)}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-muted-foreground">Last location</span>
            <span className="block truncate">
              Near {nearestAreaName(unit.position)}
            </span>
            <RelativeTime
              at={unit.positionAt}
              className="text-muted-foreground"
            />
          </span>
          <span className="min-w-0">
            <span className="block text-muted-foreground">Shift ends</span>
            <ShiftEnd at={unit.shiftEndsAt} />
          </span>
        </span>
      </button>
      {incident && (
        <div className="border-t border-border/70 px-3.5 py-2.5">
          <p className="mb-0.5 text-xs text-muted-foreground">
            Current assignment
          </p>
          <AssignmentLink incident={incident} />
        </div>
      )}
    </li>
  );
}

export function UnitsScreen() {
  const { can } = useSession();
  const units = useUnits();
  const incidents = useIncidents();
  const { params, patch } = useQueryParams();
  const [stationId, setStationId] = useState("all");
  const [search, setSearch] = useState("");

  const selectedId = params.get("id");
  const shownId = useLastValue(selectedId);
  const statusParam = params.get("status");
  const status = isUnitStatus(statusParam) ? statusParam : "all";

  const incidentById = useMemo(
    () => new Map(incidents.map((i) => [i.id, i])),
    [incidents],
  );

  const counts = useMemo(() => {
    const out = Object.fromEntries(UNIT_STATUSES.map((s) => [s, 0])) as Record<
      UnitStatus,
      number
    >;
    for (const unit of units) out[unit.status] += 1;
    return out;
  }, [units]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return units
      .filter((unit) => {
        if (status !== "all" && unit.status !== status) return false;
        if (stationId !== "all" && unit.stationId !== stationId) return false;
        if (!term) return true;
        const officer = officerOfUnit(unit);
        return [
          unit.callSign,
          unit.vehicle,
          unit.vehicleNo,
          officer?.name,
          officer?.badgeNo,
          unit.currentIncidentId,
        ].some((value) => value?.toLowerCase().includes(term));
      })
      .sort(
        (a, b) =>
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
          a.callSign.localeCompare(b.callSign),
      );
  }, [units, status, stationId, search]);

  if (!can("unit.view"))
    return (
      <PageContainer>
        <Panel>
          <RestrictedState
            title="Units are restricted"
            description="Your role does not permit access to unit information."
          />
        </Panel>
      </PageContainer>
    );

  const select = (id: string | null) => patch({ id });
  const filtered = status !== "all" || stationId !== "all" || search !== "";
  const clear = () => {
    setStationId("all");
    setSearch("");
    patch({ status: null });
  };

  return (
    <PageContainer width="full">
      <PageHeader
        title="Units"
        description={`${units.length} units on the roster. ${counts.available} available, ${counts.assigned + counts.en_route + counts.on_scene} engaged on incidents.`}
      />

      <div
        className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
        aria-label="Filter by status"
      >
        <button
          type="button"
          aria-pressed={status === "all"}
          onClick={() => patch({ status: null })}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
            status === "all"
              ? "border-primary/60 bg-accent text-accent-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          All units
          <span className="tnum text-xs opacity-80">{units.length}</span>
        </button>
        {UNIT_STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => patch({ status: status === value ? null : value })}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
              status === value
                ? "border-primary/60 bg-accent text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                TONE[UNIT_STATUS_META[value].tone].dot,
              )}
            />
            {UNIT_STATUS_META[value].label}
            <span className="tnum text-xs opacity-80">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Call sign, officer, vehicle number"
            aria-label="Search units"
            className="bg-card pl-8"
          />
        </div>
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
        <p
          className="ml-auto text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <span className="tnum">{visible.length}</span> of{" "}
          <span className="tnum">{units.length}</span> shown
        </p>
      </div>

      {visible.length === 0 ? (
        <Panel>
          <BlankState
            icon={Truck}
            title="No units match these filters"
            description="Change the status, station or search to see more of the roster."
            action={
              <Button variant="outline" onClick={clear}>
                Clear filters
              </Button>
            }
          />
        </Panel>
      ) : (
        <>
          <Panel className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-xs font-medium text-muted-foreground">
                    Unit
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Officer
                  </TableHead>
                  <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">
                    Vehicle
                  </TableHead>
                  <TableHead className="hidden text-xs font-medium text-muted-foreground xl:table-cell">
                    Station
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Current assignment
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Last authorised location
                  </TableHead>
                  <TableHead className="hidden text-xs font-medium text-muted-foreground min-[1440px]:table-cell">
                    Shift ends
                  </TableHead>
                  <TableHead className="w-8 pr-3">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((unit) => {
                  const Icon = VEHICLE_ICON[unit.vehicle];
                  const officer = officerOfUnit(unit);
                  const selected = unit.id === selectedId;
                  return (
                    <TableRow
                      key={unit.id}
                      data-state={selected ? "selected" : undefined}
                      onClick={() => select(unit.id)}
                      className="cursor-pointer data-[state=selected]:bg-accent/60"
                    >
                      <TableCell className="py-2.5 pl-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            select(unit.id);
                          }}
                          aria-label={`Open unit ${unit.callSign}`}
                          aria-pressed={selected}
                          className="flex items-center gap-2.5 rounded-md text-left"
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                            <Icon aria-hidden className="size-4" />
                          </span>
                          <span className="tnum font-mono text-sm font-semibold">
                            {unit.callSign}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="block max-w-44 truncate text-sm">
                          {officer?.name ?? "Not set"}
                        </span>
                        <span className="block max-w-44 truncate text-xs text-muted-foreground">
                          {officer?.rank}
                        </span>
                      </TableCell>
                      <TableCell className="hidden py-2.5 lg:table-cell">
                        <span className="block text-sm">{unit.vehicle}</span>
                        <span className="tnum block font-mono text-xs text-muted-foreground">
                          {unit.vehicleNo}
                        </span>
                      </TableCell>
                      <TableCell className="hidden py-2.5 text-sm xl:table-cell">
                        {stationShort(unit.stationId)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <UnitStatusChip status={unit.status} />
                      </TableCell>
                      <TableCell className="py-2.5">
                        <AssignmentLink
                          incident={
                            unit.currentIncidentId
                              ? incidentById.get(unit.currentIncidentId)
                              : undefined
                          }
                        />
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin
                            aria-hidden
                            className="size-3.5 shrink-0 text-muted-foreground"
                          />
                          Near {nearestAreaName(unit.position)}
                        </span>
                        <RelativeTime
                          at={unit.positionAt}
                          className="text-xs text-muted-foreground"
                        />
                      </TableCell>
                      <TableCell className="hidden py-2.5 text-sm min-[1440px]:table-cell">
                        <ShiftEnd at={unit.shiftEndsAt} />
                      </TableCell>
                      <TableCell className="py-2.5 pr-3 text-subtle">
                        <ChevronRight aria-hidden className="size-4" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Panel>

          <ul className="space-y-2.5 md:hidden" aria-label="Units">
            {visible.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                incident={
                  unit.currentIncidentId
                    ? incidentById.get(unit.currentIncidentId)
                    : undefined
                }
                selected={unit.id === selectedId}
                onSelect={() => select(unit.id)}
              />
            ))}
          </ul>
        </>
      )}

      <DetailPanel
        open={selectedId !== null}
        onClose={() => select(null)}
        inline={false}
        label="Unit details"
      >
        <UnitDetail unitId={shownId} onClose={() => select(null)} />
      </DetailPanel>
    </PageContainer>
  );
}
