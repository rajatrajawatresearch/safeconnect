/**
 * The platform's state and every command that may change it.
 *
 * This module is framework-free and runs in two places:
 *  - in the browser, wrapped by `src/stores/demo-store.ts`, as the stand-alone demo;
 *  - in the API server (`server/`), where it is the authoritative state written through to PostgreSQL.
 * Keeping one implementation means the demo and the real backend cannot drift apart.
 */
import { ESCALATION_LEVEL_LABEL, PRIORITY_META } from "@/config/incident";
import { deployment } from "@/config/deployment";
import { buildDemoData, type DemoData } from "@/data/demo";
import { STATIONS } from "@/data/demo/geo";
import {
  OFFICER_NAME_BY_UNIT,
  OPERATOR,
  retentionFor,
} from "@/data/demo/incidents";
import { distanceKm, etaMinutesBetween, roadKm, unitPositionAt } from "@/lib/geo";
import { fakeDigest, uid } from "@/lib/prng";
import type {
  ActorRef,
  AiTriage,
  AppNotification,
  AuditEvent,
  CommunicationSession,
  Complaint,
  ComplaintKind,
  ComplaintStatus,
  EmergencyContact,
  EscalationRule,
  Evidence,
  EvidenceAccess,
  EvidenceClassification,
  EvidenceType,
  Incident,
  IncidentCategory,
  IncidentPriority,
  IncidentSource,
  Integration,
  Journey,
  Location,
  Message,
  MessageChannel,
  NotificationTemplate,
  OfficerStage,
  Permission,
  RoleKey,
  SessionType,
  SlaPolicy,
  StaffUser,
  TimelineKind,
  Unit,
  UnitStatus,
} from "@/types";

const SEC = 1000;
const MIN = 60 * SEC;
const STAFF_AUDIENCE: RoleKey[] = [
  "operator",
  "dispatcher",
  "supervisor",
  "command",
];
const SYSTEM: ActorRef = { id: "system", name: "System", role: "admin" };

/* ───────────────────────── Command inputs ───────────────────────── */

export interface CreateIncidentInput {
  source: IncidentSource;
  categoryId: string;
  priority?: IncidentPriority;
  title?: string;
  description: string;
  location: Location;
  citizenId?: string;
  reporterName: string;
  reporterPhoneMasked?: string;
  anonymous?: boolean;
  peopleInDanger?: boolean;
  silent?: boolean;
  auto?: boolean;
  sync?: Incident["sync"];
  ai?: Omit<AiTriage, "confirmedBy" | "confirmedAt">;
}

export interface AddEvidenceInput {
  incidentId: string;
  type: EvidenceType;
  title: string;
  fileName: string;
  sizeBytes: number;
  durationSec?: number;
  source: Evidence["source"];
  classification?: EvidenceClassification;
  device?: string;
}

export interface SubmitComplaintInput {
  kind: ComplaintKind;
  citizenId?: string;
  anonymous: boolean;
  categoryId: string;
  title: string;
  description: string;
  stationId: string;
  location: Complaint["location"];
  occurredAt: number;
  contactPreference: Complaint["contactPreference"];
  documents: { name: string; kind: EvidenceType; sizeBytes: number }[];
  linkedIncidentId?: string;
}

export interface StartJourneyInput {
  citizenId: string;
  from: Journey["from"];
  destination: Journey["destination"];
  durationMin: number;
  checkIntervalMin: number;
  contactIds: string[];
}

export type CancelKind = "safe" | "false_alarm" | "other";

/* ───────────────────────── Store ───────────────────────── */

export interface DemoActions {
  resetDemo: () => void;

  createIncident: (input: CreateIncidentInput, actor: ActorRef) => Incident;
  acknowledgeIncident: (id: string, actor: ActorRef) => void;
  confirmTriage: (
    id: string,
    patch: { priority: IncidentPriority; categoryId: string },
    actor: ActorRef,
  ) => void;
  assignUnit: (id: string, unitId: string, actor: ActorRef) => void;
  unassignUnit: (
    id: string,
    unitId: string,
    actor: ActorRef,
    reason?: string,
  ) => void;
  respondToAssignment: (
    id: string,
    unitId: string,
    response: "accepted" | "rejected",
    actor: ActorRef,
    reason?: string,
  ) => void;
  startEnRoute: (id: string, unitId: string, actor: ActorRef) => void;
  markArrived: (id: string, unitId: string, actor: ActorRef) => void;
  setOfficerStage: (
    id: string,
    unitId: string,
    stage: OfficerStage,
    actor: ActorRef,
  ) => void;
  requestBackup: (id: string, actor: ActorRef, note?: string) => void;
  escalateIncident: (
    id: string,
    level: 1 | 2 | 3,
    reason: string,
    actor: ActorRef,
    ruleId?: string,
  ) => void;
  setEscalationStatus: (
    escalationId: string,
    status: "acknowledged" | "resolved",
    actor: ActorRef,
  ) => void;
  transferIncident: (id: string, stationId: string, actor: ActorRef) => void;
  resolveIncident: (id: string, resolution: string, actor: ActorRef) => void;
  closeIncident: (id: string, actor: ActorRef) => void;
  cancelIncident: (
    id: string,
    kind: CancelKind,
    reason: string,
    actor: ActorRef,
  ) => void;
  submitResponseReport: (
    id: string,
    unitId: string,
    report: string,
    actor: ActorRef,
  ) => void;
  addNote: (id: string, text: string, actor: ActorRef) => void;
  /** Demo helper: pushes an incident one step along the response chain. */
  advanceIncident: (id: string) => void;
  setIncidentEta: (id: string, etaAt: number) => void;
  syncQueued: () => void;

  sendMessage: (
    incidentId: string,
    channel: MessageChannel,
    text: string,
    actor: ActorRef,
    displayName?: string,
  ) => Message;
  startSession: (
    incidentId: string,
    type: SessionType,
    actor: ActorRef,
  ) => CommunicationSession;
  endSession: (sessionId: string, actor: ActorRef) => void;

  addEvidence: (input: AddEvidenceInput, actor: ActorRef) => Evidence;
  verifyEvidence: (evidenceId: string) => void;
  logEvidenceAccess: (
    evidenceId: string,
    action: EvidenceAccess["action"],
    actor: ActorRef,
    detail?: string,
  ) => void;

  submitComplaint: (input: SubmitComplaintInput, actor: ActorRef) => Complaint;
  updateComplaintStatus: (
    id: string,
    status: ComplaintStatus,
    note: string,
    actor: ActorRef,
  ) => void;
  addComplaintInfo: (
    id: string,
    note: string,
    documents: SubmitComplaintInput["documents"],
    actor: ActorRef,
  ) => void;

  startJourney: (input: StartJourneyInput) => Journey;
  journeyCheckIn: (id: string) => void;
  endJourney: (
    id: string,
    status: "completed" | "stopped" | "help_requested",
  ) => void;

  addContact: (contact: Omit<EmergencyContact, "id">) => void;
  updateContact: (id: string, patch: Partial<EmergencyContact>) => void;
  removeContact: (id: string) => void;

  pushNotification: (n: Omit<AppNotification, "id" | "at" | "readBy">) => void;
  markNotificationRead: (id: string, userId: string) => void;
  markAllNotificationsRead: (ids: string[], userId: string) => void;

  setUnitStatus: (unitId: string, status: UnitStatus, actor: ActorRef) => void;

  setRolePermission: (
    role: RoleKey,
    permission: Permission,
    enabled: boolean,
    actor: ActorRef,
  ) => void;
  upsertStaff: (user: StaffUser, actor: ActorRef) => void;
  setStaffStatus: (
    id: string,
    status: StaffUser["status"],
    actor: ActorRef,
  ) => void;
  updateCategory: (
    id: string,
    patch: Partial<IncidentCategory>,
    actor: ActorRef,
  ) => void;
  updateSla: (
    priority: IncidentPriority,
    patch: Partial<SlaPolicy>,
    actor: ActorRef,
  ) => void;
  upsertEscalationRule: (rule: EscalationRule, actor: ActorRef) => void;
  removeEscalationRule: (id: string, actor: ActorRef) => void;
  setIntegrationStatus: (
    id: string,
    status: Integration["status"],
    actor: ActorRef,
  ) => void;
  updateTemplate: (
    id: string,
    patch: Partial<NotificationTemplate>,
    actor: ActorRef,
  ) => void;
  recordAudit: (
    entry: Pick<AuditEvent, "action" | "category" | "detail"> & {
      incidentId?: string;
      entityId?: string;
    },
    actor: ActorRef,
  ) => void;
}

export type DemoStore = DemoData & DemoActions;

type Draft = DemoStore;

const findIncident = (s: Draft, id: string) =>
  s.incidents.find((i) => i.id === id);
const findUnit = (s: Draft, id: string) => s.units.find((u) => u.id === id);
const categoryLabel = (s: Draft, id: string) =>
  s.categories.find((c) => c.id === id)?.label ?? "Incident";
const isOpen = (i: Incident) =>
  !["resolved", "closed", "cancelled"].includes(i.status);

/** Produces the chain value for a new audit entry from the previous entry's value. */
export type AuditChain = (previous: string, event: Omit<AuditEvent, "chainHash">) => string;

// Browser demo: a look-alike value. The API server replaces this with a real SHA-256 chain.
let auditChain: AuditChain = (_previous, event) => fakeDigest(event.id).slice(0, 16);

export function setAuditChain(chain: AuditChain) {
  auditChain = chain;
}

function audit(
  s: Draft,
  actor: ActorRef | "system",
  action: string,
  category: AuditEvent["category"],
  detail: string,
  refs: { incidentId?: string; entityId?: string } = {},
) {
  const event: Omit<AuditEvent, "chainHash"> = {
    id: uid("au"),
    at: Date.now(),
    actorName: actor === "system" ? "System" : actor.name,
    actorRole: actor === "system" ? "system" : actor.role,
    action,
    category,
    detail,
    ...refs,
  };
  // Newest entries sit at the front, so the previous link is the current head.
  s.audit.unshift({ ...event, chainHash: auditChain(s.audit[0]?.chainHash ?? "genesis", event) });
  if (s.audit.length > 600) s.audit.length = 600;
}

function notify(s: Draft, n: Omit<AppNotification, "id" | "at" | "readBy">) {
  s.notifications.unshift({ ...n, id: uid("nt"), at: Date.now(), readBy: [] });
  if (s.notifications.length > 120) s.notifications.length = 120;
}

function timeline(
  incident: Incident,
  kind: TimelineKind,
  title: string,
  opts: { detail?: string; actor?: string; citizenVisible?: boolean } = {},
) {
  incident.timeline.push({
    id: uid("tl"),
    at: Date.now(),
    kind,
    title,
    detail: opts.detail,
    actor: opts.actor,
    citizenVisible: opts.citizenVisible ?? false,
  });
}

function systemMessage(
  s: Draft,
  incidentId: string,
  channel: MessageChannel,
  text: string,
) {
  s.messages.push({
    id: uid("msg"),
    incidentId,
    channel,
    senderRole: "system",
    senderName: "System",
    text,
    at: Date.now(),
  });
}

function freeUnits(s: Draft, incident: Incident) {
  for (const a of incident.assignments) {
    const unit = findUnit(s, a.unitId);
    if (unit && unit.currentIncidentId === incident.id) {
      // Where the unit really is: at the address if it arrived, part-way along if it was travelling.
      const at = unitPositionAt(unit, incident, Date.now());
      unit.status = "available";
      unit.currentIncidentId = null;
      unit.position = { lat: at.lat, lng: at.lng };
      unit.positionAt = Date.now();
      unit.routeFrom = undefined;
    }
  }
}

function endLiveSessions(s: Draft, incidentId: string) {
  for (const session of s.sessions) {
    if (session.incidentId === incidentId && session.status !== "ended") {
      session.status = "ended";
      session.endedAt = Date.now();
    }
  }
}

function mockTriage(
  s: Draft,
  input: CreateIncidentInput,
  priority: IncidentPriority,
): Omit<AiTriage, "confirmedBy" | "confirmedAt"> {
  const missing: string[] = [];
  if (input.description.trim().length < 40)
    missing.push("More detail about what is happening");
  if (input.peopleInDanger === undefined)
    missing.push("Whether anyone is currently in danger");
  if (input.source === "sos" || input.source === "silent_sos")
    missing.push("What the citizen can see around them");
  return {
    suggestedPriority: priority,
    suggestedCategoryId: input.categoryId,
    reason:
      input.source === "sos" || input.source === "silent_sos"
        ? "SOS raised by the citizen; treat as an immediate safety risk until an operator confirms otherwise."
        : input.peopleInDanger
          ? "Reporter states someone is currently in danger."
          : `Matches the ${categoryLabel(s, input.categoryId).toLowerCase()} pattern with no immediate danger stated.`,
    summary:
      input.description.trim() ||
      `${categoryLabel(s, input.categoryId)} reported at ${input.location.area}.`,
    missingInfo: missing,
  };
}

/** Plain-language summaries for the audit trail, so a reader never sees raw field names. */
function describeCategoryPatch(patch: Partial<IncidentCategory>): string {
  const parts: string[] = [];
  if (patch.enabled !== undefined) parts.push(patch.enabled ? "enabled" : "disabled");
  if (patch.citizenVisible !== undefined) parts.push(patch.citizenVisible ? "shown to citizens" : "hidden from citizens");
  if (patch.defaultPriority) parts.push(`default priority ${patch.defaultPriority}`);
  if (patch.agencies) parts.push(`agencies: ${patch.agencies.join(", ") || "none"}`);
  if (patch.label) parts.push("renamed");
  return parts.join(", ") || "updated";
}

function describeSlaPatch(patch: Partial<SlaPolicy>): string {
  const parts: string[] = [];
  if (patch.acknowledgeSec !== undefined) parts.push(`acknowledgement ${patch.acknowledgeSec} sec`);
  if (patch.dispatchSec !== undefined) parts.push(`dispatch ${patch.dispatchSec} sec`);
  if (patch.arrivalMin !== undefined) parts.push(`arrival ${patch.arrivalMin} min`);
  if (patch.resolutionMin !== undefined) parts.push(`resolution ${patch.resolutionMin} min`);
  return parts.join(", ") || "updated";
}

function nearestAvailableUnit(s: Draft, incident: Incident): Unit | undefined {
  return s.units
    .filter((u) => u.status === "available")
    .sort(
      (a, b) =>
        distanceKm(a.position, incident.location) -
        distanceKm(b.position, incident.location),
    )[0];
}

type SetState = (recipe: (draft: DemoStore) => unknown) => void;
type GetState = () => DemoStore;

/** An empty dataset: what a browser holds before the API has sent its first snapshot. */
export function emptyPlatformData(): DemoData {
  return {
    seededAt: 0,
    nextIncidentSeq: 0,
    nextEvidenceSeq: 0,
    nextComplaintSeq: 0,
    incidents: [],
    units: [],
    messages: [],
    evidence: [],
    complaints: [],
    journeys: [],
    contacts: [],
    sessions: [],
    notifications: [],
    escalations: [],
    audit: [],
    roles: [],
    staff: [],
    categories: [],
    escalationRules: [],
    slaPolicies: [],
    integrations: [],
    templates: [],
  };
}

/**
 * State creator for a Zustand store with the immer middleware
 * (`create()(immer(createPlatformState(data)))` or `createStore` from `zustand/vanilla`).
 */
export const createPlatformState =
  (initial: DemoData) =>
  (set: SetState, get: GetState): DemoStore => ({
      ...initial,

      resetDemo: () => set((s) => Object.assign(s, buildDemoData(Date.now()))),

      /* ── Incidents ── */

      createIncident: (input, actor) => {
        let created!: Incident;
        set((s) => {
          const category = s.categories.find((c) => c.id === input.categoryId);
          const priority = input.priority ?? category?.defaultPriority ?? "P3";
          const id = `${deployment.idPrefix}-2026-${s.nextIncidentSeq}`;
          s.nextIncidentSeq += 1;
          const now = Date.now();
          const isSos = input.source === "sos" || input.source === "silent_sos";
          const incident: Incident = {
            id,
            source: input.source,
            categoryId: input.categoryId,
            priority,
            status: "new",
            title: input.title ?? category?.label ?? "Incident",
            description: input.description,
            location: input.location,
            citizenId: input.citizenId,
            reporterName: input.reporterName,
            reporterPhoneMasked: input.anonymous
              ? undefined
              : input.reporterPhoneMasked,
            anonymous: Boolean(input.anonymous),
            peopleInDanger: input.peopleInDanger,
            createdAt: now,
            assignments: [],
            backupRequested: false,
            escalationLevel: 0,
            timeline: [],
            notes: [],
            evidenceIds: [],
            ai: input.ai ?? mockTriage(s, input, priority),
            handoff: { reportStatus: "not_started" },
            auto: input.auto,
            sync: input.sync ?? "synced",
            silent: input.silent,
          };
          timeline(
            incident,
            "created",
            input.source === "silent_sos"
              ? "Silent SOS created"
              : input.source === "sos"
                ? "SOS created"
                : input.source === "call"
                  ? "Emergency call logged"
                  : input.source === "tip"
                    ? "Confidential tip received"
                    : input.source === "journey"
                      ? "Journey safety alert"
                      : "Report received",
            {
              detail: isSos
                ? "Location attached from the citizen's device"
                : undefined,
              actor: input.reporterName,
              citizenVisible: true,
            },
          );
          s.incidents.unshift(incident);
          if (incident.sync === "synced") {
            notify(s, {
              kind: priority === "P1" ? "critical_incident" : "incident",
              title:
                priority === "P1"
                  ? "Critical incident received"
                  : "New incident",
              body: `${incident.title} · ${incident.location.area}`,
              audience: STAFF_AUDIENCE,
              incidentId: id,
              href: `/control/incidents?id=${id}`,
              tone:
                priority === "P1"
                  ? "critical"
                  : priority === "P2"
                    ? "high"
                    : "info",
            });
          }
          audit(
            s,
            input.anonymous ? "system" : actor,
            incident.timeline[0].title,
            "incident",
            `${incident.title} · ${incident.location.area}`,
            { incidentId: id },
          );
          created = incident;
        });
        return get().incidents.find((i) => i.id === created.id) ?? created;
      },

      acknowledgeIncident: (id, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          if (!incident || incident.status !== "new") return;
          incident.status = "acknowledged";
          incident.acknowledgedAt = Date.now();
          incident.operatorId = actor.id;
          incident.operatorName = actor.name;
          timeline(incident, "acknowledged", "Control room acknowledged", {
            detail: `${actor.name} opened the incident`,
            actor: actor.name,
            citizenVisible: true,
          });
          if (incident.citizenId) {
            systemMessage(
              s,
              id,
              "citizen",
              `Control room connected. ${actor.name.split(" ")[0]} is with you.`,
            );
          }
          audit(
            s,
            actor,
            "Incident acknowledged",
            "incident",
            `${actor.name} opened ${id}`,
            { incidentId: id },
          );
        }),

      confirmTriage: (id, patch, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          if (!incident) return;
          const changedCategory = incident.categoryId !== patch.categoryId;
          incident.priority = patch.priority;
          incident.categoryId = patch.categoryId;
          if (changedCategory)
            incident.title = categoryLabel(s, patch.categoryId);
          if (incident.ai) {
            incident.ai.confirmedBy = actor;
            incident.ai.confirmedAt = Date.now();
          }
          timeline(
            incident,
            "triage",
            `Priority confirmed as ${patch.priority}`,
            {
              detail: changedCategory
                ? `Category set to ${incident.title}`
                : "Operator reviewed the assisted triage suggestion",
              actor: actor.name,
            },
          );
          audit(
            s,
            actor,
            "Triage confirmed",
            "incident",
            `${patch.priority} ${PRIORITY_META[patch.priority].label} · ${incident.title}`,
            { incidentId: id },
          );
        }),

      assignUnit: (id, unitId, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          const unit = findUnit(s, unitId);
          if (!incident || !unit || !isOpen(incident)) return;
          if (
            incident.assignments.some(
              (a) => a.unitId === unitId && a.response !== "rejected",
            )
          )
            return;
          const now = Date.now();
          if (incident.status === "new") {
            incident.status = "acknowledged";
            incident.acknowledgedAt = now;
            incident.operatorId = actor.id;
            incident.operatorName = actor.name;
            timeline(incident, "acknowledged", "Control room acknowledged", {
              detail: `${actor.name} opened the incident`,
              actor: actor.name,
              citizenVisible: true,
            });
          }
          const hasPrimary = incident.assignments.some(
            (a) => a.role === "primary" && a.response !== "rejected",
          );
          incident.assignments.push({
            id: uid("as"),
            incidentId: id,
            unitId,
            assignedBy: actor,
            assignedAt: now,
            response: "pending",
            stage: "assigned",
            role: hasPrimary ? "backup" : "primary",
            distanceKm: Number(
              Math.max(0.4, roadKm(unit.position, incident.location)).toFixed(
                1,
              ),
            ),
            etaMin: etaMinutesBetween(unit.position, incident.location),
          });
          if (incident.status === "acknowledged") {
            incident.status = "assigned";
            incident.assignedAt = now;
          }
          unit.status = "assigned";
          unit.currentIncidentId = id;
          timeline(
            incident,
            "assigned",
            `Unit ${unit.callSign} assigned${hasPrimary ? " as backup" : ""}`,
            { actor: actor.name, citizenVisible: true },
          );
          notify(s, {
            kind: "assignment",
            title: "New assignment",
            body: `${PRIORITY_META[incident.priority].label} · ${incident.title} · ${incident.location.area}`,
            audience: ["officer"],
            unitId,
            incidentId: id,
            href: "/officer/assignment",
            tone: incident.priority === "P1" ? "critical" : "high",
          });
          notify(s, {
            kind: "assignment",
            title: `Unit ${unit.callSign} assigned`,
            body: `${id} · waiting for the officer to accept`,
            audience: STAFF_AUDIENCE,
            incidentId: id,
            href: `/control/incidents?id=${id}`,
            tone: "info",
          });
          if (incident.citizenId) {
            notify(s, {
              kind: "sos",
              title: `Unit ${unit.callSign} has been assigned`,
              body: "Stay where you are if it is safe. You can chat with the control room at any time.",
              audience: ["citizen"],
              citizenId: incident.citizenId,
              incidentId: id,
              href: "/citizen/sos",
              tone: "info",
            });
          }
          audit(
            s,
            actor,
            "Unit assigned",
            "dispatch",
            `${unit.callSign} → ${id}`,
            { incidentId: id, entityId: unitId },
          );
        }),

      unassignUnit: (id, unitId, actor, reason) =>
        set((s) => {
          const incident = findIncident(s, id);
          const unit = findUnit(s, unitId);
          if (!incident || !unit) return;
          incident.assignments = incident.assignments.filter(
            (a) => a.unitId !== unitId,
          );
          if (unit.currentIncidentId === id) {
            unit.status = "available";
            unit.currentIncidentId = null;
            unit.routeFrom = undefined;
          }
          const remaining = incident.assignments.filter(
            (a) => a.response !== "rejected",
          );
          if (remaining.length === 0 && isOpen(incident)) {
            incident.status = "acknowledged";
            incident.etaAt = undefined;
            incident.enRouteAt = undefined;
            incident.arrivedAt = undefined;
          } else if (
            remaining.length > 0 &&
            !remaining.some((a) => a.role === "primary")
          ) {
            remaining[0].role = "primary";
          }
          timeline(incident, "assigned", `Unit ${unit.callSign} released`, {
            detail: reason,
            actor: actor.name,
          });
          audit(
            s,
            actor,
            "Unit released",
            "dispatch",
            `${unit.callSign} released from ${id}${reason ? ` · ${reason}` : ""}`,
            { incidentId: id, entityId: unitId },
          );
        }),

      respondToAssignment: (id, unitId, response, actor, reason) =>
        set((s) => {
          const incident = findIncident(s, id);
          const unit = findUnit(s, unitId);
          const assignment = incident?.assignments.find(
            (a) => a.unitId === unitId && a.response === "pending",
          );
          if (!incident || !unit || !assignment) return;
          assignment.response = response;
          assignment.respondedAt = Date.now();
          if (response === "accepted") {
            assignment.stage = "accepted";
            timeline(incident, "accepted", "Officer accepted", {
              detail: unit.callSign,
              actor: unit.callSign,
            });
            audit(
              s,
              actor,
              "Assignment accepted",
              "dispatch",
              `${unit.callSign} accepted ${id}`,
              { incidentId: id, entityId: unitId },
            );
            return;
          }
          assignment.rejectReason = reason;
          unit.status = "available";
          unit.currentIncidentId = null;
          const live = incident.assignments.filter(
            (a) => a.response !== "rejected",
          );
          if (live.length === 0) {
            incident.status = "acknowledged";
            incident.assignedAt = undefined;
          }
          timeline(incident, "rejected", `Unit ${unit.callSign} declined`, {
            detail: reason,
            actor: unit.callSign,
          });
          notify(s, {
            kind: "assignment",
            title: `Unit ${unit.callSign} declined the assignment`,
            body: `${id}${reason ? ` · ${reason}` : ""} · assign another unit`,
            audience: STAFF_AUDIENCE,
            incidentId: id,
            href: `/control/incidents?id=${id}`,
            tone: "high",
          });
          audit(
            s,
            actor,
            "Assignment declined",
            "dispatch",
            `${unit.callSign} declined ${id}${reason ? ` · ${reason}` : ""}`,
            { incidentId: id, entityId: unitId },
          );
        }),

      startEnRoute: (id, unitId, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          const unit = findUnit(s, unitId);
          const assignment = incident?.assignments.find(
            (a) => a.unitId === unitId && a.response === "accepted",
          );
          if (!incident || !unit || !assignment || !isOpen(incident)) return;
          const now = Date.now();
          assignment.stage = "en_route";
          unit.status = "en_route";
          unit.routeFrom = { ...unit.position };
          if (
            assignment.role === "primary" &&
            (incident.status === "assigned" ||
              incident.status === "acknowledged")
          ) {
            incident.status = "en_route";
            incident.enRouteAt = now;
            incident.etaAt = now + assignment.etaMin * MIN;
          }
          timeline(incident, "en_route", "Unit en route", {
            detail: unit.callSign,
            actor: unit.callSign,
            citizenVisible: true,
          });
          s.messages.push({
            id: uid("msg"),
            incidentId: id,
            channel: "internal",
            senderRole: "officer",
            senderName: OFFICER_NAME_BY_UNIT[unitId] ?? actor.name,
            text: `Unit ${unit.callSign.split("-").pop()} en route.`,
            at: now,
          });
          if (incident.citizenId) {
            notify(s, {
              kind: "sos",
              title: "Responder is on the way",
              body: `Unit ${unit.callSign} · about ${assignment.etaMin} min`,
              audience: ["citizen"],
              citizenId: incident.citizenId,
              incidentId: id,
              href: "/citizen/sos",
              tone: "info",
            });
          }
          audit(
            s,
            actor,
            "Unit en route",
            "dispatch",
            `${unit.callSign} en route to ${id}`,
            { incidentId: id, entityId: unitId },
          );
        }),

      markArrived: (id, unitId, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          const unit = findUnit(s, unitId);
          const assignment = incident?.assignments.find(
            (a) => a.unitId === unitId && a.response === "accepted",
          );
          if (!incident || !unit || !assignment || !isOpen(incident)) return;
          const now = Date.now();
          assignment.stage = "on_scene";
          unit.status = "on_scene";
          unit.position = {
            lat: incident.location.lat,
            lng: incident.location.lng,
          };
          unit.positionAt = now;
          unit.routeFrom = undefined;
          if (incident.status !== "on_scene") {
            incident.status = "on_scene";
            incident.arrivedAt = now;
            incident.etaAt = undefined;
          }
          timeline(incident, "arrived", "Officer arrived", {
            detail: unit.callSign,
            actor: unit.callSign,
            citizenVisible: true,
          });
          if (incident.citizenId) {
            notify(s, {
              kind: "sos",
              title: "Responder has arrived",
              body: `Unit ${unit.callSign} is at your location.`,
              audience: ["citizen"],
              citizenId: incident.citizenId,
              incidentId: id,
              href: "/citizen/sos",
              tone: "success",
            });
          }
          audit(
            s,
            actor,
            "Unit arrived",
            "dispatch",
            `${unit.callSign} on scene at ${id}`,
            { incidentId: id, entityId: unitId },
          );
        }),

      setOfficerStage: (id, unitId, stage, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          const unit = findUnit(s, unitId);
          const assignment = incident?.assignments.find(
            (a) => a.unitId === unitId,
          );
          if (!incident || !unit || !assignment) return;
          assignment.stage = stage;
          if (stage === "situation_controlled") {
            timeline(incident, "stage", "Situation controlled", {
              detail: unit.callSign,
              actor: unit.callSign,
              citizenVisible: true,
            });
          } else if (stage === "assistance_requested") {
            timeline(incident, "stage", "Assistance requested on scene", {
              detail: unit.callSign,
              actor: unit.callSign,
            });
          } else {
            timeline(
              incident,
              "stage",
              `Officer status: ${stage.replace(/_/g, " ")}`,
              { detail: unit.callSign, actor: unit.callSign },
            );
          }
          audit(
            s,
            actor,
            "Officer status updated",
            "dispatch",
            `${unit.callSign} · ${stage.replace(/_/g, " ")}`,
            { incidentId: id, entityId: unitId },
          );
        }),

      requestBackup: (id, actor, note) =>
        set((s) => {
          const incident = findIncident(s, id);
          if (!incident || !isOpen(incident)) return;
          incident.backupRequested = true;
          timeline(incident, "backup", "Backup requested", {
            detail: note,
            actor: actor.name,
          });
          notify(s, {
            kind: "backup",
            title: "Backup requested",
            body: `${incident.title} · ${incident.location.area}`,
            audience: STAFF_AUDIENCE,
            incidentId: id,
            href: `/control/incidents?id=${id}`,
            tone: "high",
          });
          audit(
            s,
            actor,
            "Backup requested",
            "dispatch",
            `${id}${note ? ` · ${note}` : ""}`,
            { incidentId: id },
          );
        }),

      escalateIncident: (id, level, reason, actor, ruleId) =>
        set((s) => {
          const incident = findIncident(s, id);
          if (!incident) return;
          incident.escalationLevel = Math.max(
            incident.escalationLevel,
            level,
          ) as Incident["escalationLevel"];
          s.escalations.unshift({
            id: uid("esc"),
            incidentId: id,
            level,
            reason,
            ruleId,
            raisedBy: actor.name,
            raisedAt: Date.now(),
            status: "open",
          });
          timeline(
            incident,
            "escalated",
            `Escalated to ${ESCALATION_LEVEL_LABEL[level].toLowerCase()}`,
            { detail: reason, actor: actor.name },
          );
          notify(s, {
            kind: "escalation",
            title: "Incident escalated",
            body: `${incident.title} · ${incident.location.area} · ${ESCALATION_LEVEL_LABEL[level]}`,
            audience: STAFF_AUDIENCE,
            incidentId: id,
            href: "/control/escalations",
            tone: "critical",
          });
          audit(
            s,
            actor,
            "Incident escalated",
            "incident",
            `${id} → ${ESCALATION_LEVEL_LABEL[level]} · ${reason}`,
            { incidentId: id },
          );
        }),

      setEscalationStatus: (escalationId, status, actor) =>
        set((s) => {
          const escalation = s.escalations.find((e) => e.id === escalationId);
          if (!escalation) return;
          escalation.status = status;
          escalation.acknowledgedBy = actor.name;
          const incident = findIncident(s, escalation.incidentId);
          if (incident) {
            timeline(
              incident,
              "escalated",
              status === "acknowledged"
                ? "Escalation acknowledged"
                : "Escalation resolved",
              { actor: actor.name },
            );
          }
          audit(
            s,
            actor,
            status === "acknowledged"
              ? "Escalation acknowledged"
              : "Escalation resolved",
            "incident",
            escalation.incidentId,
            { incidentId: escalation.incidentId },
          );
        }),

      transferIncident: (id, stationId, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          const station = STATIONS.find((st) => st.id === stationId);
          if (!incident || !station) return;
          incident.location.stationId = stationId;
          timeline(incident, "transferred", `Transferred to ${station.name}`, {
            actor: actor.name,
          });
          audit(
            s,
            actor,
            "Incident transferred",
            "incident",
            `${id} → ${station.name}`,
            { incidentId: id },
          );
        }),

      resolveIncident: (id, resolution, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          if (!incident || !isOpen(incident)) return;
          const now = Date.now();
          incident.status = "resolved";
          incident.resolvedAt = now;
          incident.resolution = resolution;
          incident.etaAt = undefined;
          incident.auto = false;
          incident.handoff = {
            reportStatus: "draft",
            reportDraft: resolution,
            evidencePackageRef: `PKG-${id.split("-").pop()}`,
          };
          freeUnits(s, incident);
          for (const a of incident.assignments)
            if (a.response === "accepted") a.stage = "report_pending";
          endLiveSessions(s, id);
          timeline(incident, "resolved", "Incident resolved", {
            detail: resolution,
            actor: actor.name,
            citizenVisible: true,
          });
          timeline(incident, "handoff", "Preliminary response report started", {
            detail:
              "Awaiting the responding officer's report and supervisor review",
          });
          for (const e of s.escalations)
            if (e.incidentId === id && e.status !== "resolved")
              e.status = "resolved";
          if (incident.citizenId) {
            notify(s, {
              kind: "sos",
              title: "Your emergency has been marked resolved",
              body: "You can view the summary in Activity.",
              audience: ["citizen"],
              citizenId: incident.citizenId,
              incidentId: id,
              href: "/citizen/activity",
              tone: "success",
            });
          }
          audit(
            s,
            actor,
            "Incident resolved",
            "incident",
            `${id} · ${resolution}`,
            { incidentId: id },
          );
        }),

      closeIncident: (id, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          if (!incident || incident.status !== "resolved") return;
          incident.status = "closed";
          incident.handoff.reportStatus = "reviewed";
          incident.handoff.reviewedBy = actor.name;
          timeline(incident, "handoff", "Closed after supervisor review", {
            actor: actor.name,
            citizenVisible: true,
          });
          audit(
            s,
            actor,
            "Incident closed",
            "incident",
            `${id} reviewed and closed`,
            { incidentId: id },
          );
        }),

      cancelIncident: (id, kind, reason, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          if (!incident || !isOpen(incident)) return;
          const now = Date.now();
          incident.auto = false;
          incident.etaAt = undefined;
          freeUnits(s, incident);
          endLiveSessions(s, id);
          if (kind === "safe") {
            incident.status = "resolved";
            incident.resolvedAt = now;
            incident.resolution =
              `Citizen confirmed they are safe. ${reason}`.trim();
            incident.handoff = {
              reportStatus: "draft",
              reportDraft: incident.resolution,
            };
            for (const a of incident.assignments) if (a.response === "accepted") a.stage = "report_pending";
            timeline(incident, "resolved", "Citizen confirmed they are safe", {
              detail: reason || undefined,
              actor: actor.name,
              citizenVisible: true,
            });
          } else {
            incident.status = "cancelled";
            incident.cancelReason =
              reason ||
              (kind === "false_alarm"
                ? "Raised by mistake"
                : "Cancelled by citizen");
            timeline(incident, "cancelled", "Cancelled by citizen", {
              detail: incident.cancelReason,
              actor: actor.name,
              citizenVisible: true,
            });
          }
          notify(s, {
            kind: "incident",
            title:
              kind === "safe"
                ? "Citizen marked themselves safe"
                : "SOS cancelled by citizen",
            body: `${id} · ${incident.location.area}${reason ? ` · ${reason}` : ""}`,
            audience: STAFF_AUDIENCE,
            incidentId: id,
            href: `/control/incidents?id=${id}`,
            tone: "info",
          });
          audit(
            s,
            actor,
            kind === "safe" ? "Citizen confirmed safe" : "SOS cancelled",
            "incident",
            `${id}${reason ? ` · ${reason}` : ""}`,
            { incidentId: id },
          );
        }),

      submitResponseReport: (id, unitId, report, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          if (!incident) return;
          incident.handoff.reportStatus = "submitted";
          incident.handoff.reportDraft = report;
          incident.handoff.evidencePackageRef ??= `PKG-${id.split("-").pop()}`;
          const assignment = incident.assignments.find(
            (a) => a.unitId === unitId,
          );
          if (assignment) assignment.stage = "completed";
          timeline(
            incident,
            "handoff",
            "Preliminary response report submitted",
            { detail: "Sent for supervisor review", actor: actor.name },
          );
          audit(s, actor, "Response report submitted", "incident", id, {
            incidentId: id,
          });
        }),

      addNote: (id, text, actor) =>
        set((s) => {
          const incident = findIncident(s, id);
          if (!incident || !text.trim()) return;
          incident.notes.push({
            id: uid("nt"),
            at: Date.now(),
            author: actor,
            text: text.trim(),
          });
          timeline(incident, "note", "Internal note added", {
            actor: actor.name,
          });
          audit(s, actor, "Internal note added", "incident", id, {
            incidentId: id,
          });
        }),

      advanceIncident: (id) => {
        const incident = get().incidents.find((i) => i.id === id);
        if (!incident || !isOpen(incident) || incident.sync !== "synced")
          return;
        const actions = get();
        const primary =
          incident.assignments.find(
            (a) => a.role === "primary" && a.response !== "rejected",
          ) ?? incident.assignments.find((a) => a.response !== "rejected");
        if (incident.status === "new") {
          actions.acknowledgeIncident(id, OPERATOR);
        } else if (incident.status === "acknowledged") {
          if (incident.ai && !incident.ai.confirmedBy) {
            actions.confirmTriage(
              id,
              { priority: incident.priority, categoryId: incident.categoryId },
              OPERATOR,
            );
          }
          const unit = nearestAvailableUnit(get() as Draft, incident);
          if (unit) actions.assignUnit(id, unit.id, OPERATOR);
        } else if (incident.status === "assigned" && primary) {
          const officer: ActorRef = {
            id: primary.unitId,
            name: OFFICER_NAME_BY_UNIT[primary.unitId] ?? "Officer",
            role: "officer",
          };
          if (primary.response === "pending")
            actions.respondToAssignment(
              id,
              primary.unitId,
              "accepted",
              officer,
            );
          actions.startEnRoute(id, primary.unitId, officer);
        } else if (incident.status === "en_route" && primary) {
          const officer: ActorRef = {
            id: primary.unitId,
            name: OFFICER_NAME_BY_UNIT[primary.unitId] ?? "Officer",
            role: "officer",
          };
          actions.markArrived(id, primary.unitId, officer);
        }
      },

      setIncidentEta: (id, etaAt) =>
        set((s) => {
          const incident = findIncident(s, id);
          if (incident && incident.status === "en_route")
            incident.etaAt = etaAt;
        }),

      syncQueued: () =>
        set((s) => {
          for (const incident of s.incidents) {
            if (incident.sync !== "queued") continue;
            incident.sync = "synced";
            timeline(incident, "system", "Delivered to the control room", {
              detail: "Sent when the connection returned",
              citizenVisible: true,
            });
            notify(s, {
              kind:
                incident.priority === "P1" ? "critical_incident" : "incident",
              title:
                incident.priority === "P1"
                  ? "Critical incident received"
                  : "New incident",
              body: `${incident.title} · ${incident.location.area} · delayed by connectivity`,
              audience: STAFF_AUDIENCE,
              incidentId: incident.id,
              href: `/control/incidents?id=${incident.id}`,
              tone: incident.priority === "P1" ? "critical" : "high",
            });
          }
        }),

      /* ── Communication ── */

      sendMessage: (incidentId, channel, text, actor, displayName) => {
        const message: Message = {
          id: uid("msg"),
          incidentId,
          channel,
          senderRole: actor.role,
          senderName: displayName ?? actor.name,
          text: text.trim(),
          at: Date.now(),
        };
        set((s) => {
          s.messages.push(message);
          if (channel === "citizen" && actor.role !== "citizen") {
            const incident = findIncident(s, incidentId);
            if (incident?.citizenId) {
              notify(s, {
                kind: "sos",
                title: "New message from the control room",
                body: message.text,
                audience: ["citizen"],
                citizenId: incident.citizenId,
                incidentId,
                href: "/citizen/sos",
                tone: "info",
              });
            }
          }
        });
        return message;
      },

      startSession: (incidentId, type, actor) => {
        const session: CommunicationSession = {
          id: uid("cs"),
          incidentId,
          type,
          status: "live",
          startedBy: actor,
          startedAt: Date.now(),
          quality: "good",
          participants: [{ name: actor.name, role: actor.role }],
        };
        set((s) => {
          endLiveSessions(s, incidentId);
          s.sessions.unshift(session);
          const incident = findIncident(s, incidentId);
          if (incident) {
            timeline(
              incident,
              "communication",
              `Secure ${type} session started`,
              { actor: actor.name, citizenVisible: true },
            );
          }
          audit(
            s,
            actor,
            "Secure communication initiated",
            "communication",
            `${type} session · ${incidentId}`,
            { incidentId },
          );
        });
        return session;
      },

      endSession: (sessionId, actor) =>
        set((s) => {
          const session = s.sessions.find((x) => x.id === sessionId);
          if (!session || session.status === "ended") return;
          session.status = "ended";
          session.endedAt = Date.now();
          const incident = findIncident(s, session.incidentId);
          if (incident)
            timeline(
              incident,
              "communication",
              `Secure ${session.type} session ended`,
              { actor: actor.name, citizenVisible: true },
            );
          audit(
            s,
            actor,
            "Secure communication ended",
            "communication",
            `${session.type} session · ${session.incidentId}`,
            { incidentId: session.incidentId },
          );
        }),

      /* ── Evidence ── */

      addEvidence: (input, actor) => {
        let created!: Evidence;
        set((s) => {
          const id = `EV-2026-00${s.nextEvidenceSeq}`;
          s.nextEvidenceSeq += 1;
          const now = Date.now();
          const incident = findIncident(s, input.incidentId);
          const classification: EvidenceClassification =
            input.classification ??
            (incident?.priority === "P1" ? "sensitive" : "standard");
          const record: Evidence = {
            id,
            incidentId: input.incidentId,
            type: input.type,
            title: input.title,
            fileName: input.fileName,
            mime:
              input.type === "photo"
                ? "image/jpeg"
                : input.type === "video"
                  ? "video/mp4"
                  : input.type === "audio"
                    ? "audio/mp4"
                    : "application/pdf",
            sizeBytes: input.sizeBytes,
            durationSec: input.durationSec,
            source: input.source,
            uploadedByName: actor.name,
            uploadedByRole: actor.role,
            capturedAt: now - 20 * SEC,
            submittedAt: now,
            integrity: "pending",
            hash: fakeDigest(id),
            hashAlgorithm: "SHA-256 (demo)",
            classification,
            retention: retentionFor(classification),
            device: input.device,
            access: [
              {
                id: uid("xa"),
                at: now,
                actorName: actor.name,
                actorRole: actor.role,
                action: "uploaded",
                detail: input.device,
              },
              {
                id: uid("xa"),
                at: now,
                actorName: "Evidence service",
                actorRole: "system",
                action: "linked",
                detail: `Linked to ${input.incidentId}`,
              },
            ],
          };
          s.evidence.unshift(record);
          if (incident) {
            incident.evidenceIds.push(id);
            timeline(incident, "evidence", "Evidence received", {
              detail: `${id} · ${input.title}`,
              actor: actor.name,
              citizenVisible: actor.role === "citizen",
            });
          }
          notify(s, {
            kind: "evidence",
            title: "New evidence received",
            body: `${input.title} · ${input.incidentId}`,
            audience: STAFF_AUDIENCE,
            incidentId: input.incidentId,
            href: `/control/evidence?id=${id}`,
            tone: "info",
          });
          audit(
            s,
            actor,
            "Evidence uploaded",
            "evidence",
            `${id} · ${input.title}`,
            { incidentId: input.incidentId, entityId: id },
          );
          created = record;
        });
        return created;
      },

      verifyEvidence: (evidenceId) =>
        set((s) => {
          const item = s.evidence.find((e) => e.id === evidenceId);
          if (!item || item.integrity !== "pending") return;
          item.integrity = "verified";
          item.access.push({
            id: uid("xa"),
            at: Date.now(),
            actorName: "Evidence service",
            actorRole: "system",
            action: "integrity_recorded",
            detail: "Digest recorded at ingestion",
          });
        }),

      logEvidenceAccess: (evidenceId, action, actor, detail) =>
        set((s) => {
          const item = s.evidence.find((e) => e.id === evidenceId);
          if (!item) return;
          const last = item.access[item.access.length - 1];
          // Opening the same item repeatedly within a minute is one view, not twenty log lines.
          if (
            action === "viewed" &&
            last?.action === "viewed" &&
            last.actorName === actor.name &&
            Date.now() - last.at < MIN
          )
            return;
          item.access.push({
            id: uid("xa"),
            at: Date.now(),
            actorName: actor.name,
            actorRole: actor.role,
            action,
            detail,
          });
          const label =
            action === "viewed"
              ? "Evidence viewed"
              : action === "export_requested"
                ? "Evidence export requested"
                : action === "access_denied"
                  ? "Restricted evidence access denied"
                  : "Evidence access";
          audit(
            s,
            actor,
            label,
            action === "access_denied" ? "access" : "evidence",
            `${item.id} · ${item.title}`,
            { incidentId: item.incidentId, entityId: item.id },
          );
        }),

      /* ── Complaints ── */

      submitComplaint: (input, actor) => {
        let created!: Complaint;
        set((s) => {
          const id = `CMP-${deployment.idPrefix.split("-")[1]}-2026-0${s.nextComplaintSeq}`;
          s.nextComplaintSeq += 1;
          const now = Date.now();
          const station = STATIONS.find((st) => st.id === input.stationId);
          const complaint: Complaint = {
            id,
            kind: input.kind,
            citizenId: input.anonymous ? undefined : input.citizenId,
            anonymous: input.anonymous,
            categoryId: input.categoryId,
            title: input.title,
            description: input.description,
            stationId: input.stationId,
            department:
              input.kind === "confidential_tip"
                ? "Information desk"
                : s.categories.find((c) => c.id === input.categoryId)?.group ===
                    "cyber"
                  ? "Cybercrime desk"
                  : "Station desk",
            location: input.location,
            occurredAt: input.occurredAt,
            submittedAt: now,
            status: "submitted",
            contactPreference: input.contactPreference,
            updates: [
              {
                id: uid("cu"),
                at: now,
                status: "submitted",
                note:
                  input.kind === "confidential_tip"
                    ? "Confidential tip received. No identity stored."
                    : "Submitted from the app.",
                by: input.anonymous ? "Confidential source" : actor.name,
              },
            ],
            documents: input.documents.map((d) => ({
              id: uid("cd"),
              name: d.name,
              kind: d.kind,
              sizeBytes: d.sizeBytes,
              addedAt: now,
            })),
            linkedIncidentId: input.linkedIncidentId,
          };
          s.complaints.unshift(complaint);
          notify(s, {
            kind: "complaint",
            title:
              input.kind === "confidential_tip"
                ? "Confidential tip received"
                : "New complaint submitted",
            body: `${id} · ${station?.name ?? "Station"}`,
            audience: ["operator", "supervisor"],
            href: `/control/complaints?id=${id}`,
            tone: "info",
          });
          audit(
            s,
            input.anonymous ? "system" : actor,
            input.kind === "confidential_tip"
              ? "Confidential tip received"
              : "Complaint submitted",
            "complaint",
            `${id} · ${input.title}`,
            { entityId: id },
          );
          created = complaint;
        });
        return created;
      },

      updateComplaintStatus: (id, status, note, actor) =>
        set((s) => {
          const complaint = s.complaints.find((c) => c.id === id);
          if (!complaint) return;
          complaint.status = status;
          if (status === "assigned" && !complaint.assignedAuthority)
            complaint.assignedAuthority = actor.name;
          complaint.updates.push({
            id: uid("cu"),
            at: Date.now(),
            status,
            note,
            by: actor.name,
          });
          if (complaint.citizenId) {
            notify(s, {
              kind: "complaint",
              title: "Complaint updated",
              body: `${id} · ${note}`,
              audience: ["citizen"],
              citizenId: complaint.citizenId,
              href: `/citizen/complaints?id=${id}`,
              tone: status === "info_required" ? "high" : "info",
            });
          }
          audit(
            s,
            actor,
            "Complaint updated",
            "complaint",
            `${id} → ${status.replace(/_/g, " ")}`,
            { entityId: id },
          );
        }),

      addComplaintInfo: (id, note, documents, actor) =>
        set((s) => {
          const complaint = s.complaints.find((c) => c.id === id);
          if (!complaint) return;
          const now = Date.now();
          for (const d of documents)
            complaint.documents.push({
              id: uid("cd"),
              name: d.name,
              kind: d.kind,
              sizeBytes: d.sizeBytes,
              addedAt: now,
            });
          const next: ComplaintStatus =
            complaint.status === "info_required"
              ? "under_review"
              : complaint.status;
          complaint.status = next;
          complaint.updates.push({
            id: uid("cu"),
            at: now,
            status: next,
            note: note || "Additional information added.",
            by: actor.name,
          });
          notify(s, {
            kind: "complaint",
            title: "Citizen added information",
            body: id,
            audience: ["operator", "supervisor"],
            href: `/control/complaints?id=${id}`,
            tone: "info",
          });
          audit(s, actor, "Complaint information added", "complaint", id, {
            entityId: id,
          });
        }),

      /* ── Journey safety ── */

      startJourney: (input) => {
        const now = Date.now();
        const journey: Journey = {
          id: uid("jr"),
          citizenId: input.citizenId,
          from: input.from,
          destination: input.destination,
          startedAt: now,
          expectedArrivalAt: now + input.durationMin * MIN,
          checkIntervalMin: input.checkIntervalMin,
          lastCheckInAt: now,
          contactIds: input.contactIds,
          status: "active",
        };
        set((s) => {
          for (const j of s.journeys) {
            if (j.citizenId === input.citizenId && j.status === "active") {
              j.status = "stopped";
              j.endedAt = now;
            }
          }
          s.journeys.unshift(journey);
        });
        return journey;
      },

      journeyCheckIn: (id) =>
        set((s) => {
          const journey = s.journeys.find((j) => j.id === id);
          if (journey && journey.status === "active")
            journey.lastCheckInAt = Date.now();
        }),

      endJourney: (id, status) =>
        set((s) => {
          const journey = s.journeys.find((j) => j.id === id);
          if (!journey) return;
          journey.status = status;
          if (status !== "help_requested") journey.endedAt = Date.now();
          if (status !== "help_requested") {
            notify(s, {
              kind: "journey",
              title:
                status === "completed"
                  ? "Journey completed"
                  : "Journey sharing stopped",
              body:
                status === "completed"
                  ? `You arrived at ${journey.destination.label}. Sharing has stopped.`
                  : "Your trusted contacts no longer see your journey.",
              audience: ["citizen"],
              citizenId: journey.citizenId,
              href: "/citizen/activity",
              tone: "success",
            });
          }
        }),

      /* ── Trusted contacts ── */

      addContact: (contact) =>
        set((s) => {
          s.contacts.push({ ...contact, id: uid("ec") });
        }),
      updateContact: (id, patch) =>
        set((s) => {
          const contact = s.contacts.find((c) => c.id === id);
          if (contact) Object.assign(contact, patch);
        }),
      removeContact: (id) =>
        set((s) => {
          s.contacts = s.contacts.filter((c) => c.id !== id);
        }),

      /* ── Notifications ── */

      pushNotification: (n) => set((s) => notify(s, n)),
      markNotificationRead: (id, userId) =>
        set((s) => {
          const n = s.notifications.find((x) => x.id === id);
          if (n && !n.readBy.includes(userId)) n.readBy.push(userId);
        }),
      markAllNotificationsRead: (ids, userId) =>
        set((s) => {
          const wanted = new Set(ids);
          for (const n of s.notifications)
            if (wanted.has(n.id) && !n.readBy.includes(userId))
              n.readBy.push(userId);
        }),

      /* ── Units ── */

      setUnitStatus: (unitId, status, actor) =>
        set((s) => {
          const unit = findUnit(s, unitId);
          if (!unit) return;
          unit.status = status;
          if (
            status === "available" ||
            status === "unavailable" ||
            status === "off_duty"
          ) {
            unit.currentIncidentId = null;
            unit.routeFrom = undefined;
          }
          audit(
            s,
            actor,
            "Unit status changed",
            "dispatch",
            `${unit.callSign} → ${status.replace(/_/g, " ")}`,
            { entityId: unitId },
          );
        }),

      /* ── Administration ── */

      setRolePermission: (role, permission, enabled, actor) =>
        set((s) => {
          const target = s.roles.find((r) => r.key === role);
          if (!target) return;
          const has = target.permissions.includes(permission);
          if (enabled && !has) target.permissions.push(permission);
          if (!enabled && has)
            target.permissions = target.permissions.filter(
              (x) => x !== permission,
            );
          audit(
            s,
            actor,
            "Role permissions changed",
            "admin",
            `${target.name}: ${enabled ? "added" : "removed"} ${permission}`,
          );
        }),

      upsertStaff: (user, actor) =>
        set((s) => {
          const index = s.staff.findIndex((u) => u.id === user.id);
          if (index >= 0) s.staff[index] = user;
          else s.staff.unshift(user);
          audit(
            s,
            actor,
            index >= 0 ? "User updated" : "User invited",
            "admin",
            `${user.name} · ${user.role}`,
            { entityId: user.id },
          );
        }),

      setStaffStatus: (id, status, actor) =>
        set((s) => {
          const user = s.staff.find((u) => u.id === id);
          if (!user) return;
          user.status = status;
          audit(
            s,
            actor,
            status === "suspended" ? "User suspended" : "User activated",
            "admin",
            user.name,
            { entityId: id },
          );
        }),

      updateCategory: (id, patch, actor) =>
        set((s) => {
          const category = s.categories.find((c) => c.id === id);
          if (!category) return;
          Object.assign(category, patch);
          audit(
            s,
            actor,
            "Category changed",
            "admin",
            `${category.label} · ${describeCategoryPatch(patch)}`,
            { entityId: id },
          );
        }),

      updateSla: (priority, patch, actor) =>
        set((s) => {
          const policy = s.slaPolicies.find((p) => p.priority === priority);
          if (!policy) return;
          Object.assign(policy, patch);
          audit(
            s,
            actor,
            "Response target changed",
            "admin",
            `${priority} · ${describeSlaPatch(patch)}`,
          );
        }),

      upsertEscalationRule: (rule, actor) =>
        set((s) => {
          const index = s.escalationRules.findIndex((r) => r.id === rule.id);
          if (index >= 0) s.escalationRules[index] = rule;
          else s.escalationRules.push(rule);
          audit(
            s,
            actor,
            "Escalation policy changed",
            "admin",
            `${rule.priority} · ${rule.trigger.replace(/_/g, " ")} · ${rule.thresholdSec} sec`,
            { entityId: rule.id },
          );
        }),

      removeEscalationRule: (id, actor) =>
        set((s) => {
          const rule = s.escalationRules.find((r) => r.id === id);
          s.escalationRules = s.escalationRules.filter((r) => r.id !== id);
          audit(
            s,
            actor,
            "Escalation policy removed",
            "admin",
            rule ? `${rule.priority} · ${rule.trigger.replace(/_/g, " ")} · ${rule.thresholdSec} sec` : id,
            { entityId: id },
          );
        }),

      setIntegrationStatus: (id, status, actor) =>
        set((s) => {
          const integration = s.integrations.find((i) => i.id === id);
          if (!integration) return;
          integration.status = status;
          audit(
            s,
            actor,
            "Integration status changed",
            "admin",
            `${integration.name} → ${status}`,
            { entityId: id },
          );
        }),

      updateTemplate: (id, patch, actor) =>
        set((s) => {
          const template = s.templates.find((t) => t.id === id);
          if (!template) return;
          Object.assign(template, patch);
          audit(
            s,
            actor,
            "Notification template changed",
            "admin",
            template.name,
            { entityId: id },
          );
        }),

      recordAudit: (entry, actor) =>
        set((s) =>
          audit(s, actor, entry.action, entry.category, entry.detail, {
            incidentId: entry.incidentId,
            entityId: entry.entityId,
          }),
        ),
  });

export { SYSTEM as SYSTEM_ACTOR };
