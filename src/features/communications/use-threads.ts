"use client";

import { useMemo } from "react";
import { STATUS_META } from "@/config/incident";
import { useIncidents } from "@/hooks/use-demo-data";
import { useDemoStore } from "@/stores/demo-store";
import type { CommunicationSession, Incident, Message } from "@/types";

/** Everything said and started on one incident, summarised for a conversation list. */
export interface Thread {
  incident: Incident;
  /** Latest message on either channel. */
  last?: Message;
  lastCitizen?: Message;
  lastInternal?: Message;
  citizenCount: number;
  internalCount: number;
  /** A voice or video session in progress. */
  live?: CommunicationSession;
  /** The citizen spoke last and nobody on staff has answered yet. */
  needsReply: boolean;
  /** Newest of: creation, last message, live session start. Lists sort on this. */
  activityAt: number;
}

export const isActiveIncident = (incident: Incident) =>
  STATUS_META[incident.status].active;

/**
 * Whether the incident was raised from the citizen app, so that an app session exists to chat or
 * talk through. Calls logged by an operator and anonymous tips have nobody on the other end.
 */
export const isAppLinked = (incident: Incident) =>
  !incident.anonymous &&
  (Boolean(incident.citizenId) ||
    incident.source === "sos" ||
    incident.source === "silent_sos" ||
    incident.source === "journey");

/** One `Thread` per incident that has reached the control room, newest activity first. */
export function useThreads(): Thread[] {
  const incidents = useIncidents();
  const messages = useDemoStore((s) => s.messages);
  const sessions = useDemoStore((s) => s.sessions);

  return useMemo(() => {
    const byIncident = new Map<string, Message[]>();
    for (const message of messages) {
      const list = byIncident.get(message.incidentId);
      if (list) list.push(message);
      else byIncident.set(message.incidentId, [message]);
    }
    const liveByIncident = new Map<string, CommunicationSession>();
    for (const session of sessions)
      if (session.status !== "ended" && !liveByIncident.has(session.incidentId))
        liveByIncident.set(session.incidentId, session);

    return incidents
      .map((incident): Thread => {
        const all = (byIncident.get(incident.id) ?? [])
          .slice()
          .sort((a, b) => a.at - b.at);
        const citizen = all.filter((m) => m.channel === "citizen");
        const internal = all.filter((m) => m.channel === "internal");
        const spoken = citizen.filter((m) => m.senderRole !== "system");
        const live = liveByIncident.get(incident.id);
        const last = all[all.length - 1];
        return {
          incident,
          last,
          lastCitizen: citizen[citizen.length - 1],
          lastInternal: internal[internal.length - 1],
          citizenCount: citizen.length,
          internalCount: internal.length,
          live,
          needsReply:
            isActiveIncident(incident) &&
            spoken[spoken.length - 1]?.senderRole === "citizen",
          activityAt: Math.max(
            incident.createdAt,
            last?.at ?? 0,
            live?.startedAt ?? 0,
          ),
        };
      })
      .sort((a, b) => b.activityAt - a.activityAt);
  }, [incidents, messages, sessions]);
}
