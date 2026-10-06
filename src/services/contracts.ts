/**
 * Service contracts. UI code depends on these interfaces only.
 *
 * The prototype ships mock implementations (`services/mock`) that operate on the in-browser demo
 * store. A production build supplies HTTP/WebSocket implementations with the same signatures from
 * `services/index.ts`; no component needs to change.
 *
 * Reads that must stay live (queues, maps, timers) come from the realtime store, which in production
 * is fed by a WebSocket/SSE stream. Commands and one-off queries go through these services.
 */
import type {
  AddEvidenceInput,
  CancelKind,
  CreateIncidentInput,
  StartJourneyInput,
  SubmitComplaintInput,
} from "@/domain/platform-store";
import type {
  ActorRef,
  AnalyticsOverview,
  AuditEvent,
  Citizen,
  CommunicationSession,
  Complaint,
  ComplaintStatus,
  DensityCell,
  EmergencyContact,
  EscalationRule,
  Evidence,
  Incident,
  IncidentCategory,
  IncidentPriority,
  Integration,
  Journey,
  LatLng,
  Location,
  Message,
  MessageChannel,
  NotificationTemplate,
  OfficerStage,
  Permission,
  Persona,
  RoleKey,
  SessionType,
  SlaPolicy,
  StaffUser,
  Unit,
  UnitStatus,
} from "@/types";

export type ServiceErrorCode =
  | "offline"
  | "forbidden"
  | "not_found"
  | "invalid";

export class ServiceError extends Error {
  constructor(
    public code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export interface IncidentService {
  create(input: CreateIncidentInput, actor: ActorRef): Promise<Incident>;
  acknowledge(id: string, actor: ActorRef): Promise<void>;
  confirmTriage(
    id: string,
    patch: { priority: IncidentPriority; categoryId: string },
    actor: ActorRef,
  ): Promise<void>;
  addNote(id: string, text: string, actor: ActorRef): Promise<void>;
  escalate(
    id: string,
    level: 1 | 2 | 3,
    reason: string,
    actor: ActorRef,
  ): Promise<void>;
  setEscalationStatus(
    escalationId: string,
    status: "acknowledged" | "resolved",
    actor: ActorRef,
  ): Promise<void>;
  transfer(id: string, stationId: string, actor: ActorRef): Promise<void>;
  resolve(id: string, resolution: string, actor: ActorRef): Promise<void>;
  close(id: string, actor: ActorRef): Promise<void>;
}

export interface SosTriggerInput {
  citizen: Citizen;
  silent?: boolean;
  /** Defaults to "personal_danger". Quick actions pass police_help, medical, fire, woman_safety, child_safety. */
  categoryId?: string;
  location?: Location;
  note?: string;
}

export interface SOSService {
  /** Works offline: the request is queued locally and delivered when the connection returns. */
  trigger(input: SosTriggerInput): Promise<Incident>;
  cancel(
    incidentId: string,
    kind: CancelKind,
    reason: string,
    actor: ActorRef,
  ): Promise<void>;
}

export interface UnitRecommendation {
  unit: Unit;
  distanceKm: number;
  etaMin: number;
  sameStation: boolean;
}

export interface DispatchService {
  /** Available units ranked by road distance to the incident. Advisory; the dispatcher chooses. */
  recommendUnits(incidentId: string): Promise<UnitRecommendation[]>;
  assignUnit(
    incidentId: string,
    unitId: string,
    actor: ActorRef,
  ): Promise<void>;
  releaseUnit(
    incidentId: string,
    unitId: string,
    actor: ActorRef,
    reason?: string,
  ): Promise<void>;
  requestBackup(
    incidentId: string,
    actor: ActorRef,
    note?: string,
  ): Promise<void>;
}

export interface UnitService {
  setStatus(unitId: string, status: UnitStatus, actor: ActorRef): Promise<void>;
  /** Accepting also starts the run: the unit goes en route and an ETA is set. */
  acceptAssignment(
    incidentId: string,
    unitId: string,
    actor: ActorRef,
  ): Promise<void>;
  rejectAssignment(
    incidentId: string,
    unitId: string,
    reason: string,
    actor: ActorRef,
  ): Promise<void>;
  markArrived(
    incidentId: string,
    unitId: string,
    actor: ActorRef,
  ): Promise<void>;
  updateStage(
    incidentId: string,
    unitId: string,
    stage: OfficerStage,
    actor: ActorRef,
  ): Promise<void>;
  /** Officer closes the response on scene; the incident resolves and a report becomes due. */
  completeResponse(
    incidentId: string,
    unitId: string,
    resolution: string,
    actor: ActorRef,
  ): Promise<void>;
  submitReport(
    incidentId: string,
    unitId: string,
    report: string,
    actor: ActorRef,
  ): Promise<void>;
}

export interface EvidenceService {
  /** The original is stored untouched; a digest is recorded and every later access is logged. */
  upload(input: AddEvidenceInput, actor: ActorRef): Promise<Evidence>;
  logView(evidenceId: string, actor: ActorRef): Promise<void>;
  logDenied(evidenceId: string, actor: ActorRef): Promise<void>;
  requestExport(
    evidenceId: string,
    purpose: string,
    actor: ActorRef,
  ): Promise<void>;
}

/**
 * Media transport seam. The mock never touches the camera or microphone.
 * A WebRTC implementation provides the same methods backed by RTCPeerConnection and a signalling channel.
 */
export interface RtcTransport {
  connect(
    sessionId: string,
  ): Promise<{ quality: CommunicationSession["quality"] }>;
  setMuted(muted: boolean): void;
  setCameraEnabled(enabled: boolean): void;
  switchCamera(): void;
  disconnect(): void;
}

export interface CommunicationService {
  sendMessage(
    incidentId: string,
    channel: MessageChannel,
    text: string,
    actor: ActorRef,
    displayName?: string,
  ): Promise<Message>;
  startSession(
    incidentId: string,
    type: SessionType,
    actor: ActorRef,
  ): Promise<CommunicationSession>;
  endSession(sessionId: string, actor: ActorRef): Promise<void>;
  createTransport(): RtcTransport;
}

export interface ComplaintService {
  submit(input: SubmitComplaintInput, actor: ActorRef): Promise<Complaint>;
  updateStatus(
    id: string,
    status: ComplaintStatus,
    note: string,
    actor: ActorRef,
  ): Promise<void>;
  addInformation(
    id: string,
    note: string,
    documents: SubmitComplaintInput["documents"],
    actor: ActorRef,
  ): Promise<void>;
}

export interface JourneyService {
  start(input: StartJourneyInput): Promise<Journey>;
  checkIn(journeyId: string): Promise<void>;
  complete(journeyId: string): Promise<void>;
  stop(journeyId: string): Promise<void>;
  /** Raises a journey-safety incident at the citizen's last shared position. */
  requestHelp(
    journeyId: string,
    citizen: Citizen,
    position: LatLng,
  ): Promise<Incident>;
}

export interface ContactService {
  add(contact: Omit<EmergencyContact, "id">): Promise<void>;
  update(id: string, patch: Partial<EmergencyContact>): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface NotificationService {
  markRead(id: string, userId: string): Promise<void>;
  markAllRead(ids: string[], userId: string): Promise<void>;
}

export interface AuditQuery {
  actor?: string;
  role?: RoleKey | "system" | "all";
  incidentId?: string;
  category?: AuditEvent["category"] | "all";
  search?: string;
  /** Epoch ms lower bound. */
  since?: number;
}

export interface AuditService {
  query(query: AuditQuery): Promise<AuditEvent[]>;
  record(
    entry: Pick<AuditEvent, "action" | "category" | "detail"> & {
      incidentId?: string;
      entityId?: string;
    },
    actor: ActorRef,
  ): Promise<void>;
}

export interface SessionInfo {
  device: string;
  startedAt: number;
  expiresAt: number;
  mfaVerified: boolean;
  lastIp: string;
}

export interface AuthService {
  listPersonas(): Promise<Persona[]>;
  /** Demo second factor: any six digits pass. A real deployment verifies against an authenticator. */
  verifyMfa(code: string): Promise<boolean>;
  getSession(personaId: string): Promise<SessionInfo>;
  extendSession(personaId: string): Promise<SessionInfo>;
}

export type AnalyticsScope = "station" | "district" | "state";

export interface AnalyticsService {
  getOverview(scope: AnalyticsScope): Promise<AnalyticsOverview>;
  /** Historical incident density by place. An aggregate, never a prediction about people. */
  getDensity(): Promise<DensityCell[]>;
}

export interface SearchResult {
  group:
    | "Incidents"
    | "Complaints"
    | "Units"
    | "Officers"
    | "Stations"
    | "Citizens";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchService {
  /** Results are filtered by what the role may see; citizen details appear only for roles with incident access. */
  search(query: string, role: RoleKey): Promise<SearchResult[]>;
}

export interface AdminService {
  setRolePermission(
    role: RoleKey,
    permission: Permission,
    enabled: boolean,
    actor: ActorRef,
  ): Promise<void>;
  upsertUser(user: StaffUser, actor: ActorRef): Promise<void>;
  setUserStatus(
    id: string,
    status: StaffUser["status"],
    actor: ActorRef,
  ): Promise<void>;
  updateCategory(
    id: string,
    patch: Partial<IncidentCategory>,
    actor: ActorRef,
  ): Promise<void>;
  updateSla(
    priority: IncidentPriority,
    patch: Partial<SlaPolicy>,
    actor: ActorRef,
  ): Promise<void>;
  upsertEscalationRule(rule: EscalationRule, actor: ActorRef): Promise<void>;
  removeEscalationRule(id: string, actor: ActorRef): Promise<void>;
  setIntegrationStatus(
    id: string,
    status: Integration["status"],
    actor: ActorRef,
  ): Promise<void>;
  updateTemplate(
    id: string,
    patch: Partial<NotificationTemplate>,
    actor: ActorRef,
  ): Promise<void>;
}

/** Presenter controls for the demonstration environment. A production deployment does not expose these. */
export interface DemoService {
  /** Restores the starting dataset for everyone. */
  reset(): Promise<void>;
  /** Moves the most relevant scripted incident one step along. Resolves to its id, or `null` if there was none. */
  advance(personaId: string): Promise<string | null>;
  setSimulationPaused(paused: boolean): Promise<void>;
  /** Field demo: gives this unit the nearest open, unassigned incident. Resolves to its id, or `null`. */
  requestAssignment(unitId: string): Promise<string | null>;
}

/** Outbound seam to another agency's system. Every adapter in the prototype is a placeholder. */
export interface AgencyAdapter {
  id: string;
  notify(
    incident: Incident,
  ): Promise<{ accepted: boolean; reference?: string }>;
}

export interface Services {
  incidents: IncidentService;
  sos: SOSService;
  dispatch: DispatchService;
  units: UnitService;
  evidence: EvidenceService;
  communication: CommunicationService;
  complaints: ComplaintService;
  journeys: JourneyService;
  contacts: ContactService;
  notifications: NotificationService;
  audit: AuditService;
  auth: AuthService;
  analytics: AnalyticsService;
  search: SearchService;
  admin: AdminService;
  demo: DemoService;
}
