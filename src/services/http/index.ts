import { usePrefsStore } from "@/stores/prefs-store";
import type {
  AnalyticsOverview,
  AuditEvent,
  CommunicationSession,
  Complaint,
  DensityCell,
  Evidence,
  Incident,
  Journey,
  Message,
  Persona,
} from "@/types";
import type {
  SearchResult,
  Services,
  SessionInfo,
  UnitRecommendation,
} from "../contracts";
import { MockRtcTransport } from "../mock";
import { http, isOffline, replaceToken } from "./client";
import { applyPatch, discardQueued, flushOutbox, queueSos } from "./sync";

/**
 * API-backed implementations of the service contracts.
 *
 * The `actor` argument every command carries is ignored here on purpose: the server takes the
 * acting user from the token. Records a command returns are merged into the store straight away so
 * the screen updates without waiting for the stream to echo them.
 */
const post = <T = void>(path: string, body?: unknown, allowOffline = false) =>
  http<T>("POST", path, body ?? {}, { allowOffline });
const enc = encodeURIComponent;

const keepIncident = (incident: Incident) => {
  applyPatch({ upsert: { incidents: [incident] } });
  return incident;
};

export function createHttpServices(): Services {
  return {
    incidents: {
      create: async (input) =>
        keepIncident(await post<Incident>("/incidents", input)),
      acknowledge: (id) => post(`/incidents/${enc(id)}/acknowledge`),
      confirmTriage: (id, patch) => post(`/incidents/${enc(id)}/triage`, patch),
      addNote: (id, text) => post(`/incidents/${enc(id)}/notes`, { text }),
      escalate: (id, level, reason) =>
        post(`/incidents/${enc(id)}/escalate`, { level, reason }),
      setEscalationStatus: (escalationId, status) =>
        post(`/escalations/${enc(escalationId)}/status`, { status }),
      transfer: (id, stationId) =>
        post(`/incidents/${enc(id)}/transfer`, { stationId }),
      resolve: (id, resolution) =>
        post(`/incidents/${enc(id)}/resolve`, { resolution }),
      close: (id) => post(`/incidents/${enc(id)}/close`),
    },

    sos: {
      // An SOS must never be lost to a bad connection: if it cannot be sent it waits on the device
      // and goes out the moment the stream reconnects.
      trigger: async ({ citizen, silent, categoryId, location, note }) => {
        const request = {
          silent,
          categoryId,
          location,
          note,
          notifyContacts: usePrefsStore.getState().privacy.emergencyContacts,
        };
        if (usePrefsStore.getState().connectivity === "offline")
          return queueSos(citizen, request);
        try {
          return keepIncident(await post<Incident>("/sos", request));
        } catch (error) {
          if (isOffline(error)) return queueSos(citizen, request);
          throw error;
        }
      },
      cancel: async (incidentId, kind, reason) => {
        if (discardQueued(incidentId)) return;
        await post(`/incidents/${enc(incidentId)}/cancel`, { kind, reason });
      },
    },

    dispatch: {
      recommendUnits: (incidentId) =>
        http<UnitRecommendation[]>(
          "GET",
          `/incidents/${enc(incidentId)}/recommended-units`,
        ),
      assignUnit: (incidentId, unitId) =>
        post(`/incidents/${enc(incidentId)}/units`, { unitId }),
      releaseUnit: (incidentId, unitId, _actor, reason) =>
        post(`/incidents/${enc(incidentId)}/units/${enc(unitId)}/release`, {
          reason,
        }),
      requestBackup: (incidentId, _actor, note) =>
        post(`/incidents/${enc(incidentId)}/backup`, { note }),
    },

    units: {
      setStatus: (unitId, status) =>
        post(`/units/${enc(unitId)}/status`, { status }),
      acceptAssignment: (incidentId, unitId) =>
        post(`/incidents/${enc(incidentId)}/units/${enc(unitId)}/accept`),
      rejectAssignment: (incidentId, unitId, reason) =>
        post(`/incidents/${enc(incidentId)}/units/${enc(unitId)}/reject`, {
          reason,
        }),
      markArrived: (incidentId, unitId) =>
        post(`/incidents/${enc(incidentId)}/units/${enc(unitId)}/arrive`),
      updateStage: (incidentId, unitId, stage) =>
        post(`/incidents/${enc(incidentId)}/units/${enc(unitId)}/stage`, {
          stage,
        }),
      completeResponse: (incidentId, unitId, resolution) =>
        post(`/incidents/${enc(incidentId)}/units/${enc(unitId)}/complete`, {
          resolution,
        }),
      submitReport: (incidentId, unitId, report) =>
        post(`/incidents/${enc(incidentId)}/units/${enc(unitId)}/report`, {
          report,
        }),
    },

    evidence: {
      upload: async (input) => {
        const record = await post<Evidence>("/evidence", input);
        applyPatch({ upsert: { evidence: [record] } });
        return record;
      },
      logView: (evidenceId) => post(`/evidence/${enc(evidenceId)}/view`),
      logDenied: (evidenceId) => post(`/evidence/${enc(evidenceId)}/denied`),
      requestExport: (evidenceId, purpose) =>
        post(`/evidence/${enc(evidenceId)}/export`, { purpose }),
    },

    communication: {
      sendMessage: async (incidentId, channel, text) => {
        const message = await post<Message>(
          `/incidents/${enc(incidentId)}/messages`,
          { channel, text },
        );
        applyPatch({ upsert: { messages: [message] } });
        return message;
      },
      startSession: async (incidentId, type) => {
        const session = await post<CommunicationSession>(
          `/incidents/${enc(incidentId)}/sessions`,
          { type },
        );
        applyPatch({ upsert: { sessions: [session] } });
        return session;
      },
      endSession: (sessionId) =>
        post(`/sessions/${enc(sessionId)}/end`, undefined, true),
      // Media is still simulated. A WebRTC transport plugs in here, signalled through the API.
      createTransport: () => new MockRtcTransport(),
    },

    complaints: {
      submit: async (input) => {
        const complaint = await post<Complaint>("/complaints", input);
        if (complaint.citizenId)
          applyPatch({ upsert: { complaints: [complaint] } });
        return complaint;
      },
      updateStatus: (id, status, note) =>
        post(`/complaints/${enc(id)}/status`, { status, note }),
      addInformation: (id, note, documents) =>
        post(`/complaints/${enc(id)}/information`, { note, documents }),
    },

    journeys: {
      start: async (input) => {
        const journey = await post<Journey>("/journeys", input);
        applyPatch({ upsert: { journeys: [journey] } });
        return journey;
      },
      checkIn: (journeyId) => post(`/journeys/${enc(journeyId)}/check-in`),
      complete: (journeyId) => post(`/journeys/${enc(journeyId)}/complete`),
      stop: (journeyId) => post(`/journeys/${enc(journeyId)}/stop`),
      requestHelp: async (journeyId, _citizen, position) =>
        keepIncident(
          await post<Incident>(`/journeys/${enc(journeyId)}/help`, {
            position,
          }),
        ),
    },

    contacts: {
      add: (contact) => post("/contacts", contact),
      update: (id, patch) => http("PATCH", `/contacts/${enc(id)}`, patch),
      remove: (id) => http("DELETE", `/contacts/${enc(id)}`),
    },

    notifications: {
      markRead: (id) => post("/notifications/read", { ids: [id] }),
      markAllRead: (ids) => post("/notifications/read", { ids }),
    },

    audit: {
      query: (q) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(q))
          if (value !== undefined && value !== "")
            params.set(key, String(value));
        return http<AuditEvent[]>("GET", `/audit?${params.toString()}`);
      },
      record: (entry) => post("/audit", entry),
    },

    auth: {
      listPersonas: () => http<Persona[]>("GET", "/auth/personas"),
      verifyMfa: async (code) => {
        const { ok } = await post<{ ok: boolean }>("/auth/mfa/verify", {
          code,
        });
        if (ok) usePrefsStore.getState().setMfaVerified(Date.now());
        return ok;
      },
      getSession: () => http<SessionInfo>("GET", "/auth/session"),
      extendSession: async () => {
        const { token, session } = await post<{
          token: string;
          session: SessionInfo;
        }>("/auth/session/extend");
        replaceToken(token, session.expiresAt);
        return session;
      },
    },

    analytics: {
      getOverview: (scope) =>
        http<AnalyticsOverview>("GET", `/analytics/overview?scope=${scope}`),
      getDensity: () => http<DensityCell[]>("GET", "/analytics/density"),
    },

    search: {
      search: (query) => http<SearchResult[]>("GET", `/search?q=${enc(query)}`),
    },

    admin: {
      setRolePermission: (role, permission, enabled) =>
        http("PUT", `/admin/roles/${enc(role)}/permissions`, {
          permission,
          enabled,
        }),
      upsertUser: (user) => http("PUT", `/admin/users/${enc(user.id)}`, user),
      setUserStatus: (id, status) =>
        post(`/admin/users/${enc(id)}/status`, { status }),
      updateCategory: (id, patch) =>
        http("PATCH", `/admin/categories/${enc(id)}`, patch),
      updateSla: (priority, patch) =>
        http("PATCH", `/admin/sla/${enc(priority)}`, patch),
      upsertEscalationRule: (rule) =>
        http("PUT", `/admin/escalation-rules/${enc(rule.id)}`, rule),
      removeEscalationRule: (id) =>
        http("DELETE", `/admin/escalation-rules/${enc(id)}`),
      setIntegrationStatus: (id, status) =>
        post(`/admin/integrations/${enc(id)}/status`, { status }),
      updateTemplate: (id, patch) =>
        http("PATCH", `/admin/templates/${enc(id)}`, patch),
    },

    demo: {
      reset: () => post("/demo/reset", undefined, true),
      advance: async (personaId) =>
        (
          await post<{ incidentId: string | null }>(
            "/demo/advance",
            { personaId },
            true,
          )
        ).incidentId,
      setSimulationPaused: async (paused) => {
        usePrefsStore.getState().setSimulationPaused(paused);
        await http(
          "PUT",
          "/demo/simulation",
          { paused },
          { allowOffline: true },
        );
      },
      requestAssignment: async (unitId) =>
        (
          await post<{ incidentId: string | null }>(
            "/demo/request-assignment",
            { unitId },
          )
        ).incidentId,
    },
  };
}

export { flushOutbox };
