"use client";

import { useMemo } from "react";
import { ACTIVE_STATUSES, PRIORITY_META } from "@/config/incident";
import { OFFICERS } from "@/data/demo/people";
import { useDemoStore } from "@/stores/demo-store";
import type {
  AppNotification,
  Assignment,
  Incident,
  IncidentCategory,
  MessageChannel,
  Officer,
  Unit,
} from "@/types";
import type { Session } from "./use-session";

/**
 * Live read hooks over the realtime store.
 *
 * Zustand rule used throughout: a selector must return a stable reference. Select the raw slice
 * and derive with `useMemo` — never `.filter()`/`.map()` inside the selector itself.
 */

const isActive = (i: Incident) => ACTIVE_STATUSES.includes(i.status);

export const byUrgency = (a: Incident, b: Incident) =>
  PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank ||
  b.createdAt - a.createdAt;

/** Every incident that has reached the control room, newest first. Staff views use this. */
export function useIncidents(): Incident[] {
  const all = useDemoStore((s) => s.incidents);
  return useMemo(() => all.filter((i) => i.sync === "synced"), [all]);
}

/** Open incidents ordered by priority, then recency. */
export function useActiveIncidents(): Incident[] {
  const incidents = useIncidents();
  return useMemo(() => incidents.filter(isActive).sort(byUrgency), [incidents]);
}

export const useIncident = (
  id: string | null | undefined,
): Incident | undefined =>
  useDemoStore((s) => (id ? s.incidents.find((i) => i.id === id) : undefined));

export const useUnits = (): Unit[] => useDemoStore((s) => s.units);

export const useUnit = (id: string | null | undefined): Unit | undefined =>
  useDemoStore((s) => (id ? s.units.find((u) => u.id === id) : undefined));

export const officerOfUnit = (unit: Unit | undefined): Officer | undefined =>
  unit ? OFFICERS.find((o) => o.id === unit.officerId) : undefined;

export function useCategories(): IncidentCategory[] {
  return useDemoStore((s) => s.categories);
}

/** `const label = useCategoryLabel(); label(incident.categoryId)` */
export function useCategoryLookup() {
  const categories = useCategories();
  return useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c]));
    return (id: string) => map.get(id);
  }, [categories]);
}

/** A citizen's open emergency (SOS, silent SOS or journey alert), including one still queued offline. */
export function useCitizenActiveSos(
  citizenId: string | undefined,
): Incident | undefined {
  const all = useDemoStore((s) => s.incidents);
  return useMemo(
    () =>
      citizenId
        ? all.find(
            (i) =>
              i.citizenId === citizenId &&
              isActive(i) &&
              (i.source === "sos" ||
                i.source === "silent_sos" ||
                i.source === "journey"),
          )
        : undefined,
    [all, citizenId],
  );
}

/** Everything a citizen has raised, newest first. */
export function useCitizenIncidents(citizenId: string | undefined): Incident[] {
  const all = useDemoStore((s) => s.incidents);
  return useMemo(
    () => (citizenId ? all.filter((i) => i.citizenId === citizenId) : []),
    [all, citizenId],
  );
}

export interface OfficerWork {
  /** Assigned to this unit and waiting for accept or decline. */
  pending: { incident: Incident; assignment: Assignment } | null;
  /** Accepted and still open. */
  active: { incident: Incident; assignment: Assignment } | null;
  /** Resolved incidents whose response report this unit still owes. */
  reportsDue: Incident[];
  /** Everything this unit has been assigned to, newest first. */
  history: Incident[];
}

export function useOfficerWork(unitId: string | undefined): OfficerWork {
  const incidents = useIncidents();
  return useMemo(() => {
    const mine = unitId
      ? incidents.filter((i) =>
          i.assignments.some(
            (a) => a.unitId === unitId && a.response !== "rejected",
          ),
        )
      : [];
    const pair = (incident: Incident | undefined) => {
      const assignment = incident?.assignments.find(
        (a) => a.unitId === unitId && a.response !== "rejected",
      );
      return incident && assignment ? { incident, assignment } : null;
    };
    const open = mine.filter(isActive);
    return {
      pending: pair(
        open.find((i) =>
          i.assignments.some(
            (a) => a.unitId === unitId && a.response === "pending",
          ),
        ),
      ),
      active: pair(
        open.find((i) =>
          i.assignments.some(
            (a) => a.unitId === unitId && a.response === "accepted",
          ),
        ),
      ),
      reportsDue: mine.filter(
        (i) =>
          i.status === "resolved" &&
          i.assignments.some(
            (a) => a.unitId === unitId && a.stage === "report_pending",
          ),
      ),
      history: mine,
    };
  }, [incidents, unitId]);
}

export function useIncidentMessages(
  incidentId: string | undefined,
  channel?: MessageChannel,
) {
  const all = useDemoStore((s) => s.messages);
  return useMemo(
    () =>
      all
        .filter(
          (m) =>
            m.incidentId === incidentId && (!channel || m.channel === channel),
        )
        .sort((a, b) => a.at - b.at),
    [all, incidentId, channel],
  );
}

export function useIncidentEvidence(incidentId: string | undefined) {
  const all = useDemoStore((s) => s.evidence);
  return useMemo(
    () => all.filter((e) => e.incidentId === incidentId),
    [all, incidentId],
  );
}

/** The live voice or video session on an incident, if one is in progress. */
export function useLiveSession(incidentId: string | undefined) {
  const sessions = useDemoStore((s) => s.sessions);
  return useMemo(
    () =>
      sessions.find((x) => x.incidentId === incidentId && x.status !== "ended"),
    [sessions, incidentId],
  );
}

export function notificationVisibleTo(
  n: AppNotification,
  session: Pick<Session, "persona" | "role">,
): boolean {
  if (!n.audience.includes(session.role)) return false;
  if (session.role === "citizen") return n.citizenId === session.persona.id;
  if (session.role === "officer")
    return !n.unitId || n.unitId === session.persona.unitId;
  return true;
}

export function useNotifications(session: Pick<Session, "persona" | "role">) {
  const all = useDemoStore((s) => s.notifications);
  return useMemo(() => {
    const items = all.filter((n) => notificationVisibleTo(n, session));
    const unread = items.filter((n) => !n.readBy.includes(session.persona.id));
    return { items, unread, unreadCount: unread.length };
  }, [all, session]);
}

export interface OpsStats {
  activeEmergencies: number;
  critical: number;
  unassigned: number;
  unitsAvailable: number;
  unitsEnRoute: number;
  unitsOnScene: number;
  unitsTotal: number;
  resolvedToday: number;
  escalationsOpen: number;
  /** Mean seconds from creation to arrival across incidents that have an arrival time. */
  avgResponseSec: number;
}

export function useOpsStats(stationId?: string): OpsStats {
  const incidents = useIncidents();
  const units = useUnits();
  const escalations = useDemoStore((s) => s.escalations);
  return useMemo(() => {
    const scope = stationId
      ? incidents.filter((i) => i.location.stationId === stationId)
      : incidents;
    const scopedUnits = stationId
      ? units.filter((u) => u.stationId === stationId)
      : units;
    const active = scope.filter(isActive);
    const arrived = scope.filter((i) => i.arrivedAt);
    const ids = new Set(scope.map((i) => i.id));
    return {
      activeEmergencies: active.length,
      critical: active.filter((i) => i.priority === "P1").length,
      unassigned: active.filter(
        (i) => i.status === "new" || i.status === "acknowledged",
      ).length,
      unitsAvailable: scopedUnits.filter((u) => u.status === "available")
        .length,
      unitsEnRoute: scopedUnits.filter((u) => u.status === "en_route").length,
      unitsOnScene: scopedUnits.filter((u) => u.status === "on_scene").length,
      unitsTotal: scopedUnits.length,
      resolvedToday: scope.filter(
        (i) => i.status === "resolved" || i.status === "closed",
      ).length,
      escalationsOpen: escalations.filter(
        (e) => e.status === "open" && ids.has(e.incidentId),
      ).length,
      avgResponseSec: arrived.length
        ? Math.round(
            arrived.reduce(
              (sum, i) => sum + ((i.arrivedAt as number) - i.createdAt) / 1000,
              0,
            ) / arrived.length,
          )
        : 0,
    };
  }, [incidents, units, escalations, stationId]);
}
