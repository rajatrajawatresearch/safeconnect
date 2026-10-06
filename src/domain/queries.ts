/**
 * Read-side rules shared by the browser demo and the API server: who is nearest, what a role may
 * find in search, how the audit log is filtered. Pure functions over platform state.
 */
import { deployment } from "@/config/deployment";
import type { DemoData } from "@/data/demo";
import { ANALYTICS } from "@/data/demo/analytics";
import { STATIONS } from "@/data/demo/geo";
import { OPERATOR } from "@/data/demo/incidents";
import { CITIZENS, OFFICERS } from "@/data/demo/people";
import { distanceKm, etaMinutesBetween, offsetPoint, roadKm } from "@/lib/geo";
import type {
  AnalyticsScope,
  AuditQuery,
  SearchResult,
  UnitRecommendation,
} from "@/services/contracts";
import type {
  ActorRef,
  AnalyticsOverview,
  AuditEvent,
  Citizen,
  Incident,
  Location,
  RoleKey,
} from "@/types";

export const DEMO_OPERATOR: ActorRef = OPERATOR;

/** "Aarav Shah" → "Aarav S." — what staff see instead of a citizen's full name. */
export function reducedName(name: string): string {
  const [first, ...rest] = name.split(" ");
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}

/**
 * A citizen's position for an emergency or report. In the prototype this is a fixed fictional
 * point near their saved area; a real client supplies the device position at the moment of the action.
 */
export function citizenLocation(citizen: Citizen, jitterKey = "now"): Location {
  const p = offsetPoint(citizen.home, 0.0011, `${citizen.id}-${jitterKey}`);
  const nearest = [...STATIONS].sort(
    (a, b) => distanceKm(a.position, p) - distanceKm(b.position, p),
  )[0];
  return {
    ...p,
    area: citizen.area,
    address: `Near Swastik Cross Road, ${citizen.area}, ${citizen.city}`,
    landmark: "Swastik Cross Road",
    districtId: nearest.districtId,
    stationId: nearest.id,
    source: "device_emergency",
    accuracyM: 20,
  };
}

/** Location used when a journey-safety alert is raised part-way along a route. */
export function journeyAlertLocation(
  citizen: Citizen,
  journeyId: string,
  position: { lat: number; lng: number },
): Location {
  return {
    ...citizenLocation(citizen, journeyId),
    ...position,
    address: `On route, ${deployment.primaryCity}`,
    landmark: undefined,
  };
}

const isOpen = (i: Incident) =>
  !["resolved", "closed", "cancelled"].includes(i.status);

/** Available units ranked by road distance to the incident, or `null` if the incident is unknown. */
export function recommendUnits(
  state: Pick<DemoData, "incidents" | "units">,
  incidentId: string,
): UnitRecommendation[] | null {
  const incident = state.incidents.find((i) => i.id === incidentId);
  if (!incident) return null;
  return state.units
    .filter((u) => u.status === "available")
    .map((unit) => ({
      unit,
      distanceKm: Number(roadKm(unit.position, incident.location).toFixed(1)),
      etaMin: etaMinutesBetween(unit.position, incident.location),
      sameStation: unit.stationId === incident.location.stationId,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** The open, unassigned incident closest to a unit — used by the field demo's "request an assignment". */
export function nearestUnassignedIncident(
  state: Pick<DemoData, "incidents" | "units">,
  unitId: string,
): Incident | undefined {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return undefined;
  return state.incidents
    .filter(
      (i) =>
        i.sync === "synced" &&
        (i.status === "new" || i.status === "acknowledged"),
    )
    .sort(
      (a, b) =>
        distanceKm(unit.position, a.location) -
        distanceKm(unit.position, b.location),
    )[0];
}

/** Which incident the presenter's "advance" control should move: theirs first, then any scripted one, then a critical one. */
export function pickAdvanceTarget(
  state: Pick<DemoData, "incidents">,
  personaId: string,
): Incident | undefined {
  const open = state.incidents.filter(
    (i) => isOpen(i) && i.status !== "on_scene" && i.sync === "synced",
  );
  return (
    open.find((i) => i.citizenId === personaId) ??
    open.find((i) => i.auto) ??
    open.find((i) => i.priority === "P1")
  );
}

export function filterAudit(events: AuditEvent[], q: AuditQuery): AuditEvent[] {
  const term = q.search?.trim().toLowerCase();
  return events.filter((e) => {
    if (q.role && q.role !== "all" && e.actorRole !== q.role) return false;
    if (q.category && q.category !== "all" && e.category !== q.category)
      return false;
    if (q.incidentId && e.incidentId !== q.incidentId) return false;
    if (q.actor && e.actorName !== q.actor) return false;
    if (q.since && e.at < q.since) return false;
    if (
      term &&
      !`${e.action} ${e.detail} ${e.actorName} ${e.incidentId ?? ""}`
        .toLowerCase()
        .includes(term)
    )
      return false;
    return true;
  });
}

/** Grouped global search. Results are limited to what the role may open. */
export function searchPlatform(
  state: Pick<DemoData, "incidents" | "complaints" | "units">,
  query: string,
  role: RoleKey,
  citizenId?: string,
): SearchResult[] {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];
  const hit = (...parts: (string | undefined)[]) =>
    parts.some((p) => p?.toLowerCase().includes(term));
  const out: SearchResult[] = [];
  const staff = role !== "citizen";

  if (staff && role !== "admin") {
    for (const i of state.incidents) {
      if (i.sync !== "synced") continue;
      if (hit(i.id, i.title, i.location.area, i.location.address)) {
        out.push({
          group: "Incidents",
          id: i.id,
          title: `${i.id} · ${i.title}`,
          subtitle: `${i.location.area} · ${i.status.replace(/_/g, " ")}`,
          href: `/control/incidents?id=${i.id}`,
        });
      }
    }
    for (const c of state.complaints) {
      if (hit(c.id, c.title, c.location.area)) {
        out.push({
          group: "Complaints",
          id: c.id,
          title: `${c.id} · ${c.title}`,
          subtitle: `${c.department} · ${c.status.replace(/_/g, " ")}`,
          href: `/control/complaints?id=${c.id}`,
        });
      }
    }
    for (const u of state.units) {
      const officer = OFFICERS.find((o) => o.id === u.officerId);
      if (hit(u.callSign, u.vehicleNo, officer?.name)) {
        out.push({
          group: "Units",
          id: u.id,
          title: u.callSign,
          subtitle: `${officer?.name ?? "Unassigned"} · ${u.status.replace(/_/g, " ")}`,
          href: `/control/units?id=${u.id}`,
        });
      }
    }
    for (const o of OFFICERS) {
      if (hit(o.name, o.badgeNo)) {
        out.push({
          group: "Officers",
          id: o.id,
          title: o.name,
          subtitle: `${o.rank} · ${o.badgeNo}`,
          href: o.unitId
            ? `/control/units?id=${o.unitId}`
            : "/control/stations",
        });
      }
    }
    // Citizen details surface only as the reduced name attached to an incident the role may open.
    if (role === "operator" || role === "supervisor" || role === "dispatcher") {
      for (const c of CITIZENS) {
        if (!hit(c.name)) continue;
        const linked = state.incidents.find((i) => i.citizenId === c.id);
        if (linked) {
          out.push({
            group: "Citizens",
            id: c.id,
            title: reducedName(c.name),
            subtitle: `Reporter on ${linked.id} · phone masked`,
            href: `/control/incidents?id=${linked.id}`,
          });
        }
      }
    }
  }
  if (staff) {
    for (const s of STATIONS) {
      if (hit(s.name, s.code, s.area)) {
        out.push({
          group: "Stations",
          id: s.id,
          title: s.name,
          subtitle: `${s.inChargeName} · code ${s.code}`,
          href:
            role === "admin"
              ? "/admin/organization"
              : `/control/stations?id=${s.id}`,
        });
      }
    }
  } else {
    for (const c of state.complaints) {
      if (citizenId && c.citizenId !== citizenId) continue;
      if (hit(c.id, c.title))
        out.push({
          group: "Complaints",
          id: c.id,
          title: `${c.id} · ${c.title}`,
          subtitle: c.status.replace(/_/g, " "),
          href: `/citizen/complaints?id=${c.id}`,
        });
    }
  }
  return out.slice(0, 24);
}

/**
 * Trend and distribution series for a scope. These are seeded aggregates; a production deployment
 * serves them from a reporting store built off the incident event stream.
 */
export function analyticsOverview(scope: AnalyticsScope): AnalyticsOverview {
  if (scope === "state") return ANALYTICS;
  // Station and district scopes reuse the same series, scaled, so every chart has plausible data.
  const k = scope === "district" ? 0.42 : 0.06;
  return {
    ...ANALYTICS,
    hourly: ANALYTICS.hourly.map((h) => ({
      ...h,
      incidents: Math.max(1, Math.round(h.incidents * k * 2.4)),
      critical: Math.round(h.critical * k * 2.4),
    })),
    trend: ANALYTICS.trend.map((t) => ({
      ...t,
      opened: Math.round(t.opened * k),
      resolved: Math.round(t.resolved * k),
    })),
    categories: ANALYTICS.categories.map((c) => ({
      ...c,
      count: Math.round(c.count * k),
    })),
    resource: ANALYTICS.resource.map((r) => ({
      ...r,
      available: Math.max(1, Math.round(r.available * k)),
      engaged: Math.max(1, Math.round(r.engaged * k)),
      offDuty: Math.round(r.offDuty * k),
    })),
    activeVsResolved: ANALYTICS.activeVsResolved.map((a) => ({
      ...a,
      active: Math.round(a.active * k * 2.4),
      resolved: Math.round(a.resolved * k * 2.4),
    })),
  };
}
