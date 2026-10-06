import type { Incident, LatLng, Timestamp, Unit } from "@/types";

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Road distance is longer than the straight line; 1.35 is a reasonable urban factor for a demo. */
export const roadKm = (a: LatLng, b: LatLng) => distanceKm(a, b) * 1.35;

/** Minutes to cover the road distance at an urban emergency-response average. */
export function etaMinutesBetween(a: LatLng, b: LatLng, kmh = 22): number {
  return Math.max(2, Math.round((roadKm(a, b) / kmh) * 60));
}

export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  const k = Math.min(1, Math.max(0, t));
  return { lat: a.lat + (b.lat - a.lat) * k, lng: a.lng + (b.lng - a.lng) * k };
}

/**
 * Where a unit is right now. En-route units are interpolated along their run from the clock,
 * so the map animates without writing a position to the store every second.
 */
export function unitPositionAt(
  unit: Unit,
  incident: Incident | undefined,
  now: Timestamp,
): LatLng {
  if (!incident || unit.currentIncidentId !== incident.id) return unit.position;
  if (unit.status === "on_scene")
    return offsetPoint(incident.location, 0.00035, unit.callSign);
  if (
    unit.status === "en_route" &&
    incident.enRouteAt &&
    incident.etaAt &&
    unit.routeFrom
  ) {
    const span = incident.etaAt - incident.enRouteAt;
    const t = span > 0 ? (now - incident.enRouteAt) / span : 1;
    return lerp(unit.routeFrom, incident.location, Math.min(0.97, t));
  }
  return unit.position;
}

/** Deterministic small offset so markers at the same address do not sit exactly on top of each other. */
export function offsetPoint(p: LatLng, radius: number, key: string): LatLng {
  let h = 0;
  for (let i = 0; i < key.length; i += 1)
    h = (h * 31 + key.charCodeAt(i)) % 360;
  return {
    lat: p.lat + Math.sin(rad(h)) * radius,
    lng: p.lng + Math.cos(rad(h)) * radius,
  };
}

export const toTuple = (p: LatLng): [number, number] => [p.lat, p.lng];
