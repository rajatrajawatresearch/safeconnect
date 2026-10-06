import { shiftAt } from "@/lib/format";
import { fakeDigest } from "@/lib/prng";
import type {
  AppNotification,
  AuditEvent,
  CommunicationSession,
  Complaint,
  EmergencyContact,
  Escalation,
  EscalationRule,
  Evidence,
  Incident,
  IncidentCategory,
  Integration,
  Journey,
  Message,
  NotificationTemplate,
  Role,
  SlaPolicy,
  StaffUser,
  TimelineKind,
  Timestamp,
  Unit,
} from "@/types";
import {
  ESCALATION_RULES_SEED,
  INTEGRATIONS_SEED,
  ROLES_SEED,
  SLA_SEED,
  TEMPLATES_SEED,
} from "./admin";
import { CATEGORIES_SEED } from "./categories";
import { complaintId, seedComplaints, seedJourneys } from "./complaints";
import { incidentId, seedIncidentData, seedUnits } from "./incidents";
import { CONTACTS_SEED, STAFF_SEED } from "./people";

const SEC = 1000;
const MIN = 60 * SEC;

/** The whole mock "database". The demo store holds exactly this shape plus its actions. */
export interface DemoData {
  seededAt: Timestamp;
  nextIncidentSeq: number;
  nextEvidenceSeq: number;
  nextComplaintSeq: number;
  incidents: Incident[];
  units: Unit[];
  messages: Message[];
  evidence: Evidence[];
  complaints: Complaint[];
  journeys: Journey[];
  contacts: EmergencyContact[];
  sessions: CommunicationSession[];
  notifications: AppNotification[];
  escalations: Escalation[];
  audit: AuditEvent[];
  roles: Role[];
  staff: StaffUser[];
  categories: IncidentCategory[];
  escalationRules: EscalationRule[];
  slaPolicies: SlaPolicy[];
  integrations: Integration[];
  templates: NotificationTemplate[];
}

const AUDIT_CATEGORY: Partial<Record<TimelineKind, AuditEvent["category"]>> = {
  assigned: "dispatch",
  accepted: "dispatch",
  rejected: "dispatch",
  en_route: "dispatch",
  arrived: "dispatch",
  backup: "dispatch",
  communication: "communication",
  evidence: "evidence",
};

function seedAudit(
  incidents: Incident[],
  evidence: Evidence[],
  now: Timestamp,
): AuditEvent[] {
  const events: Omit<AuditEvent, "chainHash">[] = [];

  for (const incident of incidents) {
    for (const t of incident.timeline) {
      events.push({
        id: `au-${t.id}`,
        at: t.at,
        actorName: t.actor ?? "System",
        actorRole:
          t.kind === "created" || t.kind === "cancelled"
            ? "citizen"
            : t.actor?.startsWith("GJ-")
              ? "officer"
              : t.kind === "escalated"
                ? "system"
                : "operator",
        action: t.title,
        category: AUDIT_CATEGORY[t.kind] ?? "incident",
        incidentId: incident.id,
        detail: t.detail ?? incident.title,
      });
    }
  }

  for (const item of evidence) {
    for (const a of item.access) {
      if (a.action === "uploaded" || a.action === "linked") continue;
      events.push({
        id: `au-${a.id}`,
        at: a.at,
        actorName: a.actorName,
        actorRole: a.actorRole,
        action:
          a.action === "viewed"
            ? "Evidence viewed"
            : a.action === "export_requested"
              ? "Evidence export requested"
              : "Evidence integrity recorded",
        category: "evidence",
        incidentId: item.incidentId,
        entityId: item.id,
        detail: `${item.id} · ${item.title}`,
      });
    }
  }

  events.push(
    {
      id: "au-s1",
      at: now - 6 * 60 * MIN,
      actorName: "Meera Joshi",
      actorRole: "operator",
      action: "Signed in",
      category: "access",
      detail: "Console workstation CR-07 · second factor verified",
    },
    {
      id: "au-s2",
      at: now - 5 * 60 * MIN - 12 * MIN,
      actorName: "System Administrator",
      actorRole: "admin",
      action: "Role permissions changed",
      category: "admin",
      detail: "Dispatcher: added incident.transfer",
    },
    {
      id: "au-s3",
      at: now - 3 * 60 * MIN,
      actorName: "Dhruv Solanki",
      actorRole: "operator",
      action: "Restricted evidence access denied",
      category: "access",
      entityId: "EV-2026-004472",
      detail: "Role does not include evidence.restricted",
    },
    {
      id: "au-s4",
      at: now - 2 * 60 * MIN - 5 * MIN,
      actorName: "Inspector Neha Desai",
      actorRole: "supervisor",
      action: "Signed in",
      category: "access",
      detail: "Station terminal NAV-02 · second factor verified",
    },
    {
      id: "au-s5",
      at: now - 95 * MIN,
      actorName: "System Administrator",
      actorRole: "admin",
      action: "Escalation policy changed",
      category: "admin",
      detail: "P1 no-acknowledgement threshold set to 30 sec",
    },
    {
      id: "au-s6",
      at: now - 41 * MIN,
      actorName: "DCP Vikram Rao",
      actorRole: "command",
      action: "Viewed district analytics",
      category: "access",
      detail: "Ahmedabad City · response time trend",
    },
  );

  events.sort((a, b) => b.at - a.at);
  return events.map((e) => ({
    ...e,
    chainHash: fakeDigest(e.id).slice(0, 16),
  }));
}

function seedNotifications(now: Timestamp): AppNotification[] {
  const shift = shiftAt(now);
  const staff: AppNotification["audience"] = [
    "operator",
    "dispatcher",
    "supervisor",
    "command",
  ];
  return [
    {
      id: "nt-1",
      kind: "critical_incident",
      title: "Critical incident received",
      body: "Woman safety / Harassment · Navrangpura",
      at: now - 42 * SEC,
      audience: staff,
      incidentId: incidentId(28491),
      href: `/control/incidents?id=${incidentId(28491)}`,
      tone: "critical",
      readBy: [],
    },
    {
      id: "nt-2",
      kind: "assignment",
      title: "Unit GJ-AHD-17 assigned",
      body: `${incidentId(28491)} · waiting for the officer to accept`,
      at: now - 26 * SEC,
      audience: staff,
      incidentId: incidentId(28491),
      href: `/control/incidents?id=${incidentId(28491)}`,
      tone: "info",
      readBy: [],
    },
    {
      id: "nt-3",
      kind: "assignment",
      title: "New assignment",
      body: "Critical · Woman safety / Harassment · 1.8 km away",
      at: now - 26 * SEC,
      audience: ["officer"],
      unitId: "u-17",
      incidentId: incidentId(28491),
      href: "/officer/assignment",
      tone: "critical",
      readBy: [],
    },
    {
      id: "nt-4",
      kind: "incident",
      title: "New incident",
      body: "Harassment · Law Garden",
      at: now - 58 * SEC,
      audience: staff,
      incidentId: incidentId(28481),
      href: `/control/incidents?id=${incidentId(28481)}`,
      tone: "high",
      readBy: [],
    },
    {
      id: "nt-5",
      kind: "backup",
      title: "Backup requested",
      body: "Missing child · Vastrapur · Unit GJ-AHD-15 added",
      at: now - 6 * MIN,
      audience: staff,
      incidentId: incidentId(28488),
      href: `/control/incidents?id=${incidentId(28488)}`,
      tone: "high",
      readBy: [],
    },
    {
      id: "nt-6",
      kind: "escalation",
      title: "Incident escalated",
      body: "Missing child · Vastrapur · district command informed",
      at: now - 5 * MIN,
      audience: staff,
      incidentId: incidentId(28488),
      href: "/control/escalations",
      tone: "critical",
      readBy: [],
    },
    {
      id: "nt-7",
      kind: "evidence",
      title: "New evidence received",
      body: "CCTV — Lake Garden Gate 2",
      at: now - 6 * MIN - 20 * SEC,
      audience: staff,
      incidentId: incidentId(28488),
      href: "/control/evidence",
      tone: "info",
      readBy: ["stf-meera"],
    },
    {
      id: "nt-8",
      kind: "sos",
      title: "Unit GJ-AHD-17 has been assigned",
      body: "Stay where you are. You can chat with the control room at any time.",
      at: now - 26 * SEC,
      audience: ["citizen"],
      citizenId: "cit-kavya",
      incidentId: incidentId(28491),
      href: "/citizen/sos",
      tone: "critical",
      readBy: [],
    },
    {
      id: "nt-9",
      kind: "complaint",
      title: "Complaint updated",
      body: `${complaintId(1872)} is now Action in progress`,
      at: now - 21 * 60 * MIN,
      audience: ["citizen"],
      citizenId: "cit-aarav",
      href: `/citizen/complaints?id=${complaintId(1872)}`,
      tone: "info",
      readBy: [],
    },
    {
      id: "nt-10",
      kind: "complaint",
      title: "More information needed",
      body: `${complaintId(1841)} · please add the transaction reference`,
      at: now - 2 * 24 * 60 * MIN,
      audience: ["citizen"],
      citizenId: "cit-aarav",
      href: `/citizen/complaints?id=${complaintId(1841)}`,
      tone: "high",
      readBy: [],
    },
    {
      id: "nt-11",
      kind: "journey",
      title: "Journey completed",
      body: "You arrived at Navrangpura. Sharing has stopped.",
      at: now - 26 * 60 * MIN,
      audience: ["citizen"],
      citizenId: "cit-aarav",
      href: "/citizen/activity",
      tone: "success",
      readBy: ["cit-aarav"],
    },
    {
      id: "nt-12",
      kind: "system",
      title: `Shift ${shift.name} started`,
      body: `${shift.label.split(" · ")[1]} · 16 units on the roster`,
      at: now - 3 * 60 * MIN,
      audience: staff,
      tone: "info",
      readBy: ["stf-meera", "stf-neha", "stf-vikram"],
    },
  ];
}

function seedEscalations(incidents: Incident[]): Escalation[] {
  return incidents
    .filter((i) => i.escalationLevel > 0)
    .map((i, idx) => {
      const event = i.timeline.find((t) => t.kind === "escalated");
      const done = i.status === "resolved" || i.status === "closed";
      return {
        id: `esc-${idx + 1}`,
        incidentId: i.id,
        level: i.escalationLevel as 1 | 2 | 3,
        reason:
          i.categoryId === "missing_person"
            ? "Missing minor not located within the first ten minutes"
            : i.status === "acknowledged"
              ? "No unit assigned within the P3 threshold (240 sec)"
              : "Raised by the responding officer",
        ruleId: i.status === "acknowledged" ? "er-8" : undefined,
        raisedBy:
          i.status === "acknowledged" ? "Escalation policy" : "Meera Joshi",
        raisedAt: event?.at ?? i.createdAt,
        status: done ? "resolved" : "open",
        acknowledgedBy: done ? "Inspector Neha Desai" : undefined,
      } satisfies Escalation;
    });
}

export function buildDemoData(now: Timestamp = Date.now()): DemoData {
  const { incidents, messages, evidence } = seedIncidentData(now);
  return {
    seededAt: now,
    nextIncidentSeq: 28492,
    nextEvidenceSeq: 4523,
    nextComplaintSeq: 1875,
    incidents,
    units: seedUnits(now),
    messages,
    evidence,
    complaints: seedComplaints(now),
    journeys: seedJourneys(now),
    contacts: CONTACTS_SEED.map((c) => ({ ...c })),
    sessions: [],
    notifications: seedNotifications(now),
    escalations: seedEscalations(incidents),
    audit: seedAudit(incidents, evidence, now),
    roles: ROLES_SEED.map((r) => ({ ...r, permissions: [...r.permissions] })),
    staff: STAFF_SEED.map(({ lastActiveMinAgo, ...s }) => ({
      ...s,
      lastActiveAt: now - lastActiveMinAgo * MIN,
    })),
    categories: CATEGORIES_SEED.map((c) => ({ ...c })),
    escalationRules: ESCALATION_RULES_SEED.map((r) => ({ ...r })),
    slaPolicies: SLA_SEED.map((s) => ({ ...s })),
    integrations: INTEGRATIONS_SEED.map((i) => ({ ...i })),
    templates: TEMPLATES_SEED.map((t) => ({ ...t, body: { ...t.body } })),
  };
}

export * from "./geo";
export * from "./people";
export { PERMISSIONS } from "./admin";
export { ANALYTICS, DISTRICT_SUMMARIES } from "./analytics";
export {
  OPERATOR,
  incidentId,
  evidenceId,
  callSignOf,
  unitIdOf,
} from "./incidents";
export { complaintId } from "./complaints";
