/**
 * HTTP API. One route per command in `src/services/contracts.ts`.
 *
 * Every route: verifies the token, validates the body, then checks the caller's permission and
 * ownership inside the same serialized step that applies the change. The acting user always comes
 * from the token — a client cannot claim to be someone else.
 */
import "@fastify/jwt";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { DemoData } from "@/data/demo";
import { DENSITY } from "@/data/demo/geo";
import { PERSONAS } from "@/data/demo/people";
import { STATIONS } from "@/data/demo/geo";
import type { CollectionName } from "@/domain/collections";
import type { DemoStore } from "@/domain/platform-store";
import {
  DEMO_OPERATOR,
  analyticsOverview,
  citizenLocation,
  journeyAlertLocation,
  nearestUnassignedIncident,
  pickAdvanceTarget,
  recommendUnits,
  reducedName,
  searchPlatform,
} from "@/domain/queries";
import type { ActorRef, Incident, Permission, RoleKey } from "@/types";
import {
  HttpError,
  actorOf,
  can,
  canReadIncident,
  canWorkIncident,
  citizenOf,
  forbidden,
  invalid,
  notFound,
  redact,
  requireAny,
  sessionForPersona,
  unitOnIncident,
  type Session,
} from "./access";
import { config } from "./config";
import { queryAudit, verifyAuditChain } from "./db";
import type { Platform } from "./platform";
import type { RealtimeHub } from "./realtime";

/* ───────────────────────── Schemas ───────────────────────── */

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const priority = z.enum(["P1", "P2", "P3", "P4"]);
const latLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
const location = latLng.extend({
  address: z.string().max(300),
  area: z.string().max(120),
  landmark: z.string().max(200).optional(),
  districtId: z.string().max(40),
  stationId: z.string().max(40),
  source: z.enum([
    "device_emergency",
    "citizen_entered",
    "operator_entered",
    "unit_reported",
  ]),
  accuracyM: z.number().optional(),
});
const evidenceType = z.enum(["photo", "video", "audio", "document"]);
const documents = z
  .array(
    z.object({
      name: text(200),
      kind: evidenceType,
      sizeBytes: z.number().nonnegative(),
    }),
  )
  .max(20);
const place = latLng.extend({ label: text(120) });

const S = {
  login: z.object({ personaId: text(60) }),
  mfa: z.object({ code: z.string().max(12) }),
  incident: z.object({
    source: z.enum(["sos", "silent_sos", "report", "call", "tip", "journey"]),
    categoryId: text(60),
    priority: priority.optional(),
    title: optionalText(160),
    description: z.string().max(4000),
    location,
    reporterName: optionalText(120),
    reporterPhoneMasked: optionalText(40),
    anonymous: z.boolean().optional(),
    peopleInDanger: z.boolean().optional(),
    auto: z.boolean().optional(),
  }),
  sos: z.object({
    silent: z.boolean().optional(),
    categoryId: optionalText(60),
    location: location.optional(),
    note: optionalText(1000),
    notifyContacts: z.boolean().optional(),
  }),
  triage: z.object({ priority, categoryId: text(60) }),
  note: z.object({ text: text(2000) }),
  escalate: z.object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    reason: text(500),
  }),
  escalationStatus: z.object({ status: z.enum(["acknowledged", "resolved"]) }),
  transfer: z.object({ stationId: text(40) }),
  resolve: z.object({ resolution: text(4000) }),
  cancel: z.object({
    kind: z.enum(["safe", "false_alarm", "other"]),
    reason: z.string().max(500),
  }),
  assign: z.object({ unitId: text(40) }),
  reason: z.object({ reason: optionalText(500) }),
  rejectReason: z.object({ reason: text(500) }),
  backup: z.object({ note: optionalText(500) }),
  stage: z.object({
    stage: z.enum([
      "assigned",
      "accepted",
      "en_route",
      "on_scene",
      "assistance_requested",
      "situation_controlled",
      "report_pending",
      "completed",
    ]),
  }),
  report: z.object({ report: text(8000) }),
  unitStatus: z.object({
    status: z.enum([
      "available",
      "assigned",
      "en_route",
      "on_scene",
      "unavailable",
      "off_duty",
    ]),
  }),
  evidence: z.object({
    incidentId: text(60),
    type: evidenceType,
    title: text(200),
    fileName: text(260),
    sizeBytes: z.number().nonnegative(),
    durationSec: z.number().nonnegative().optional(),
    classification: z.enum(["standard", "sensitive", "restricted"]).optional(),
    device: optionalText(120),
  }),
  exportRequest: z.object({ purpose: text(500) }),
  message: z.object({
    channel: z.enum(["citizen", "internal"]),
    text: text(2000),
  }),
  session: z.object({ type: z.enum(["voice", "video"]) }),
  complaint: z.object({
    kind: z.enum(["report", "emergency", "confidential_tip"]),
    anonymous: z.boolean(),
    categoryId: text(60),
    title: text(200),
    description: z.string().max(4000),
    stationId: text(40),
    location: z.object({
      address: z.string().max(300),
      area: z.string().max(120),
    }),
    occurredAt: z.number(),
    contactPreference: z.enum(["call", "chat", "none"]),
    documents,
    linkedIncidentId: optionalText(60),
  }),
  complaintStatus: z.object({
    status: z.enum([
      "submitted",
      "received",
      "under_review",
      "assigned",
      "in_progress",
      "info_required",
      "resolved",
      "closed",
    ]),
    note: text(2000),
  }),
  complaintInfo: z.object({ note: z.string().max(2000), documents }),
  journey: z.object({
    from: place,
    destination: place,
    durationMin: z.number().min(1).max(600),
    checkIntervalMin: z.number().min(1).max(120),
    contactIds: z.array(z.string()).max(10),
  }),
  position: z.object({ position: latLng }),
  contact: z.object({
    name: text(120),
    relation: z.enum([
      "Mother",
      "Father",
      "Partner",
      "Friend",
      "Guardian",
      "Sibling",
      "Other",
    ]),
    phoneMasked: text(40),
    notifyOnSos: z.boolean(),
    notifyOnJourney: z.boolean(),
    shareLocation: z.boolean(),
  }),
  ids: z.object({ ids: z.array(z.string()).max(500) }),
  auditEntry: z.object({
    action: text(160),
    category: z.enum([
      "incident",
      "dispatch",
      "communication",
      "evidence",
      "complaint",
      "access",
      "admin",
      "system",
    ]),
    detail: text(1000),
    incidentId: optionalText(60),
    entityId: optionalText(80),
  }),
  rolePermission: z.object({ permission: text(60), enabled: z.boolean() }),
  staffStatus: z.object({ status: z.enum(["active", "suspended", "invited"]) }),
  integrationStatus: z.object({
    status: z.enum(["placeholder", "sandbox", "disabled"]),
  }),
  loose: z.record(z.string(), z.unknown()),
  paused: z.object({ paused: z.boolean() }),
  advance: z.object({ personaId: optionalText(60) }),
  requestAssignment: z.object({ unitId: text(40) }),
};

/* ───────────────────────── Plumbing ───────────────────────── */

interface Ctx<B> {
  req: FastifyRequest;
  session: Session;
  actor: ActorRef;
  params: Record<string, string>;
  query: Record<string, string>;
  body: B;
}

const OK = { ok: true } as const;

export function registerRoutes(
  app: FastifyInstance,
  platform: Platform,
  hub: RealtimeHub,
) {
  /** Second-factor verification per signed-in user. Held in memory: it is a property of the session. */
  const mfaVerified = new Map<string, number>();

  async function authenticate(req: FastifyRequest): Promise<Session> {
    try {
      await req.jwtVerify();
    } catch {
      throw new HttpError(
        401,
        "unauthorized",
        "Your session has ended. Sign in again.",
      );
    }
    const claims = req.user as Session;
    const staff = platform.state.staff.find((u) => u.id === claims.sub);
    if (staff?.status === "suspended")
      throw forbidden("This account is suspended.");
    return {
      sub: claims.sub,
      role: claims.role,
      name: claims.name,
      unitId: claims.unitId,
      stationId: claims.stationId,
    };
  }

  function route<B>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    schema: z.ZodType<B> | null,
    handler: (ctx: Ctx<B>) => unknown,
  ) {
    app.route({
      method,
      url,
      handler: async (req) => {
        const session = await authenticate(req);
        let body = undefined as B;
        if (schema) {
          const parsed = schema.safeParse(req.body ?? {});
          if (!parsed.success)
            throw invalid(
              parsed.error.issues
                .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
                .join("; "),
            );
          body = parsed.data;
        }
        const result = await handler({
          req,
          session,
          actor: actorOf(session),
          params: req.params as Record<string, string>,
          query: req.query as Record<string, string>,
          body,
        });
        return result ?? OK;
      },
    });
  }

  const state = () => platform.state as DemoStore;
  const incidentIn = (s: DemoData, id: string): Incident =>
    s.incidents.find((i) => i.id === id) ?? fail(notFound("Incident"));
  const view = (
    session: Session,
    collection: CollectionName,
    entity: unknown,
  ) => redact(state(), session, collection, entity);
  const signToken = (session: Session) =>
    app.jwt.sign({ ...session }, { expiresIn: config.tokenTtlSeconds });
  const demoOnly = () => {
    if (!config.demoMode)
      throw forbidden("Presenter controls are disabled on this deployment.");
  };

  /** Name shown beside a message, decided here rather than taken from the client. */
  function displayName(
    session: Session,
    channel: "citizen" | "internal",
  ): string {
    const first = session.name.split(" ")[0];
    if (session.role === "citizen") return first;
    if (session.role === "officer") {
      const unit = state().units.find((u) => u.id === session.unitId);
      return unit ? `${session.name} · Unit ${unit.callSign}` : session.name;
    }
    return channel === "internal" ? session.name : `${first} · Control room`;
  }

  /** An officer may act for their own unit; a dispatcher may act on a unit's behalf from the board. */
  function requireUnitControl(
    s: DemoData,
    session: Session,
    unitId: string,
    ...staffPermissions: Permission[]
  ) {
    if (session.role === "officer") {
      if (session.unitId !== unitId)
        throw forbidden("You can only update your own unit.");
      return;
    }
    requireAny(s, session, ...staffPermissions);
  }

  /* ── Health ── */

  app.get("/health", async () => ({
    ok: true,
    demoMode: config.demoMode,
    connections: hub.connectionCount,
    incidents: state().incidents.length,
    uptimeSec: Math.round(process.uptime()),
  }));

  /* ── Sign-in ── */

  app.get("/auth/personas", async () => (config.demoMode ? PERSONAS : []));

  app.post("/auth/login", async (req) => {
    if (!config.demoMode)
      throw forbidden(
        "Persona sign-in is only available in demo mode. Connect an identity provider.",
      );
    const parsed = S.login.safeParse(req.body ?? {});
    if (!parsed.success) throw invalid("personaId is required.");
    const session = sessionForPersona(parsed.data.personaId);
    if (!session) throw notFound("Persona");
    if (state().staff.find((u) => u.id === session.sub)?.status === "suspended")
      throw forbidden("This account is suspended.");
    await platform.commit((s) =>
      s.recordAudit(
        {
          action: "Signed in",
          category: "access",
          detail: `${session.name} · demo persona sign-in`,
        },
        actorOf(session),
      ),
    );
    return {
      token: signToken(session),
      expiresAt: Date.now() + config.tokenTtlSeconds * 1000,
      session,
    };
  });

  const sessionInfo = (req: FastifyRequest, session: Session) => {
    const claims = req.user as { iat?: number; exp?: number };
    const agent = String(req.headers["user-agent"] ?? "");
    const device = /iPhone|Android/.test(agent)
      ? "Phone browser"
      : /Macintosh/.test(agent)
        ? "Mac browser"
        : /Windows/.test(agent)
          ? "Windows browser"
          : "Browser";
    return {
      device: `${device} · this session`,
      startedAt: (claims.iat ?? 0) * 1000,
      expiresAt: (claims.exp ?? 0) * 1000,
      mfaVerified: mfaVerified.has(session.sub),
      lastIp: req.ip.replace(/\.\d+\.\d+$/, ".XX.XX"),
    };
  };

  route("GET", "/auth/session", null, ({ req, session }) =>
    sessionInfo(req, session),
  );

  route("POST", "/auth/session/extend", null, ({ req, session }) => {
    const token = signToken(session);
    const now = Math.floor(Date.now() / 1000);
    return {
      token,
      session: {
        ...sessionInfo(req, session),
        startedAt: ((req.user as { iat?: number }).iat ?? now) * 1000,
        expiresAt: (now + config.tokenTtlSeconds) * 1000,
      },
    };
  });

  route("POST", "/auth/mfa/verify", S.mfa, async ({ session, actor, body }) => {
    // Placeholder check: any six digits. A deployment verifies a TOTP or a hardware key here.
    const ok = /^\d{6}$/.test(body.code);
    if (ok) {
      mfaVerified.set(session.sub, Date.now());
      await platform.commit((s) =>
        s.recordAudit(
          {
            action: "Second factor verified",
            category: "access",
            detail: `${session.name}`,
          },
          actor,
        ),
      );
    }
    return { ok };
  });

  /* ── Live stream ── */

  route("POST", "/realtime/ticket", null, ({ session }) => ({
    ticket: hub.issueTicket(session),
  }));

  app.get("/realtime/stream", (req, reply) => {
    const session = hub.redeem((req.query as { ticket?: string }).ticket);
    if (!session) {
      void reply
        .code(401)
        .send({
          code: "unauthorized",
          message: "Stream ticket is missing or has expired.",
        });
      return;
    }
    reply.hijack();
    hub.attach(session, reply.raw, req.headers.origin);
  });

  /* ── Incidents ── */

  route("POST", "/incidents", S.incident, async ({ session, actor, body }) => {
    const created = await platform.commit((s) => {
      requireAny(s, session, "incident.create");
      if (session.role === "citizen") {
        const citizen = citizenOf(session);
        if (!citizen) throw forbidden();
        if (body.source !== "report" && body.source !== "tip")
          throw invalid(
            "Citizens raise emergencies through SOS and everything else as a report or a tip.",
          );
        const anonymous = Boolean(body.anonymous) || body.source === "tip";
        // Identity always comes from the token. For a tip, none is stored at all.
        return s.createIncident(
          {
            ...body,
            anonymous,
            citizenId: anonymous ? undefined : citizen.id,
            reporterName: anonymous
              ? "Confidential source"
              : reducedName(citizen.name),
            reporterPhoneMasked: anonymous ? undefined : citizen.phoneMasked,
          },
          anonymous
            ? {
                id: "confidential",
                name: "Confidential source",
                role: "citizen",
              }
            : actor,
        );
      }
      return s.createIncident(
        { ...body, reporterName: body.reporterName ?? "Caller" },
        actor,
      );
    });
    return view(session, "incidents", created);
  });

  route(
    "POST",
    "/incidents/:id/acknowledge",
    null,
    ({ session, actor, params }) =>
      platform.commit((s) => {
        requireAny(s, session, "incident.classify");
        incidentIn(s, params.id);
        s.acknowledgeIncident(params.id, actor);
      }),
  );

  route(
    "POST",
    "/incidents/:id/triage",
    S.triage,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "incident.classify");
        incidentIn(s, params.id);
        if (!s.categories.some((c) => c.id === body.categoryId))
          throw invalid("Unknown category.");
        s.confirmTriage(params.id, body, actor);
      }),
  );

  route(
    "POST",
    "/incidents/:id/notes",
    S.note,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "incident.note");
        if (!canWorkIncident(s, session, incidentIn(s, params.id)))
          throw forbidden();
        s.addNote(params.id, body.text, actor);
      }),
  );

  route(
    "POST",
    "/incidents/:id/escalate",
    S.escalate,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "incident.escalate");
        incidentIn(s, params.id);
        s.escalateIncident(params.id, body.level, body.reason, actor);
      }),
  );

  route(
    "POST",
    "/escalations/:id/status",
    S.escalationStatus,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "incident.escalate");
        if (!s.escalations.some((e) => e.id === params.id))
          throw notFound("Escalation");
        s.setEscalationStatus(params.id, body.status, actor);
      }),
  );

  route(
    "POST",
    "/incidents/:id/transfer",
    S.transfer,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "incident.transfer");
        incidentIn(s, params.id);
        if (!STATIONS.some((st) => st.id === body.stationId))
          throw invalid("Unknown station.");
        s.transferIncident(params.id, body.stationId, actor);
      }),
  );

  route(
    "POST",
    "/incidents/:id/resolve",
    S.resolve,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "incident.resolve");
        incidentIn(s, params.id);
        s.resolveIncident(params.id, body.resolution, actor);
      }),
  );

  route("POST", "/incidents/:id/close", null, ({ session, actor, params }) =>
    platform.commit((s) => {
      requireAny(s, session, "incident.resolve");
      incidentIn(s, params.id);
      s.closeIncident(params.id, actor);
    }),
  );

  /* ── SOS ── */

  route("POST", "/sos", S.sos, async ({ session, actor, body }) => {
    const citizen = citizenOf(session);
    if (!citizen) throw forbidden("Only a citizen account can raise an SOS.");
    const created = await platform.commit((s) => {
      const incident = s.createIncident(
        {
          source: body.silent ? "silent_sos" : "sos",
          categoryId: body.categoryId ?? "personal_danger",
          priority: "P1",
          description:
            body.note ||
            (body.silent
              ? "Silent SOS raised from the citizen app. Chat only until the citizen says otherwise."
              : "SOS raised from the citizen app. No further details yet."),
          location: body.location ?? citizenLocation(citizen),
          citizenId: citizen.id,
          reporterName: reducedName(citizen.name),
          reporterPhoneMasked: citizen.phoneMasked,
          peopleInDanger: true,
          silent: body.silent,
          // In demo mode the simulator walks the response forward when no one staffs the consoles.
          auto: config.demoMode,
        },
        actor,
      );
      if (body.notifyContacts !== false) {
        const contacts = s.contacts.filter(
          (c) => c.citizenId === citizen.id && c.notifyOnSos,
        );
        if (contacts.length) {
          s.pushNotification({
            kind: "sos",
            title: "Trusted contacts notified",
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
    });
    return view(session, "incidents", created);
  });

  route(
    "POST",
    "/incidents/:id/cancel",
    S.cancel,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        const incident = incidentIn(s, params.id);
        if (session.role !== "citizen" || incident.citizenId !== session.sub)
          throw forbidden("Only the person who raised this can cancel it.");
        s.cancelIncident(params.id, body.kind, body.reason, actor);
      }),
  );

  /* ── Dispatch ── */

  route(
    "GET",
    "/incidents/:id/recommended-units",
    null,
    ({ session, params }) => {
      const s = state();
      const incident = incidentIn(s, params.id);
      if (
        !(
          can(s, session.role, "unit.assign") ||
          can(s, session.role, "unit.view") ||
          unitOnIncident(incident, session.unitId)
        )
      )
        throw forbidden();
      return recommendUnits(s, params.id) ?? [];
    },
  );

  route(
    "POST",
    "/incidents/:id/units",
    S.assign,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "unit.assign");
        incidentIn(s, params.id);
        const unit =
          s.units.find((u) => u.id === body.unitId) ?? fail(notFound("Unit"));
        if (unit.status !== "available")
          throw new HttpError(
            409,
            "conflict",
            `Unit ${unit.callSign} is no longer available.`,
          );
        s.assignUnit(params.id, body.unitId, actor);
      }),
  );

  route(
    "POST",
    "/incidents/:id/units/:unitId/release",
    S.reason,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "unit.assign");
        incidentIn(s, params.id);
        s.unassignUnit(params.id, params.unitId, actor, body.reason);
      }),
  );

  route(
    "POST",
    "/incidents/:id/backup",
    S.backup,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        const incident = incidentIn(s, params.id);
        if (
          !(
            can(s, session.role, "incident.dispatch") ||
            unitOnIncident(incident, session.unitId)
          )
        )
          throw forbidden();
        s.requestBackup(params.id, actor, body.note);
      }),
  );

  /* ── Units ── */

  route(
    "POST",
    "/units/:id/status",
    S.unitStatus,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireUnitControl(s, session, params.id, "unit.status.update");
        const unit =
          s.units.find((u) => u.id === params.id) ?? fail(notFound("Unit"));
        if (
          unit.currentIncidentId &&
          ["assigned", "en_route", "on_scene"].includes(unit.status)
        ) {
          throw new HttpError(
            409,
            "conflict",
            "The unit is engaged on an incident. Release it first.",
          );
        }
        s.setUnitStatus(params.id, body.status, actor);
      }),
  );

  route(
    "POST",
    "/incidents/:id/units/:unitId/accept",
    null,
    ({ session, actor, params }) =>
      platform.commit((s) => {
        requireUnitControl(s, session, params.unitId, "incident.dispatch");
        const incident = incidentIn(s, params.id);
        if (!unitOnIncident(incident, params.unitId))
          throw notFound("Assignment");
        s.respondToAssignment(params.id, params.unitId, "accepted", actor);
        s.startEnRoute(params.id, params.unitId, actor);
      }),
  );

  route(
    "POST",
    "/incidents/:id/units/:unitId/reject",
    S.rejectReason,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireUnitControl(s, session, params.unitId, "incident.dispatch");
        incidentIn(s, params.id);
        s.respondToAssignment(
          params.id,
          params.unitId,
          "rejected",
          actor,
          body.reason,
        );
      }),
  );

  route(
    "POST",
    "/incidents/:id/units/:unitId/arrive",
    null,
    ({ session, actor, params }) =>
      platform.commit((s) => {
        requireUnitControl(s, session, params.unitId, "incident.dispatch");
        if (!unitOnIncident(incidentIn(s, params.id), params.unitId))
          throw notFound("Assignment");
        s.markArrived(params.id, params.unitId, actor);
      }),
  );

  route(
    "POST",
    "/incidents/:id/units/:unitId/stage",
    S.stage,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireUnitControl(s, session, params.unitId, "incident.dispatch");
        if (!unitOnIncident(incidentIn(s, params.id), params.unitId))
          throw notFound("Assignment");
        s.setOfficerStage(params.id, params.unitId, body.stage, actor);
        if (body.stage === "assistance_requested")
          s.requestBackup(
            params.id,
            actor,
            "Requested by the officer on scene",
          );
      }),
  );

  route(
    "POST",
    "/incidents/:id/units/:unitId/complete",
    S.resolve,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireUnitControl(s, session, params.unitId, "incident.resolve");
        if (!unitOnIncident(incidentIn(s, params.id), params.unitId))
          throw notFound("Assignment");
        s.resolveIncident(params.id, body.resolution, actor);
      }),
  );

  route(
    "POST",
    "/incidents/:id/units/:unitId/report",
    S.report,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireUnitControl(s, session, params.unitId, "incident.resolve");
        if (!unitOnIncident(incidentIn(s, params.id), params.unitId))
          throw notFound("Assignment");
        s.submitResponseReport(params.id, params.unitId, body.report, actor);
      }),
  );

  /* ── Evidence ── */

  route("POST", "/evidence", S.evidence, async ({ session, actor, body }) => {
    const created = await platform.commit((s) => {
      requireAny(s, session, "evidence.upload");
      if (!canWorkIncident(s, session, incidentIn(s, body.incidentId)))
        throw forbidden();
      const source =
        session.role === "citizen"
          ? "citizen"
          : session.role === "officer"
            ? "officer"
            : "operator";
      return s.addEvidence({ ...body, source }, actor);
    });
    // The digest is recorded shortly after ingestion, as a separate step.
    setTimeout(
      () =>
        void platform
          .commit((s) => s.verifyEvidence(created.id))
          .catch(() => undefined),
      2600,
    );
    return view(session, "evidence", created);
  });

  const evidenceIn = (s: DemoData, id: string) =>
    s.evidence.find((e) => e.id === id) ?? fail(notFound("Evidence"));

  route(
    "POST",
    "/evidence/:id/view",
    null,
    async ({ session, actor, params }) => {
      const item = evidenceIn(state(), params.id);
      if (session.role === "citizen" || session.role === "admin")
        throw forbidden();
      requireAny(state(), session, "evidence.view");
      if (
        item.classification === "restricted" &&
        !can(state(), session.role, "evidence.restricted")
      ) {
        await platform.commit((s) =>
          s.logEvidenceAccess(
            params.id,
            "access_denied",
            actor,
            "Role does not include evidence.restricted",
          ),
        );
        throw forbidden(
          "Restricted evidence. Your role does not permit access.",
        );
      }
      await platform.commit((s) =>
        s.logEvidenceAccess(
          params.id,
          "viewed",
          actor,
          "Viewed in evidence centre",
        ),
      );
    },
  );

  route(
    "POST",
    "/evidence/:id/denied",
    null,
    async ({ session, actor, params }) => {
      evidenceIn(state(), params.id);
      if (session.role === "citizen") throw forbidden();
      await platform.commit((s) =>
        s.logEvidenceAccess(
          params.id,
          "access_denied",
          actor,
          "Role does not include evidence.restricted",
        ),
      );
    },
  );

  route(
    "POST",
    "/evidence/:id/export",
    S.exportRequest,
    async ({ session, actor, params, body }) => {
      const item = evidenceIn(state(), params.id);
      requireAny(state(), session, "evidence.export");
      if (
        item.classification === "restricted" &&
        !can(state(), session.role, "evidence.restricted")
      )
        throw forbidden(
          "Restricted evidence. Your role does not permit access.",
        );
      if (!mfaVerified.has(session.sub))
        throw forbidden(
          "Verify your second factor before requesting an export.",
        );
      await platform.commit((s) =>
        s.logEvidenceAccess(params.id, "export_requested", actor, body.purpose),
      );
    },
  );

  /* ── Communication ── */

  route(
    "POST",
    "/incidents/:id/messages",
    S.message,
    async ({ session, actor, params, body }) => {
      const message = await platform.commit((s) => {
        const incident = incidentIn(s, params.id);
        if (body.channel === "internal") {
          if (session.role === "citizen") throw forbidden();
          requireAny(s, session, "communication.internal");
        } else {
          requireAny(s, session, "communication.citizen");
        }
        if (!canWorkIncident(s, session, incident)) throw forbidden();
        return s.sendMessage(
          params.id,
          body.channel,
          body.text,
          actor,
          displayName(session, body.channel),
        );
      });
      return message;
    },
  );

  route(
    "POST",
    "/incidents/:id/sessions",
    S.session,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        const incident = incidentIn(s, params.id);
        if (!canWorkIncident(s, session, incident)) throw forbidden();
        if (session.role !== "citizen") {
          requireAny(
            s,
            session,
            "communication.video",
            "communication.citizen",
          );
          if (incident.silent)
            throw new HttpError(
              409,
              "conflict",
              "This is a silent SOS. Use chat only.",
            );
        }
        return s.startSession(params.id, body.type, actor);
      }),
  );

  route("POST", "/sessions/:id/end", null, ({ session, actor, params }) =>
    platform.commit((s) => {
      const live =
        s.sessions.find((x) => x.id === params.id) ?? fail(notFound("Session"));
      if (!canWorkIncident(s, session, incidentIn(s, live.incidentId)))
        throw forbidden();
      s.endSession(params.id, actor);
    }),
  );

  /* ── Complaints ── */

  route(
    "POST",
    "/complaints",
    S.complaint,
    async ({ session, actor, body }) => {
      const created = await platform.commit((s) => {
        if (session.role === "citizen") {
          const anonymous = body.anonymous || body.kind === "confidential_tip";
          return s.submitComplaint(
            {
              ...body,
              anonymous,
              citizenId: anonymous ? undefined : session.sub,
              contactPreference: anonymous ? "none" : body.contactPreference,
            },
            anonymous
              ? {
                  id: "confidential",
                  name: "Confidential source",
                  role: "citizen",
                }
              : actor,
          );
        }
        requireAny(s, session, "complaint.update");
        return s.submitComplaint({ ...body, citizenId: undefined }, actor);
      });
      return created;
    },
  );

  route(
    "POST",
    "/complaints/:id/status",
    S.complaintStatus,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "complaint.update");
        if (!s.complaints.some((c) => c.id === params.id))
          throw notFound("Complaint");
        s.updateComplaintStatus(params.id, body.status, body.note, actor);
      }),
  );

  route(
    "POST",
    "/complaints/:id/information",
    S.complaintInfo,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        const complaint =
          s.complaints.find((c) => c.id === params.id) ??
          fail(notFound("Complaint"));
        if (session.role !== "citizen" || complaint.citizenId !== session.sub)
          throw forbidden();
        s.addComplaintInfo(params.id, body.note, body.documents, actor);
      }),
  );

  /* ── Journeys and trusted contacts (citizen's own) ── */

  const requireCitizen = (session: Session) =>
    citizenOf(session) ?? fail(forbidden("This belongs to the citizen app."));
  const journeyOf = (s: DemoData, session: Session, id: string) => {
    const journey =
      s.journeys.find((j) => j.id === id) ?? fail(notFound("Journey"));
    if (journey.citizenId !== session.sub) throw forbidden();
    return journey;
  };

  route("POST", "/journeys", S.journey, ({ session, body }) => {
    requireCitizen(session);
    return platform.commit((s) => {
      const own = new Set(
        s.contacts.filter((c) => c.citizenId === session.sub).map((c) => c.id),
      );
      return s.startJourney({
        ...body,
        citizenId: session.sub,
        contactIds: body.contactIds.filter((id) => own.has(id)),
      });
    });
  });

  route("POST", "/journeys/:id/check-in", null, ({ session, params }) =>
    platform.commit((s) => {
      journeyOf(s, session, params.id);
      s.journeyCheckIn(params.id);
    }),
  );

  for (const [path, status] of [
    ["complete", "completed"],
    ["stop", "stopped"],
  ] as const) {
    route("POST", `/journeys/:id/${path}`, null, ({ session, params }) =>
      platform.commit((s) => {
        journeyOf(s, session, params.id);
        s.endJourney(params.id, status);
      }),
    );
  }

  route(
    "POST",
    "/journeys/:id/help",
    S.position,
    async ({ session, actor, params, body }) => {
      const citizen = requireCitizen(session);
      const created = await platform.commit((s) => {
        journeyOf(s, session, params.id);
        s.endJourney(params.id, "help_requested");
        return s.createIncident(
          {
            source: "journey",
            categoryId: "personal_danger",
            priority: "P1",
            title: "Journey safety — help requested",
            description:
              "Citizen asked for help during a shared journey. Route and trusted contacts are attached.",
            location: journeyAlertLocation(citizen, params.id, body.position),
            citizenId: citizen.id,
            reporterName: reducedName(citizen.name),
            reporterPhoneMasked: citizen.phoneMasked,
            peopleInDanger: true,
            auto: config.demoMode,
          },
          actor,
        );
      });
      return view(session, "incidents", created);
    },
  );

  route("POST", "/contacts", S.contact, ({ session, body }) => {
    requireCitizen(session);
    return platform.commit((s) =>
      s.addContact({ ...body, citizenId: session.sub }),
    );
  });

  const ownContact = (s: DemoData, session: Session, id: string) => {
    const contact =
      s.contacts.find((c) => c.id === id) ?? fail(notFound("Contact"));
    if (contact.citizenId !== session.sub) throw forbidden();
  };

  route(
    "PATCH",
    "/contacts/:id",
    S.contact.partial(),
    ({ session, params, body }) =>
      platform.commit((s) => {
        ownContact(s, session, params.id);
        s.updateContact(params.id, body);
      }),
  );

  route("DELETE", "/contacts/:id", null, ({ session, params }) =>
    platform.commit((s) => {
      ownContact(s, session, params.id);
      s.removeContact(params.id);
    }),
  );

  /* ── Notifications ── */

  route("POST", "/notifications/read", S.ids, ({ session, body }) =>
    platform.commit((s) => s.markAllNotificationsRead(body.ids, session.sub)),
  );

  /* ── Audit ── */

  route("GET", "/audit", null, async ({ session, query }) => {
    const s = state();
    const full = can(s, session.role, "audit.view");
    if (!full) {
      // Without the audit permission a caller may only read the trail of an incident they can open.
      const incident = query.incidentId
        ? s.incidents.find((i) => i.id === query.incidentId)
        : undefined;
      if (
        !incident ||
        !canReadIncident(s, session, incident) ||
        session.role === "citizen"
      )
        throw forbidden();
    }
    return queryAudit({
      actor: query.actor,
      role: query.role,
      incidentId: query.incidentId,
      category: query.category,
      categories: full
        ? undefined
        : ["incident", "dispatch", "communication", "evidence"],
      search: query.search,
      since: query.since ? Number(query.since) : undefined,
    });
  });

  route("GET", "/audit/verify", null, ({ session }) => {
    requireAny(state(), session, "audit.view");
    return verifyAuditChain();
  });

  route("POST", "/audit", S.auditEntry, ({ session, actor, body }) => {
    if (session.role === "citizen") throw forbidden();
    return platform.commit((s) => s.recordAudit(body, actor));
  });

  /* ── Analytics and search ── */

  const SCOPE_PERMISSION: Record<string, Permission> = {
    station: "analytics.station",
    district: "analytics.district",
    state: "analytics.state",
  };

  route("GET", "/analytics/overview", null, ({ session, query }) => {
    const scope = (query.scope ?? "district") as
      | "station"
      | "district"
      | "state";
    if (!SCOPE_PERMISSION[scope]) throw invalid("Unknown scope.");
    requireAny(state(), session, SCOPE_PERMISSION[scope]);
    return analyticsOverview(scope);
  });

  route("GET", "/analytics/density", null, ({ session }) => {
    requireAny(
      state(),
      session,
      "analytics.station",
      "analytics.district",
      "analytics.state",
    );
    return DENSITY;
  });

  route("GET", "/search", null, ({ session, query }) =>
    searchPlatform(state(), query.q ?? "", session.role, session.sub),
  );

  /* ── Administration ── */

  route(
    "PUT",
    "/admin/roles/:role/permissions",
    S.rolePermission,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "admin.roles");
        const role =
          s.roles.find((r) => r.key === params.role) ?? fail(notFound("Role"));
        if (role.system) throw forbidden("System roles cannot be changed.");
        s.setRolePermission(
          params.role as RoleKey,
          body.permission as Permission,
          body.enabled,
          actor,
        );
      }),
  );

  route(
    "PUT",
    "/admin/users/:id",
    S.loose,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "admin.users");
        const user = body as unknown as Parameters<DemoStore["upsertStaff"]>[0];
        if (
          !user.name ||
          !user.role ||
          !s.roles.some((r) => r.key === user.role)
        )
          throw invalid("A user needs a name and a valid role.");
        s.upsertStaff({ ...user, id: params.id }, actor);
      }),
  );

  route(
    "POST",
    "/admin/users/:id/status",
    S.staffStatus,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "admin.users");
        if (params.id === session.sub)
          throw forbidden("You cannot change your own account status.");
        if (!s.staff.some((u) => u.id === params.id)) throw notFound("User");
        s.setStaffStatus(params.id, body.status, actor);
      }),
  );

  const pick = <T extends Record<string, unknown>>(
    body: Record<string, unknown>,
    keys: string[],
  ) =>
    Object.fromEntries(
      Object.entries(body).filter(([k]) => keys.includes(k)),
    ) as T;

  route(
    "PATCH",
    "/admin/categories/:id",
    S.loose,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "admin.configuration");
        if (!s.categories.some((c) => c.id === params.id))
          throw notFound("Category");
        s.updateCategory(
          params.id,
          pick(body, [
            "enabled",
            "citizenVisible",
            "defaultPriority",
            "agencies",
            "label",
            "short",
          ]),
          actor,
        );
      }),
  );

  route(
    "PATCH",
    "/admin/sla/:priority",
    S.loose,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "admin.configuration");
        const patch = pick<Record<string, number>>(body, [
          "acknowledgeSec",
          "dispatchSec",
          "arrivalMin",
          "resolutionMin",
        ]);
        if (Object.values(patch).some((v) => typeof v !== "number" || !(v > 0)))
          throw invalid("Targets must be positive numbers.");
        s.updateSla(params.priority as "P1", patch, actor);
      }),
  );

  route(
    "PUT",
    "/admin/escalation-rules/:id",
    S.loose,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "admin.configuration");
        const rule = body as unknown as Parameters<
          DemoStore["upsertEscalationRule"]
        >[0];
        if (
          !(rule.thresholdSec > 0) ||
          !rule.priority ||
          !rule.trigger ||
          !rule.action
        )
          throw invalid(
            "A rule needs a priority, trigger, action and a positive threshold.",
          );
        s.upsertEscalationRule({ ...rule, id: params.id }, actor);
      }),
  );

  route(
    "DELETE",
    "/admin/escalation-rules/:id",
    null,
    ({ session, actor, params }) =>
      platform.commit((s) => {
        requireAny(s, session, "admin.configuration");
        s.removeEscalationRule(params.id, actor);
      }),
  );

  route(
    "POST",
    "/admin/integrations/:id/status",
    S.integrationStatus,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "admin.integrations");
        if (!s.integrations.some((i) => i.id === params.id))
          throw notFound("Integration");
        s.setIntegrationStatus(params.id, body.status, actor);
      }),
  );

  route(
    "PATCH",
    "/admin/templates/:id",
    S.loose,
    ({ session, actor, params, body }) =>
      platform.commit((s) => {
        requireAny(s, session, "admin.configuration");
        if (!s.templates.some((t) => t.id === params.id))
          throw notFound("Template");
        s.updateTemplate(
          params.id,
          pick(body, ["enabled", "body", "name"]),
          actor,
        );
      }),
  );

  /* ── Presenter controls (demo mode only) ── */

  route("POST", "/demo/reset", null, async () => {
    demoOnly();
    mfaVerified.clear();
    await platform.reset();
  });

  route("POST", "/demo/advance", S.advance, async ({ session, body }) => {
    demoOnly();
    const target = pickAdvanceTarget(state(), body.personaId ?? session.sub);
    if (!target) return { incidentId: null };
    await platform.commit((s) => s.advanceIncident(target.id));
    return { incidentId: target.id };
  });

  route("PUT", "/demo/simulation", S.paused, async ({ body }) => {
    demoOnly();
    await platform.setSimulationPaused(body.paused);
  });

  route(
    "POST",
    "/demo/request-assignment",
    S.requestAssignment,
    async ({ session, body }) => {
      demoOnly();
      if (session.role === "officer" && session.unitId !== body.unitId)
        throw forbidden(
          "You can only request an assignment for your own unit.",
        );
      const incidentId = await platform.commit((s) => {
        const incident = nearestUnassignedIncident(s, body.unitId);
        if (!incident) return null;
        s.assignUnit(incident.id, body.unitId, DEMO_OPERATOR);
        return incident.id;
      });
      return { incidentId };
    },
  );
}

function fail(error: Error): never {
  throw error;
}
