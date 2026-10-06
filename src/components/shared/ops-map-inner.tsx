"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { deployment } from "@/config/deployment";
import {
  PRIORITY_META,
  STATUS_META,
  UNIT_STATUS_META,
} from "@/config/incident";
import { useNow } from "@/hooks/use-now";
import { toTuple, unitPositionAt } from "@/lib/geo";
import type { Incident, LatLng, Unit } from "@/types";
import type { OpsMapProps } from "./ops-map";

const svg = (body: string, width = 2.4) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const GLYPH = {
  alert: svg('<path d="M12 6v7"/><path d="M12 17.4v.1"/>', 2.8),
  done: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.8),
  car: svg(
    '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    2,
  ),
  shield: svg(
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    2,
  ),
  cross: svg('<path d="M12 5v14M5 12h14"/>', 3),
  flame: svg(
    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    2,
  ),
};

const iconCache = new Map<string, L.DivIcon>();
function divIcon(key: string, html: string, size: number): L.DivIcon {
  let icon = iconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      html,
      className: "",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

function incidentIcon(incident: Incident, selected: boolean) {
  const done = !STATUS_META[incident.status].active;
  const cls = done ? "mk-done" : `mk-${incident.priority.toLowerCase()}`;
  return divIcon(
    `i-${cls}-${selected}`,
    `<div class="mk mk-incident ${cls}" data-selected="${selected}">${done ? GLYPH.done : GLYPH.alert}</div>`,
    30,
  );
}

function unitIcon(unit: Unit, selected: boolean) {
  const cls =
    unit.status === "available"
      ? "mk-unit-free"
      : unit.status === "off_duty" || unit.status === "unavailable"
        ? "mk-unit-off"
        : "mk-unit-busy";
  return divIcon(
    `u-${cls}-${selected}`,
    `<div class="mk mk-unit ${cls}" data-selected="${selected}">${GLYPH.car}</div>`,
    30,
  );
}

const placeIcon = (
  kind: "station" | "hospital" | "fire_station",
  selected: boolean,
) =>
  divIcon(
    `p-${kind}-${selected}`,
    `<div class="mk mk-place" data-selected="${selected}">${kind === "station" ? GLYPH.shield : kind === "hospital" ? GLYPH.cross : GLYPH.flame}</div>`,
    24,
  );

const ME_ICON = () => divIcon("me", '<div class="mk-me"></div>', 18);

function bubbleIcon(count: number, critical: boolean) {
  const size = Math.round(30 + Math.min(26, count * 1.8));
  return divIcon(
    `b-${count}-${critical}`,
    `<div class="mk-bubble" style="width:${size}px;height:${size}px;background:var(${critical ? "--critical" : "--primary"});color:var(${critical ? "--card" : "--primary-foreground"})">${count}</div>`,
    size,
  );
}

/** Re-fits the view when the set of points to keep in frame changes. */
function FitTo({ points }: { points: LatLng[] | undefined }) {
  const map = useMap();
  const key =
    points?.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|") ??
    "";
  useEffect(() => {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      map.setView(toTuple(points[0]), Math.max(map.getZoom(), 15), {
        animate: true,
      });
      return;
    }
    map.fitBounds(L.latLngBounds(points.map(toTuple)), {
      padding: [48, 48],
      maxZoom: 16,
      animate: true,
    });
    // `key` is the stable identity of `points`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

/** Leaflet measures its container once; panels that resize or collapse need a nudge. */
function KeepSized() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function OpsMapInner({
  center = deployment.cityCenter,
  zoom = deployment.cityZoom,
  incidents = [],
  units = [],
  stations = [],
  facilities = [],
  density,
  districts,
  me,
  route,
  focus,
  selected,
  onSelect,
  interactive = true,
  showZoom = true,
  label = "Operations map",
}: OpsMapProps) {
  const now = useNow(2000);
  const incidentById = useMemo(
    () => new Map(incidents.map((i) => [i.id, i])),
    [incidents],
  );
  const isSelected = (type: string, id: string) =>
    selected?.type === type && selected.id === id;
  const maxDensity = useMemo(
    () => Math.max(1, ...(density ?? []).map((d) => d.count)),
    [density],
  );

  return (
    <MapContainer
      center={toTuple(center)}
      zoom={zoom}
      zoomControl={false}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      attributionControl
      className="size-full"
      aria-label={label}
    >
      <TileLayer
        url={deployment.tiles.url}
        attribution={deployment.tiles.attribution}
        maxZoom={19}
      />
      {showZoom && interactive && <ZoomControl position="bottomright" />}
      <KeepSized />
      <FitTo points={focus} />

      {density?.map((cell) => (
        <Circle
          key={cell.id}
          center={toTuple(cell.center)}
          radius={320 + (cell.count / maxDensity) * 620}
          pathOptions={{
            className: "density-cell",
            stroke: false,
            fillOpacity: 0.1 + (cell.count / maxDensity) * 0.22,
          }}
        >
          <Tooltip className="ops-tip" direction="top">
            {cell.area}: {cell.count} incidents in the last 30 days
          </Tooltip>
        </Circle>
      ))}

      {route && (
        <Polyline
          positions={[toTuple(route.from), toTuple(route.to)]}
          pathOptions={{ className: "route-line", weight: 4 }}
        />
      )}

      {stations.map((s) => (
        <Marker
          key={s.id}
          position={toTuple(s.position)}
          icon={placeIcon("station", isSelected("station", s.id))}
          title={s.name}
          alt={s.name}
          eventHandlers={
            onSelect
              ? { click: () => onSelect({ type: "station", id: s.id }) }
              : undefined
          }
        >
          <Tooltip className="ops-tip" direction="top" offset={[0, -10]}>
            {s.name}
          </Tooltip>
        </Marker>
      ))}

      {facilities.map((f) => (
        <Marker
          key={f.id}
          position={toTuple(f.position)}
          icon={placeIcon(f.kind, isSelected("facility", f.id))}
          title={f.name}
          alt={f.name}
          eventHandlers={
            onSelect
              ? { click: () => onSelect({ type: "facility", id: f.id }) }
              : undefined
          }
        >
          <Tooltip className="ops-tip" direction="top" offset={[0, -10]}>
            {f.name}
          </Tooltip>
        </Marker>
      ))}

      {units.map((u) => {
        const position = unitPositionAt(
          u,
          u.currentIncidentId
            ? incidentById.get(u.currentIncidentId)
            : undefined,
          now,
        );
        return (
          <Marker
            key={u.id}
            position={toTuple(position)}
            icon={unitIcon(u, isSelected("unit", u.id))}
            title={`Unit ${u.callSign}, ${UNIT_STATUS_META[u.status].label}`}
            alt={`Unit ${u.callSign}`}
            zIndexOffset={200}
            eventHandlers={
              onSelect
                ? { click: () => onSelect({ type: "unit", id: u.id }) }
                : undefined
            }
          >
            <Tooltip className="ops-tip" direction="top" offset={[0, -14]}>
              {u.callSign} · {UNIT_STATUS_META[u.status].label}
            </Tooltip>
          </Marker>
        );
      })}

      {incidents.map((i) => (
        <Marker
          key={i.id}
          position={toTuple(i.location)}
          icon={incidentIcon(i, isSelected("incident", i.id))}
          title={`${PRIORITY_META[i.priority].label} incident: ${i.title}, ${i.location.area}`}
          alt={i.title}
          zIndexOffset={i.priority === "P1" ? 600 : 400}
          eventHandlers={
            onSelect
              ? { click: () => onSelect({ type: "incident", id: i.id }) }
              : undefined
          }
        >
          <Tooltip className="ops-tip" direction="top" offset={[0, -14]}>
            {i.title} · {i.location.area}
          </Tooltip>
        </Marker>
      ))}

      {districts?.map((d) => (
        <Marker
          key={d.districtId}
          position={toTuple(d.center)}
          icon={bubbleIcon(d.active, d.critical > 0)}
          title={`${d.name}: ${d.active} active incidents`}
          alt={d.name}
          eventHandlers={
            onSelect
              ? {
                  click: () => onSelect({ type: "district", id: d.districtId }),
                }
              : undefined
          }
        >
          <Tooltip className="ops-tip" direction="top" offset={[0, -18]}>
            {d.name} · {d.active} active
            {d.critical ? ` · ${d.critical} critical` : ""}
          </Tooltip>
        </Marker>
      ))}

      {me && (
        <Marker
          position={toTuple(me)}
          icon={ME_ICON()}
          title="Your location"
          alt="Your location"
          zIndexOffset={800}
          interactive={false}
        />
      )}
    </MapContainer>
  );
}
