"use client";

import { Flame, Hospital, House, Shield, type LucideIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { OpsMap, type MapSelection } from "@/components/shared/ops-map";
import { BlankState, RestrictedState } from "@/components/shared/states";
import { FACILITIES, STATIONS } from "@/data/demo";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { formatKm } from "@/lib/format";
import { distanceKm, etaMinutesBetween } from "@/lib/geo";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Citizen, Facility, LatLng, Station } from "@/types";

type PlaceKind = "police" | "hospital" | "fire";
type Filter = PlaceKind | "all";

interface Place {
  id: string;
  kind: PlaceKind;
  /** How the map refers to it. */
  mapType: MapSelection["type"];
  name: string;
  area: string;
  position: LatLng;
  detail?: string;
  km: number;
  driveMin: number;
}

const KIND: Record<PlaceKind, { icon: LucideIcon; labelKey: TKey }> = {
  police: { icon: Shield, labelKey: "citizen.nearby.police" },
  hospital: { icon: Hospital, labelKey: "citizen.nearby.hospital" },
  fire: { icon: Flame, labelKey: "citizen.nearby.fire" },
};

const FILTERS: { value: Filter; labelKey: TKey }[] = [
  { value: "all", labelKey: "citizen.nearby.all" },
  { value: "police", labelKey: "citizen.nearby.police" },
  { value: "hospital", labelKey: "citizen.nearby.hospital" },
  { value: "fire", labelKey: "citizen.nearby.fire" },
];

function placesFrom(origin: LatLng): Place[] {
  const measure = (position: LatLng) => ({
    km: distanceKm(origin, position),
    driveMin: etaMinutesBetween(origin, position),
  });
  return [
    ...STATIONS.map(
      (s: Station): Place => ({
        id: s.id,
        kind: "police",
        mapType: "station",
        name: s.name,
        area: s.area,
        position: s.position,
        detail: s.inChargeName,
        ...measure(s.position),
      }),
    ),
    ...FACILITIES.map(
      (f: Facility): Place => ({
        id: f.id,
        kind: f.kind === "hospital" ? "hospital" : "fire",
        mapType: "facility",
        name: f.name,
        area: f.area,
        position: f.position,
        ...measure(f.position),
      }),
    ),
  ].sort((a, b) => a.km - b.km);
}

function Nearby({ citizen }: { citizen: Citizen }) {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());

  const all = useMemo(() => placesFrom(citizen.home), [citizen.home]);
  const shown = useMemo(
    () => (filter === "all" ? all : all.filter((p) => p.kind === filter)),
    [all, filter],
  );
  const selected = shown.find((p) => p.id === selectedId) ?? null;

  const stations = useMemo(() => {
    const ids = new Set(
      shown.filter((p) => p.kind === "police").map((p) => p.id),
    );
    return STATIONS.filter((s) => ids.has(s.id));
  }, [shown]);
  const facilities = useMemo(() => {
    const ids = new Set(
      shown.filter((p) => p.kind !== "police").map((p) => p.id),
    );
    return FACILITIES.filter((f) => ids.has(f.id));
  }, [shown]);

  // Keep the citizen's own position and the chosen place (or the three nearest) in frame.
  const focus = useMemo(
    () =>
      selected
        ? [citizen.home, selected.position]
        : [citizen.home, ...shown.slice(0, 3).map((p) => p.position)],
    [citizen.home, selected, shown],
  );
  const route = useMemo(
    () =>
      selected ? { from: citizen.home, to: selected.position } : undefined,
    [citizen.home, selected],
  );

  const select = (id: string, scroll = false) => {
    setSelectedId((current) => (current === id && !scroll ? null : id));
    if (scroll)
      rows.current
        .get(id)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(13rem,36%)_minmax(0,1fr)] md:grid-cols-[23rem_minmax(0,1fr)] md:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[26rem_minmax(0,1fr)]">
      <div className="min-w-0 border-b border-border/70 bg-card px-4 pt-4 pb-3 sm:px-5 md:col-start-1 md:row-start-1 md:border-r md:border-r-border">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("citizen.section.nearby")}
        </h1>
        <p className="mt-1 flex items-start gap-1.5 text-sm leading-snug text-muted-foreground">
          <House aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("citizen.nearby.origin", { area: citizen.area })}
        </p>
        <div
          role="group"
          aria-label={t("citizen.nearby.filter")}
          className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:-mx-5 sm:px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          {FILTERS.map((option) => {
            const active = filter === option.value;
            const count =
              option.value === "all"
                ? all.length
                : all.filter((p) => p.kind === option.value).length;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(option.value);
                  setSelectedId(null);
                }}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-muted",
                )}
              >
                {t(option.labelKey)}
                <span
                  className={cn(
                    "tnum text-xs",
                    active
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="scroll-thin order-3 min-h-0 min-w-0 overflow-y-auto bg-background p-3 sm:p-4 md:col-start-1 md:row-start-2 md:border-r md:border-border">
        {shown.length === 0 ? (
          <BlankState
            compact
            title={t("citizen.nearby.empty")}
            description={t("citizen.nearby.emptyBody")}
          />
        ) : (
          <ul className="space-y-2.5" aria-label={t("citizen.nearby.list")}>
            {shown.map((place) => {
              const meta = KIND[place.kind];
              const active = place.id === selectedId;
              return (
                <li
                  key={place.id}
                  ref={(el) => {
                    if (el) rows.current.set(place.id, el);
                    else rows.current.delete(place.id);
                  }}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => select(place.id)}
                    className={cn(
                      "flex w-full items-start gap-3.5 rounded-2xl border bg-card p-3.5 text-left shadow-card transition-colors",
                      active
                        ? "border-primary/60 bg-accent"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-xl",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      <meta.icon aria-hidden className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-muted-foreground">
                        {t(meta.labelKey)}
                      </span>
                      <span className="block text-base leading-snug font-medium">
                        {place.name}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {place.area}
                      </span>
                      {active && (
                        <span className="mt-2 block border-t border-primary/20 pt-2 text-sm leading-relaxed">
                          {t("citizen.nearby.drive", { min: place.driveMin })}
                          {place.detail && (
                            <span className="block text-muted-foreground">
                              {t("citizen.nearby.inCharge", {
                                name: place.detail,
                              })}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="tnum shrink-0 pt-0.5 text-base font-semibold">
                      {formatKm(place.km)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="px-1 pt-4 pb-1 text-[13px] leading-relaxed text-muted-foreground">
          {t("citizen.nearby.note")}
        </p>
      </div>

      <OpsMap
        className="order-2 min-h-0 border-b border-border md:col-start-2 md:row-span-2 md:row-start-1 md:border-b-0"
        center={citizen.home}
        zoom={14}
        me={citizen.home}
        stations={stations}
        facilities={facilities}
        focus={focus}
        route={route}
        selected={selected ? { type: selected.mapType, id: selected.id } : null}
        onSelect={(selection) => select(selection.id, true)}
        label={t("citizen.nearby.mapLabel")}
      />
    </div>
  );
}

export function NearbyScreen() {
  const { citizen } = useSession();
  if (!citizen)
    return (
      <RestrictedState description="This screen is for the citizen app. Switch to a citizen from the demo role menu." />
    );
  return <Nearby citizen={citizen} />;
}
