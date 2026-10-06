import { DENSITY, PERSONAS } from "@/data/demo";
import {
  DEMO_OPERATOR,
  analyticsOverview,
  citizenLocation,
  filterAudit,
  journeyAlertLocation,
  nearestUnassignedIncident,
  pickAdvanceTarget,
  recommendUnits,
  reducedName,
  searchPlatform,
} from "@/domain/queries";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import type { ActorRef } from "@/types";
import {
  ServiceError,
  type RtcTransport,
  type Services,
  type SessionInfo,
} from "../contracts";

const db = () => useDemoStore.getState();
const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Stands in for the network. Adds latency, slows down on a weak connection and fails when offline,
 * so loading, retry and offline states in the UI are exercised for real.
 */
async function request<T>(
  run: () => T,
  opts: { allowOffline?: boolean; ms?: number } = {},
): Promise<T> {
  const { connectivity } = usePrefsStore.getState();
  if (connectivity === "offline" && !opts.allowOffline) {
    await wait(350);
    throw new ServiceError("offline", "Connection interrupted. Reconnecting…");
  }
  await wait(
    connectivity === "weak"
      ? 900 + Math.random() * 600
      : (opts.ms ?? 140 + Math.random() * 160),
  );
  return run();
}

export class MockRtcTransport implements RtcTransport {
  async connect() {
    await wait(900);
    return {
      quality:
        usePrefsStore.getState().connectivity === "weak"
          ? ("weak" as const)
          : ("good" as const),
    };
  }
  setMuted() {}
  setCameraEnabled() {}
  switchCamera() {}
  disconnect() {}
}

function sessionFor(personaId: string, extendMin = 30): SessionInfo {
  const now = Date.now();
  return {
    device: personaId.startsWith("cit")
      ? "Citizen app · this device"
      : "Console workstation CR-07 · this browser",
    startedAt: now - 47 * 60_000,
    expiresAt: now + extendMin * 60_000,
    mfaVerified: Boolean(usePrefsStore.getState().mfaVerifiedAt),
    lastIp: "10.24.XX.XX (masked)",
  };
}

/** In-browser implementations: every command runs against the local store. No server involved. */
export function createMockServices(): Services {
  return {
    incidents: {
      create: (input, actor) =>
        request(() => db().createIncident(input, actor)),
      acknowledge: (id, actor) =>
        request(() => db().acknowledgeIncident(id, actor)),
      confirmTriage: (id, patch, actor) =>
        request(() => db().confirmTriage(id, patch, actor)),
      addNote: (id, text, actor) =>
        request(() => db().addNote(id, text, actor)),
      escalate: (id, level, reason, actor) =>
        request(() => db().escalateIncident(id, level, reason, actor)),
      setEscalationStatus: (escalationId, status, actor) =>
        request(() => db().setEscalationStatus(escalationId, status, actor)),
      transfer: (id, stationId, actor) =>
        request(() => db().transferIncident(id, stationId, actor)),
      resolve: (id, resolution, actor) =>
        request(() => db().resolveIncident(id, resolution, actor)),
      close: (id, actor) => request(() => db().closeIncident(id, actor)),
    },

    sos: {
      trigger: ({ citizen, silent, categoryId, location, note }) =>
        request(
          () => {
            const online = usePrefsStore.getState().connectivity !== "offline";
            const actor: ActorRef = {
              id: citizen.id,
              name: citizen.name,
              role: "citizen",
            };
            const incident = db().createIncident(
              {
                source: silent ? "silent_sos" : "sos",
                categoryId: categoryId ?? "personal_danger",
                priority: "P1",
                description:
                  note?.trim() ||
                  (silent
                    ? "Silent SOS raised from the citizen app. Chat only until the citizen says otherwise."
                    : "SOS raised from the citizen app. No further details yet."),
                location: location ?? citizenLocation(citizen),
                citizenId: citizen.id,
                reporterName: reducedName(citizen.name),
                reporterPhoneMasked: citizen.phoneMasked,
                peopleInDanger: true,
                silent,
                auto: true,
                sync: online ? "synced" : "queued",
              },
              actor,
            );
            if (usePrefsStore.getState().privacy.emergencyContacts) {
              const contacts = db().contacts.filter(
                (c) => c.citizenId === citizen.id && c.notifyOnSos,
              );
              if (contacts.length) {
                db().pushNotification({
                  kind: "sos",
                  title: online
                    ? "Trusted contacts notified"
                    : "Trusted contacts will be notified when you are back online",
                  body: contacts.map((c) => c.name).join(", "),
                  audience: ["citizen"],
                  citizenId: citizen.id,
                  incidentId: incident.id,
                  href: "/citizen/sos",
                  tone: "info",
                });
              }
            }
            return incident;
          },
          { allowOffline: true, ms: 250 },
        ),
      cancel: (incidentId, kind, reason, actor) =>
        request(() => db().cancelIncident(incidentId, kind, reason, actor), {
          allowOffline: true,
        }),
    },

    dispatch: {
      recommendUnits: (incidentId) =>
        request(() => {
          const ranked = recommendUnits(db(), incidentId);
          if (!ranked)
            throw new ServiceError("not_found", "Unable to load the incident.");
          return ranked;
        }),
      assignUnit: (incidentId, unitId, actor) =>
        request(() => db().assignUnit(incidentId, unitId, actor)),
      releaseUnit: (incidentId, unitId, actor, reason) =>
        request(() => db().unassignUnit(incidentId, unitId, actor, reason)),
      requestBackup: (incidentId, actor, note) =>
        request(() => db().requestBackup(incidentId, actor, note)),
    },

    units: {
      setStatus: (unitId, status, actor) =>
        request(() => db().setUnitStatus(unitId, status, actor)),
      acceptAssignment: (incidentId, unitId, actor) =>
        request(() => {
          db().respondToAssignment(incidentId, unitId, "accepted", actor);
          db().startEnRoute(incidentId, unitId, actor);
        }),
      rejectAssignment: (incidentId, unitId, reason, actor) =>
        request(() =>
          db().respondToAssignment(
            incidentId,
            unitId,
            "rejected",
            actor,
            reason,
          ),
        ),
      markArrived: (incidentId, unitId, actor) =>
        request(() => db().markArrived(incidentId, unitId, actor)),
      updateStage: (incidentId, unitId, stage, actor) =>
        request(() => {
          db().setOfficerStage(incidentId, unitId, stage, actor);
          if (stage === "assistance_requested")
            db().requestBackup(
              incidentId,
              actor,
              "Requested by the officer on scene",
            );
        }),
      completeResponse: (incidentId, _unitId, resolution, actor) =>
        request(() => db().resolveIncident(incidentId, resolution, actor)),
      submitReport: (incidentId, unitId, report, actor) =>
        request(() =>
          db().submitResponseReport(incidentId, unitId, report, actor),
        ),
    },

    evidence: {
      upload: (input, actor) =>
        request(
          () => {
            const record = db().addEvidence(input, actor);
            setTimeout(
              () => useDemoStore.getState().verifyEvidence(record.id),
              2600,
            );
            return record;
          },
          { ms: 700 },
        ),
      logView: (evidenceId, actor) =>
        request(
          () =>
            db().logEvidenceAccess(
              evidenceId,
              "viewed",
              actor,
              "Viewed in evidence centre",
            ),
          { ms: 60 },
        ),
      logDenied: (evidenceId, actor) =>
        request(
          () =>
            db().logEvidenceAccess(
              evidenceId,
              "access_denied",
              actor,
              "Role does not include evidence.restricted",
            ),
          { ms: 60 },
        ),
      requestExport: (evidenceId, purpose, actor) =>
        request(() =>
          db().logEvidenceAccess(
            evidenceId,
            "export_requested",
            actor,
            purpose,
          ),
        ),
    },

    communication: {
      sendMessage: (incidentId, channel, text, actor, displayName) =>
        request(
          () => db().sendMessage(incidentId, channel, text, actor, displayName),
          { ms: 90 },
        ),
      startSession: (incidentId, type, actor) =>
        request(() => db().startSession(incidentId, type, actor), { ms: 400 }),
      endSession: (sessionId, actor) =>
        request(() => db().endSession(sessionId, actor), {
          allowOffline: true,
          ms: 60,
        }),
      createTransport: () => new MockRtcTransport(),
    },

    complaints: {
      submit: (input, actor) =>
        request(() => db().submitComplaint(input, actor), { ms: 600 }),
      updateStatus: (id, status, note, actor) =>
        request(() => db().updateComplaintStatus(id, status, note, actor)),
      addInformation: (id, note, documents, actor) =>
        request(() => db().addComplaintInfo(id, note, documents, actor)),
    },

    journeys: {
      start: (input) => request(() => db().startJourney(input)),
      checkIn: (journeyId) =>
        request(() => db().journeyCheckIn(journeyId), {
          allowOffline: true,
          ms: 80,
        }),
      complete: (journeyId) =>
        request(() => db().endJourney(journeyId, "completed"), {
          allowOffline: true,
        }),
      stop: (journeyId) =>
        request(() => db().endJourney(journeyId, "stopped"), {
          allowOffline: true,
        }),
      requestHelp: (journeyId, citizen, position) =>
        request(
          () => {
            db().endJourney(journeyId, "help_requested");
            return db().createIncident(
              {
                source: "journey",
                categoryId: "personal_danger",
                priority: "P1",
                title: "Journey safety — help requested",
                description:
                  "Citizen asked for help during a shared journey. Route and trusted contacts are attached.",
                location: journeyAlertLocation(citizen, journeyId, position),
                citizenId: citizen.id,
                reporterName: reducedName(citizen.name),
                reporterPhoneMasked: citizen.phoneMasked,
                peopleInDanger: true,
                auto: true,
                sync:
                  usePrefsStore.getState().connectivity === "offline"
                    ? "queued"
                    : "synced",
              },
              { id: citizen.id, name: citizen.name, role: "citizen" },
            );
          },
          { allowOffline: true },
        ),
    },

    contacts: {
      add: (contact) => request(() => db().addContact(contact)),
      update: (id, patch) =>
        request(() => db().updateContact(id, patch), { ms: 60 }),
      remove: (id) => request(() => db().removeContact(id)),
    },

    notifications: {
      markRead: (id, userId) =>
        request(() => db().markNotificationRead(id, userId), {
          allowOffline: true,
          ms: 20,
        }),
      markAllRead: (ids, userId) =>
        request(() => db().markAllNotificationsRead(ids, userId), {
          allowOffline: true,
          ms: 20,
        }),
    },

    audit: {
      query: (q) => request(() => filterAudit(db().audit, q), { ms: 420 }),
      record: (entry, actor) =>
        request(() => db().recordAudit(entry, actor), { ms: 30 }),
    },

    auth: {
      listPersonas: () =>
        request(() => PERSONAS, { allowOffline: true, ms: 40 }),
      verifyMfa: (code) =>
        request(
          () => {
            const ok = /^\d{6}$/.test(code);
            if (ok) usePrefsStore.getState().setMfaVerified(Date.now());
            return ok;
          },
          { ms: 700 },
        ),
      getSession: (personaId) =>
        request(() => sessionFor(personaId), { allowOffline: true, ms: 40 }),
      extendSession: (personaId) =>
        request(() => sessionFor(personaId, 30), { ms: 300 }),
    },

    analytics: {
      getOverview: (scope) =>
        request(() => analyticsOverview(scope), { ms: 650 }),
      getDensity: () => request(() => DENSITY, { ms: 500 }),
    },

    search: {
      search: (query, role) =>
        request(() => searchPlatform(db(), query, role), { ms: 180 }),
    },

    admin: {
      setRolePermission: (role, permission, enabled, actor) =>
        request(
          () => db().setRolePermission(role, permission, enabled, actor),
          { ms: 80 },
        ),
      upsertUser: (user, actor) => request(() => db().upsertStaff(user, actor)),
      setUserStatus: (id, status, actor) =>
        request(() => db().setStaffStatus(id, status, actor)),
      updateCategory: (id, patch, actor) =>
        request(() => db().updateCategory(id, patch, actor), { ms: 80 }),
      updateSla: (priority, patch, actor) =>
        request(() => db().updateSla(priority, patch, actor), { ms: 80 }),
      upsertEscalationRule: (rule, actor) =>
        request(() => db().upsertEscalationRule(rule, actor), { ms: 80 }),
      removeEscalationRule: (id, actor) =>
        request(() => db().removeEscalationRule(id, actor)),
      setIntegrationStatus: (id, status, actor) =>
        request(() => db().setIntegrationStatus(id, status, actor)),
      updateTemplate: (id, patch, actor) =>
        request(() => db().updateTemplate(id, patch, actor), { ms: 80 }),
    },

    demo: {
      reset: () =>
        request(() => db().resetDemo(), { allowOffline: true, ms: 60 }),
      advance: (personaId) =>
        request(
          () => {
            const target = pickAdvanceTarget(db(), personaId);
            if (!target) return null;
            db().advanceIncident(target.id);
            return target.id;
          },
          { allowOffline: true, ms: 60 },
        ),
      setSimulationPaused: (paused) =>
        request(() => usePrefsStore.getState().setSimulationPaused(paused), {
          allowOffline: true,
          ms: 0,
        }),
      requestAssignment: (unitId) =>
        request(() => {
          const incident = nearestUnassignedIncident(db(), unitId);
          if (!incident) return null;
          db().assignUnit(incident.id, unitId, DEMO_OPERATOR);
          return incident.id;
        }),
    },
  };
}
