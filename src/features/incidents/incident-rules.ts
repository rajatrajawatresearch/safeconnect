import { STATUS_META } from "@/config/incident";
import { AREAS, STATIONS } from "@/data/demo/geo";
import { OFFICERS } from "@/data/demo/people";
import { distanceKm } from "@/lib/geo";
import type {
  ActorRef,
  Assignment,
  Incident,
  LatLng,
  Location,
  Permission,
  Unit,
} from "@/types";

/**
 * Rules the control-room screens share: what counts as an open incident, which unit is leading a
 * response, and why an action is unavailable. Kept free of React so the inspector, the dispatch
 * board and the unit screens all answer these questions the same way.
 */

export type Can = (permission: Permission) => boolean;

export const isActive = (incident: Incident) =>
  STATUS_META[incident.status].active;

/** Assignments that still count: waiting for the officer, or accepted. */
export const liveAssignments = (incident: Incident): Assignment[] =>
  incident.assignments.filter((a) => a.response !== "rejected");

export function primaryAssignment(incident: Incident): Assignment | undefined {
  const live = liveAssignments(incident);
  return live.find((a) => a.role === "primary") ?? live[0];
}

/** The moment a finished incident's response clock stopped. Undefined while it is still open. */
export function frozenAt(incident: Incident): number | undefined {
  if (isActive(incident)) return undefined;
  if (incident.resolvedAt) return incident.resolvedAt;
  return incident.timeline.reduce(
    (latest, event) => Math.max(latest, event.at),
    incident.createdAt,
  );
}

/** The officer in charge of a unit, as the actor recorded when the control room acts for the unit. */
export function officerActorFor(unit: Unit): ActorRef {
  const officer = OFFICERS.find((o) => o.id === unit.officerId);
  return {
    id: officer?.id ?? unit.id,
    name: officer?.name ?? `Unit ${unit.callSign}`,
    role: "officer",
  };
}

export const stationName = (stationId: string) =>
  STATIONS.find((s) => s.id === stationId)?.name ?? "Station not set";

const AREA_LIST = Object.values(AREAS);

/** Name of the mapped locality closest to a position. */
export function nearestAreaName(position: LatLng): string {
  let best = AREA_LIST[0];
  let bestKm = Number.POSITIVE_INFINITY;
  for (const area of AREA_LIST) {
    const km = distanceKm(area, position);
    if (km < bestKm) {
      best = area;
      bestKm = km;
    }
  }
  return best.name;
}

export const LOCATION_SOURCE_LABEL: Record<Location["source"], string> = {
  device_emergency: "Shared from the citizen's device for this emergency",
  citizen_entered: "Entered by the citizen in the report",
  operator_entered: "Entered by the operator during the call",
  unit_reported: "Reported by the responding unit",
};

const CLOSED_REASON = {
  resolved: "This incident is resolved.",
  closed: "This incident is closed.",
  cancelled: "This incident was cancelled.",
} as const;

/** Why response actions are shut for a finished incident, or null while it is open. */
export function inactiveReason(incident: Incident): string | null {
  if (isActive(incident)) return null;
  return CLOSED_REASON[incident.status as keyof typeof CLOSED_REASON] ?? null;
}

/** Why a voice or video session cannot be opened with the reporter, or null when it can. */
export function contactBlockedReason(incident: Incident): string | null {
  if (incident.anonymous)
    return "Anonymous report. The reporter chose not to be contacted.";
  if (incident.silent || incident.source === "silent_sos")
    return "Silent SOS. The citizen cannot speak safely, so use chat only.";
  if (!incident.citizenId)
    return "No app session to connect to. This report was not raised from the citizen app.";
  return null;
}

/** Why the chat with the citizen is read-only, or null when messages can be sent. */
export function chatBlockedReason(incident: Incident): string | null {
  if (incident.anonymous)
    return "Anonymous report. There is no channel back to the reporter.";
  if (!incident.citizenId)
    return "This report was not raised from the citizen app, so there is no chat channel.";
  if (!isActive(incident)) return "This conversation is closed.";
  return null;
}

export type IncidentAction =
  | "acknowledge"
  | "call"
  | "video"
  | "assign"
  | "dispatch"
  | "backup"
  | "escalate"
  | "transfer"
  | "resolve"
  | "close";

/**
 * For every inspector action, the reason it cannot be used right now — or null when it can.
 * Permission comes first, then the incident's state, then anything specific to the action.
 */
export function actionReasons(
  incident: Incident,
  can: Can,
): Record<IncidentAction, string | null> {
  const closed = inactiveReason(incident);
  const live = liveAssignments(incident);
  const blockedContact = contactBlockedReason(incident);

  return {
    acknowledge: !(can("incident.classify") || can("incident.dispatch"))
      ? "Your role cannot acknowledge incidents."
      : (closed ??
        (incident.status === "new"
          ? null
          : "This incident has already been acknowledged.")),
    call: !can("communication.citizen")
      ? "Your role cannot contact citizens."
      : (closed ?? blockedContact),
    video: !can("communication.video")
      ? "Your role cannot start video sessions."
      : (closed ?? blockedContact),
    assign: !can("unit.assign") ? "Your role cannot assign units." : closed,
    dispatch: !(can("incident.dispatch") && can("unit.assign"))
      ? "Your role cannot dispatch units."
      : (closed ??
        (live.length > 0
          ? "A unit is already assigned. Use Assign unit to add another."
          : null)),
    backup: !can("incident.dispatch")
      ? "Your role cannot request backup."
      : (closed ??
        (live.length === 0
          ? "Assign a unit before requesting backup."
          : incident.backupRequested
            ? "Backup has already been requested. Use Assign unit to add another unit."
            : null)),
    escalate: !can("incident.escalate")
      ? "Your role cannot escalate incidents."
      : (closed ??
        (incident.escalationLevel === 3
          ? "Already escalated to state command, the highest level."
          : null)),
    transfer: !can("incident.transfer")
      ? "Your role cannot transfer incidents between stations."
      : closed,
    resolve: !can("incident.resolve")
      ? "Your role cannot resolve incidents."
      : closed,
    close: !can("incident.resolve")
      ? "Your role cannot close incidents."
      : incident.status === "resolved"
        ? null
        : "Only resolved incidents can be closed.",
  };
}
