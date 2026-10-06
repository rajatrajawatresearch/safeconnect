/**
 * Who is calling, what they may do, and what they may see.
 *
 * Two rules are enforced here, on the server, regardless of what any client does:
 *  1. A command is refused unless the caller's role holds the permission (or owns the record).
 *  2. Data streamed or returned to a caller is first reduced to what that role is entitled to —
 *     a citizen receives only their own records, an officer only their unit's incidents in full.
 */
import type { DemoData } from "@/data/demo";
import { COLLECTIONS, type CollectionName } from "@/domain/collections";
import { CITIZENS, PERSONAS } from "@/data/demo/people";
import type {
  ActorRef,
  Citizen,
  Evidence,
  Incident,
  Permission,
  RoleKey,
} from "@/types";

export interface Session {
  /** Persona / user id. */
  sub: string;
  role: RoleKey;
  name: string;
  unitId?: string;
  stationId?: string;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code:
      | "forbidden"
      | "not_found"
      | "invalid"
      | "unauthorized"
      | "conflict",
    message: string,
  ) {
    super(message);
  }
}

export const forbidden = (message = "Your role does not permit this action.") =>
  new HttpError(403, "forbidden", message);
export const notFound = (what = "Record") =>
  new HttpError(404, "not_found", `${what} was not found.`);
export const invalid = (message: string) =>
  new HttpError(400, "invalid", message);

export function sessionForPersona(personaId: string): Session | undefined {
  const persona = PERSONAS.find((p) => p.id === personaId);
  if (!persona) return undefined;
  return {
    sub: persona.id,
    role: persona.role,
    name: persona.name,
    unitId: persona.unitId,
    stationId: persona.stationId,
  };
}

export const actorOf = (session: Session): ActorRef => ({
  id: session.sub,
  name: session.name,
  role: session.role,
});
export const citizenOf = (session: Session): Citizen | undefined =>
  session.role === "citizen"
    ? CITIZENS.find((c) => c.id === session.sub)
    : undefined;

export function can(
  state: Pick<DemoData, "roles">,
  role: RoleKey,
  permission: Permission,
): boolean {
  return (
    state.roles.find((r) => r.key === role)?.permissions.includes(permission) ??
    false
  );
}

/** Throws unless the role holds at least one of the permissions. */
export function requireAny(
  state: Pick<DemoData, "roles">,
  session: Session,
  ...permissions: Permission[]
) {
  if (!permissions.some((p) => can(state, session.role, p))) throw forbidden();
}

const live = (incident: Incident) =>
  incident.assignments.filter((a) => a.response !== "rejected");
export const unitOnIncident = (
  incident: Incident,
  unitId: string | undefined,
) => Boolean(unitId) && live(incident).some((a) => a.unitId === unitId);
const isOpen = (i: Incident) =>
  !["resolved", "closed", "cancelled"].includes(i.status);
const OPERATIONAL_AUDIT = new Set([
  "incident",
  "dispatch",
  "communication",
  "evidence",
]);

/** May this caller open the incident at all? */
export function canReadIncident(
  state: DemoData,
  session: Session,
  incident: Incident,
): boolean {
  if (session.role === "citizen") return incident.citizenId === session.sub;
  if (session.role === "officer")
    return unitOnIncident(incident, session.unitId) || isOpen(incident);
  if (session.role === "admin") return false;
  return (
    can(state, session.role, "incident.read.all") ||
    can(state, session.role, "incident.read.station") ||
    can(state, session.role, "incident.read.assigned")
  );
}

/** May this caller take part in the incident (message, add evidence, act on it)? */
export function canWorkIncident(
  state: DemoData,
  session: Session,
  incident: Incident,
): boolean {
  if (session.role === "citizen") return incident.citizenId === session.sub;
  if (session.role === "officer")
    return unitOnIncident(incident, session.unitId);
  if (session.role === "admin") return false;
  return canReadIncident(state, session, incident);
}

type Bag = Record<CollectionName, unknown[]>;
const empty = (): Bag =>
  Object.fromEntries(COLLECTIONS.map((c) => [c.name, []])) as unknown as Bag;

/**
 * The records a caller is entitled to, as references into the live state (not yet reduced).
 * Returning the original objects lets the stream detect change by identity.
 */
export function visible(state: DemoData, session: Session): Bag {
  const out = empty();
  const { role, sub } = session;
  out.categories = state.categories;

  if (role === "citizen") {
    const mine = state.incidents.filter((i) => i.citizenId === sub);
    const ids = new Set(mine.map((i) => i.id));
    const unitIds = new Set(
      mine.filter(isOpen).flatMap((i) => live(i).map((a) => a.unitId)),
    );
    out.incidents = mine;
    out.units = state.units.filter((u) => unitIds.has(u.id));
    out.messages = state.messages.filter(
      (m) => m.channel === "citizen" && ids.has(m.incidentId),
    );
    out.evidence = state.evidence.filter(
      (e) => e.source === "citizen" && ids.has(e.incidentId),
    );
    out.complaints = state.complaints.filter((c) => c.citizenId === sub);
    out.journeys = state.journeys.filter((j) => j.citizenId === sub);
    out.contacts = state.contacts.filter((c) => c.citizenId === sub);
    out.sessions = state.sessions.filter((s) => ids.has(s.incidentId));
    out.notifications = state.notifications.filter(
      (n) => n.audience.includes("citizen") && n.citizenId === sub,
    );
    out.roles = state.roles.filter((r) => r.key === "citizen");
    return out;
  }

  if (role === "officer") {
    const assigned = new Set(
      state.incidents
        .filter((i) => unitOnIncident(i, session.unitId))
        .map((i) => i.id),
    );
    out.incidents = state.incidents.filter(
      (i) => i.sync === "synced" && (assigned.has(i.id) || isOpen(i)),
    );
    out.units = state.units;
    out.messages = state.messages.filter((m) => assigned.has(m.incidentId));
    out.evidence = state.evidence.filter((e) => assigned.has(e.incidentId));
    out.sessions = state.sessions.filter((s) => assigned.has(s.incidentId));
    out.notifications = state.notifications.filter(
      (n) =>
        n.audience.includes("officer") &&
        (!n.unitId || n.unitId === session.unitId),
    );
    out.roles = state.roles;
    return out;
  }

  if (role === "admin") {
    out.units = state.units;
    out.roles = state.roles;
    out.staff = state.staff;
    out.escalationRules = state.escalationRules;
    out.slaPolicies = state.slaPolicies;
    out.integrations = state.integrations;
    out.templates = state.templates;
    out.audit = state.audit;
    out.notifications = state.notifications.filter((n) =>
      n.audience.includes("admin"),
    );
    return out;
  }

  // Operational staff: operator, dispatcher, supervisor, district and state command.
  out.incidents = state.incidents.filter((i) => i.sync === "synced");
  out.units = state.units;
  out.messages = state.messages;
  out.evidence = can(state, role, "evidence.view") ? state.evidence : [];
  out.complaints = can(state, role, "complaint.view") ? state.complaints : [];
  out.sessions = state.sessions;
  out.escalations = state.escalations;
  out.notifications = state.notifications.filter((n) =>
    n.audience.includes(role),
  );
  out.audit = can(state, role, "audit.view")
    ? state.audit
    : state.audit.filter(
        (e) => e.incidentId && OPERATIONAL_AUDIT.has(e.category),
      );
  out.roles = state.roles;
  out.staff = state.staff;
  out.escalationRules = state.escalationRules;
  out.slaPolicies = state.slaPolicies;
  out.integrations = state.integrations;
  return out;
}

const OFFICER_TIMELINE = new Set([
  "created",
  "assigned",
  "en_route",
  "arrived",
  "resolved",
  "cancelled",
]);

/** Reduces one record to what the caller may see of it. Returns the same object when nothing needs removing. */
export function redact(
  state: DemoData,
  session: Session,
  collection: CollectionName,
  entity: unknown,
): unknown {
  if (collection === "incidents") {
    const incident = entity as Incident;
    if (session.role === "citizen") {
      return {
        ...incident,
        notes: [],
        ai: undefined,
        operatorId: undefined,
        escalationLevel: 0,
        timeline: incident.timeline.filter((t) => t.citizenVisible),
        handoff: { reportStatus: incident.handoff.reportStatus },
      } satisfies Incident;
    }
    if (
      session.role === "officer" &&
      !unitOnIncident(incident, session.unitId)
    ) {
      return {
        ...incident,
        citizenId: undefined,
        reporterName: "Withheld",
        reporterPhoneMasked: undefined,
        notes: [],
        ai: undefined,
        evidenceIds: [],
        timeline: incident.timeline.filter((t) => OFFICER_TIMELINE.has(t.kind)),
        handoff: { reportStatus: "not_started" },
      } satisfies Incident;
    }
    return incident;
  }

  if (collection === "evidence") {
    const item = entity as Evidence;
    if (session.role === "citizen")
      return { ...item, access: [] } satisfies Evidence;
    if (
      item.classification === "restricted" &&
      !can(state, session.role, "evidence.restricted")
    ) {
      return {
        ...item,
        title: "Restricted item",
        fileName: "",
        hash: "",
        sizeBytes: 0,
        durationSec: undefined,
        device: undefined,
        uploadedByName: "Withheld",
        access: [],
      } satisfies Evidence;
    }
    return item;
  }

  return entity;
}

/** The full reduced view for a caller: what a new connection receives. */
export function project(state: DemoData, session: Session): Bag {
  const refs = visible(state, session);
  const out = empty();
  for (const c of COLLECTIONS)
    out[c.name] = refs[c.name].map((e) => redact(state, session, c.name, e));
  return out;
}
