"use client";

import {
  ArrowUpRight,
  CircleAlert,
  Maximize2,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Siren,
  Timer,
  Truck,
  UserX,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { IncidentRow } from "@/components/shared/incident-row";
import {
  MapLegend,
  OpsMap,
  type MapSelection,
} from "@/components/shared/ops-map";
import { Panel, PanelHeader } from "@/components/shared/page";
import { EmptyState, RestrictedState } from "@/components/shared/states";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Tone } from "@/config/incident";
import { FACILITIES, STATIONS } from "@/data/demo/geo";
import { IncidentInspector } from "@/features/incidents/incident-inspector";
import { liveAssignments } from "@/features/incidents/incident-rules";
import {
  useActiveIncidents,
  useOpsStats,
  useUnits,
} from "@/hooks/use-demo-data";
import { useIs2xl } from "@/hooks/use-mounted";
import { useSession } from "@/hooks/use-session";
import { formatDuration } from "@/lib/format";
import { DetailPanel } from "./detail-panel";
import { MapInfoCard } from "./map-details";
import { useLastValue } from "./use-query-params";

interface Tile {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint: string;
  icon: LucideIcon;
  tone?: Tone;
  href: string;
}

function PanelToggle({
  open,
  side,
  label,
  onToggle,
}: {
  open: boolean;
  side: "left" | "right";
  label: string;
  onToggle: () => void;
}) {
  const Icon =
    side === "left"
      ? open
        ? PanelLeftClose
        : PanelLeftOpen
      : open
        ? PanelRightClose
        : PanelRightOpen;
  const text = `${open ? "Hide" : "Show"} ${label}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={onToggle}
          aria-label={text}
          aria-expanded={open}
          className="bg-card shadow-card dark:bg-card"
        >
          <Icon aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{text}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Control room overview.
 *
 * From 1440px: queue, map and inspector side by side, with the two side panels collapsible.
 * From 1024px: map and live feed, with the inspector as a drawer.
 * Below that: the same content stacked, with the inspector as a full-height sheet.
 */
export function ControlOverviewScreen() {
  const { can } = useSession();
  const stats = useOpsStats();
  const active = useActiveIncidents();
  const units = useUnits();
  const wide = useIs2xl();
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const incidentId = selection?.type === "incident" ? selection.id : null;
  const shownIncidentId = useLastValue(incidentId);

  // Choosing from the queue brings the incident and its units into frame. Clicking a marker does
  // not move the map: the operator is already looking at it.
  const focus = useMemo(() => {
    const target = active.find((i) => i.id === focusId);
    if (!target) return undefined;
    const responding = liveAssignments(target)
      .map((a) => units.find((u) => u.id === a.unitId)?.position)
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (responding.length === 0) return [target.location];
    // The toolbar and legend sit over the top and bottom of the map, so the frame is padded
    // north and south to keep the markers clear of them.
    const lats = [target.location.lat, ...responding.map((p) => p.lat)];
    const south = Math.min(...lats);
    const north = Math.max(...lats);
    const span = Math.max(north - south, 0.004);
    const { lng } = target.location;
    return [
      target.location,
      ...responding,
      { lat: south - span * 0.45, lng },
      { lat: north + span * 0.3, lng },
    ];
  }, [active, focusId, units]);

  if (!(can("incident.read.all") || can("incident.read.station")))
    return (
      <div className="p-4">
        <Panel>
          <RestrictedState
            title="Operations overview is restricted"
            description="Your role does not permit access to live incidents."
          />
        </Panel>
      </div>
    );

  const select = (next: MapSelection | null, fromList = false) => {
    setSelection(next);
    setFocusId(fromList && next ? next.id : null);
    if (next?.type === "incident") setInspectorOpen(true);
  };

  const tiles: Tile[] = [
    {
      label: "Active emergencies",
      value: stats.activeEmergencies,
      hint: `${stats.resolvedToday} resolved today`,
      icon: Siren,
      href: "/control/incidents",
    },
    {
      label: "Critical incidents",
      value: stats.critical,
      hint: "Immediate threat to life or safety",
      icon: CircleAlert,
      tone: stats.critical > 0 ? "critical" : undefined,
      href: "/control/incidents?priority=P1",
    },
    {
      label: "Units available",
      value: stats.unitsAvailable,
      unit: `of ${stats.unitsTotal}`,
      hint: "Ready to be assigned",
      icon: Truck,
      tone: stats.unitsAvailable === 0 ? "high" : undefined,
      href: "/control/units?status=available",
    },
    {
      label: "Units en route",
      value: stats.unitsEnRoute,
      hint: `${stats.unitsOnScene} on scene`,
      icon: Navigation,
      href: "/control/units?status=en_route",
    },
    {
      label: "Average response time",
      value: stats.avgResponseSec ? formatDuration(stats.avgResponseSec) : "—",
      unit: stats.avgResponseSec ? "min" : undefined,
      hint: "Creation to arrival on scene",
      icon: Timer,
      href: "/control/analytics",
    },
    {
      label: "Unassigned incidents",
      value: stats.unassigned,
      hint: "Waiting for a unit",
      icon: UserX,
      tone: stats.unassigned > 0 ? "high" : undefined,
      href: "/control/dispatch",
    },
  ];

  const showQueue = !wide || queueOpen;
  const closeInspector = () => select(null);

  return (
    <div className="flex min-h-full flex-col gap-3 p-3 sm:p-4 lg:h-full lg:min-h-0">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-[13px] text-muted-foreground">
          Live picture of open incidents and units. Updates as events arrive.
        </p>
      </header>

      <ul className="grid shrink-0 grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((tile) => (
          <li key={tile.label} className="min-w-0">
            <Link
              href={tile.href}
              className="group block h-full rounded-xl"
              aria-label={`${tile.label}: ${typeof tile.value === "string" || typeof tile.value === "number" ? tile.value : ""}${tile.unit ? ` ${tile.unit}` : ""}. ${tile.hint}.`}
            >
              <StatCard
                label={tile.label}
                value={tile.value}
                unit={tile.unit}
                hint={tile.hint}
                icon={tile.icon}
                tone={tile.tone}
                className="h-full transition-colors group-hover:border-input"
              />
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:flex-row">
        {showQueue && (
          <Panel
            aria-label={wide ? "Incident queue" : "Live incident feed"}
            className="order-2 flex flex-col lg:min-h-0 lg:w-[340px] lg:shrink-0 min-[1440px]:order-none"
          >
            <PanelHeader
              title={wide ? "Incident queue" : "Live incident feed"}
              description={
                active.length === 0
                  ? "Nothing open right now"
                  : `${active.length} open, most urgent first`
              }
              actions={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/control/incidents">
                    Open queue <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
              }
            />
            {active.length === 0 ? (
              <EmptyState
                compact
                className="flex-1"
                title="All clear."
                description="No active emergency incidents."
              />
            ) : (
              <ul
                className="scroll-thin space-y-2 p-2.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
                aria-live="polite"
                aria-relevant="additions"
              >
                {active.map((incident) => (
                  <li key={incident.id}>
                    <IncidentRow
                      incident={incident}
                      selected={incident.id === incidentId}
                      showTimer={incident.priority === "P1"}
                      onSelect={(i) =>
                        select({ type: "incident", id: i.id }, true)
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <Panel
          aria-label="Live operations map"
          className="@container relative order-1 h-[22rem] overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1 min-[1440px]:order-none"
        >
          <OpsMap
            incidents={active}
            units={units}
            stations={STATIONS}
            facilities={FACILITIES}
            focus={focus}
            selected={selection}
            onSelect={(next) => select(next)}
            label="Live operations map of open incidents, units, stations and facilities"
            className="absolute inset-0"
          />

          <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
            <div className="pointer-events-auto flex flex-col items-start gap-2">
              <div className="flex items-center gap-2">
                {wide && (
                  <PanelToggle
                    open={queueOpen}
                    side="left"
                    label="incident queue"
                    onToggle={() => setQueueOpen((v) => !v)}
                  />
                )}
                <p className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-medium whitespace-nowrap shadow-card">
                  <span className="relative flex size-2" aria-hidden>
                    <span className="absolute inset-0 animate-beacon rounded-full bg-resolved" />
                    <span className="relative size-2 rounded-full bg-resolved" />
                  </span>
                  Live map
                  {/* The map shares the row with two other panels, so follow its width, not the screen's. */}
                  <span className="tnum hidden text-muted-foreground @lg:inline">
                    {active.length} incidents · {units.length} units
                  </span>
                </p>
              </div>
              {selection && selection.type !== "incident" && (
                <MapInfoCard
                  selection={selection}
                  onClose={() => setSelection(null)}
                />
              )}
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                    className="bg-card shadow-card dark:bg-card"
                  >
                    <Link
                      href="/control/map"
                      aria-label="Open the full operations map"
                    >
                      <Maximize2 aria-hidden />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Open the full operations map
                </TooltipContent>
              </Tooltip>
              {wide && (
                <PanelToggle
                  open={inspectorOpen}
                  side="right"
                  label="incident inspector"
                  onToggle={() => setInspectorOpen((v) => !v)}
                />
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden max-w-[calc(100%-5.5rem)] rounded-lg border border-border bg-card px-3 py-2 shadow-card sm:block">
            <MapLegend />
          </div>
        </Panel>

        {/* Phones get the legend under the map, where it does not cover markers. */}
        <Panel
          aria-label="Map legend"
          className="order-1 px-3.5 py-3 sm:hidden"
        >
          <MapLegend />
        </Panel>

        <DetailPanel
          open={wide ? inspectorOpen : incidentId !== null}
          onClose={closeInspector}
          inline={wide}
          label={
            shownIncidentId
              ? `Incident ${shownIncidentId}`
              : "Incident inspector"
          }
          className="w-[440px] min-[1700px]:w-[480px]"
        >
          <IncidentInspector
            incidentId={wide ? incidentId : shownIncidentId}
            onClose={
              wide ? (incidentId ? closeInspector : undefined) : closeInspector
            }
          />
        </DetailPanel>
      </div>
    </div>
  );
}
