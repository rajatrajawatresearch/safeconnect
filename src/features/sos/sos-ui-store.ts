"use client";

import { create } from "zustand";
import type { Incident } from "@/types";

/**
 * View state for the citizen emergency screen. Nothing here is domain data: it only remembers how
 * this device is showing an emergency (discreet or full) and which closure summaries were dismissed.
 */
interface SosUiState {
  /** Per-incident override of the display mode. Absent means "follow how the SOS was raised". */
  discreet: Record<string, boolean>;
  dismissed: string[];
  setDiscreet: (incidentId: string, on: boolean) => void;
  dismiss: (incidentId: string) => void;
}

export const useSosUi = create<SosUiState>()((set) => ({
  discreet: {},
  dismissed: [],
  setDiscreet: (incidentId, on) =>
    set((s) => ({ discreet: { ...s.discreet, [incidentId]: on } })),
  dismiss: (incidentId) =>
    set((s) => ({ dismissed: [...s.dismissed, incidentId] })),
}));

/** When this browser tab loaded the app. Emergencies that ended before it are history, not news. */
const SESSION_STARTED_AT = Date.now();

const EMERGENCY_SOURCES: Incident["source"][] = [
  "sos",
  "silent_sos",
  "journey",
];
const ENDED: Incident["status"][] = ["resolved", "closed", "cancelled"];

export function endedAt(incident: Incident): number {
  if (incident.resolvedAt) return incident.resolvedAt;
  return incident.timeline.reduce(
    (latest, event) => Math.max(latest, event.at),
    incident.createdAt,
  );
}

/**
 * The emergency whose ending the citizen has not yet seen: it ended during this visit and its
 * summary has not been dismissed. Older ones live in the activity screen.
 */
export function findUnseenClosure(
  incidents: Incident[],
  dismissed: string[],
): Incident | undefined {
  return incidents
    .filter(
      (i) =>
        EMERGENCY_SOURCES.includes(i.source) &&
        ENDED.includes(i.status) &&
        !dismissed.includes(i.id) &&
        endedAt(i) >= SESSION_STARTED_AT,
    )
    .sort((a, b) => endedAt(b) - endedAt(a))[0];
}
