import { DISPATCH_COLUMNS } from "@/config/incident";
import {
  liveAssignments,
  primaryAssignment,
  type Can,
} from "@/features/incidents/incident-rules";
import type { Incident, Unit } from "@/types";

export type ColumnKey = (typeof DISPATCH_COLUMNS)[number]["key"];

const ORDER = DISPATCH_COLUMNS.map((c) => c.key);

export const columnLabel = (key: ColumnKey) =>
  DISPATCH_COLUMNS.find((c) => c.key === key)?.label ?? key;

/** The board column an incident sits in, or null when it is off the board (closed or cancelled). */
export function columnOf(incident: Incident): ColumnKey | null {
  return (
    DISPATCH_COLUMNS.find((c) => c.statuses.includes(incident.status))?.key ??
    null
  );
}

/**
 * What moving a card means. Each permitted move is a real step in the response:
 * choosing a unit, the unit setting off, the unit arriving, the incident being resolved.
 */
export type MovePlan =
  | { ok: true; kind: "assign" | "resolve"; hint: string }
  | { ok: true; kind: "accept" | "arrive"; unit: Unit; hint: string }
  | { ok: false; reason: string };

const no = (reason: string): MovePlan => ({ ok: false, reason });

export function planMove(
  incident: Incident,
  to: ColumnKey,
  units: Unit[],
  can: Can,
): MovePlan {
  const from = columnOf(incident);
  if (!from) return no("This incident is no longer on the board.");
  if (from === to) return no(`Already in ${columnLabel(to)}.`);
  if (from === "resolved")
    return no(
      "Resolved incidents stay resolved. Open the incident to close it after review.",
    );

  const step = ORDER.indexOf(to) - ORDER.indexOf(from);
  if (step < 0)
    return no(
      to === "unassigned"
        ? "Incidents do not move backwards on the board. To return this one to Unassigned, release its unit from the Responders tab."
        : "Incidents do not move backwards on the board.",
    );
  if (step > 1) {
    if (to === "resolved")
      return no(
        "Only an incident with a unit on scene can be resolved from the board. Open the incident to resolve it earlier.",
      );
    if (from === "unassigned")
      return no(
        "Assign a unit first. The incident moves on when the unit accepts.",
      );
    return no("The unit has to be en route before it can arrive.");
  }

  const unitOf = (unitId: string | undefined) =>
    units.find((u) => u.id === unitId);

  switch (to) {
    case "assigned":
      return can("unit.assign")
        ? { ok: true, kind: "assign", hint: "Choose a unit" }
        : no("Your role cannot assign units.");
    case "en_route": {
      if (!can("incident.dispatch"))
        return no("Your role cannot dispatch units.");
      const unit = unitOf(primaryAssignment(incident)?.unitId);
      return unit
        ? {
            ok: true,
            kind: "accept",
            unit,
            hint: `Accept and set off for ${unit.callSign}`,
          }
        : no("No unit is assigned to this incident.");
    }
    case "on_scene": {
      if (!can("incident.dispatch"))
        return no("Your role cannot dispatch units.");
      const accepted = liveAssignments(incident).filter(
        (a) => a.response === "accepted",
      );
      const unit = unitOf(
        (accepted.find((a) => a.role === "primary") ?? accepted[0])?.unitId,
      );
      return unit
        ? {
            ok: true,
            kind: "arrive",
            unit,
            hint: `Mark ${unit.callSign} arrived`,
          }
        : no("No unit has accepted this incident yet.");
    }
    case "resolved":
      return can("incident.resolve")
        ? { ok: true, kind: "resolve", hint: "Add a resolution note" }
        : no("Your role cannot resolve incidents.");
    default:
      return no("Incidents cannot be moved back to Unassigned from the board.");
  }
}
