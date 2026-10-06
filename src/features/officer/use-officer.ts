"use client";

import { useMemo } from "react";
import { ACTIVE_STATUSES } from "@/config/incident";
import { STATIONS } from "@/data/demo/geo";
import {
  officerOfUnit,
  useActiveIncidents,
  useIncident,
  useOfficerWork,
  useUnit,
} from "@/hooks/use-demo-data";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { etaMinutesBetween, roadKm, unitPositionAt } from "@/lib/geo";
import type { TKey } from "@/lib/i18n";
import type { Assignment, Incident, LatLng, OfficerStage, Unit } from "@/types";

/** Everything the officer screens need about "me": persona, unit, station and current work. */
export function useOfficer() {
  const session = useSession();
  const unitId = session.persona.unitId;
  const unit = useUnit(unitId);
  const work = useOfficerWork(unitId);
  const officer = officerOfUnit(unit);
  const station = useMemo(
    () => STATIONS.find((s) => s.id === unit?.stationId),
    [unit?.stationId],
  );
  return { ...session, unitId, unit, officer, station, work };
}

/** Where the unit is right now. Animates along the run while en route. */
export function useUnitPosition(unit: Unit | undefined): LatLng | undefined {
  const incident = useIncident(unit?.currentIncidentId);
  const now = useNow(2000);
  return useMemo(
    () => (unit ? unitPositionAt(unit, incident, now) : undefined),
    [unit, incident, now],
  );
}

export interface NearbyIncident {
  incident: Incident;
  km: number;
  etaMin: number;
}

/**
 * Open incidents around a point, nearest first, leaving out the ones this unit is already on.
 * Pass `radiusKm` to keep only those within reach.
 */
export function useNearbyIncidents(
  origin: LatLng | undefined,
  unitId: string | undefined,
  radiusKm?: number,
): NearbyIncident[] {
  const active = useActiveIncidents();
  return useMemo(() => {
    if (!origin) return [];
    return active
      .filter((i) => !assignmentOf(i, unitId))
      .map((incident) => ({
        incident,
        km: roadKm(origin, incident.location),
        etaMin: etaMinutesBetween(origin, incident.location),
      }))
      .filter((n) => radiusKm === undefined || n.km <= radiusKm)
      .sort((a, b) => a.km - b.km);
  }, [active, origin, unitId, radiusKm]);
}

/** This unit's live (not declined) assignment on an incident. */
export const assignmentOf = (
  incident: Incident,
  unitId: string | undefined,
): Assignment | undefined =>
  incident.assignments.find(
    (a) => a.unitId === unitId && a.response !== "rejected",
  );

export const isOpenIncident = (incident: Incident) =>
  ACTIVE_STATUSES.includes(incident.status);

export const STAGE_LABEL_KEY: Record<OfficerStage, TKey> = {
  assigned: "officer.stage.assigned",
  accepted: "officer.stage.accepted",
  en_route: "officer.stage.en_route",
  on_scene: "officer.stage.on_scene",
  assistance_requested: "officer.stage.assistance_requested",
  situation_controlled: "officer.stage.situation_controlled",
  report_pending: "officer.stage.report_pending",
  completed: "officer.stage.completed",
};

/**
 * The officer has reached the scene. "Assistance requested" can be raised on the way or on scene,
 * so that stage alone does not say which — the unit's own status does.
 */
export function hasArrived(assignment: Assignment, unit: Unit): boolean {
  if (
    assignment.stage === "on_scene" ||
    assignment.stage === "situation_controlled"
  )
    return true;
  return (
    assignment.stage === "assistance_requested" && unit.status === "on_scene"
  );
}

/**
 * The stage to light up on the main line of the tracker. "Assistance requested" is a branch, so it
 * maps back to wherever the officer actually is.
 */
export function mainlineStage(
  assignment: Assignment,
  unit: Unit | undefined,
): OfficerStage {
  if (assignment.stage !== "assistance_requested") return assignment.stage;
  if (unit?.status === "on_scene") return "on_scene";
  if (unit?.status === "en_route") return "en_route";
  return "accepted";
}

/** "3 h 58 min", "12 min", or "ended" once the time has passed. */
export function formatRemaining(until: number, now: number): string {
  const min = Math.floor((until - now) / 60_000);
  if (now === 0) return "—";
  if (min <= 0) return "ended";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

/** Directions link on OpenStreetMap. Opens outside the app; nothing is shared with it but the two points. */
export const directionsUrl = (from: LatLng, to: LatLng) =>
  `https://www.openstreetmap.org/directions?route=${from.lat.toFixed(5)}%2C${from.lng.toFixed(5)}%3B${to.lat.toFixed(5)}%2C${to.lng.toFixed(5)}`;

/** The control room actor used by the demo "request an assignment" shortcut. */
export const DEMO_DISPATCHER = {
  id: "stf-meera",
  name: "Meera Joshi",
  role: "operator",
} as const;
