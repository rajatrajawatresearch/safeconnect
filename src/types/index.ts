/**
 * Domain model for the public-safety platform.
 * Every timestamp is epoch milliseconds so records serialise cleanly over any transport.
 */

export type ID = string;
export type Timestamp = number;

/* ───────────────────────── Identity, roles, permissions ───────────────────────── */

export type RoleKey =
  | "citizen"
  | "operator"
  | "dispatcher"
  | "officer"
  | "supervisor"
  | "command"
  | "state_command"
  | "admin";

export type Permission =
  | "incident.read.assigned"
  | "incident.read.station"
  | "incident.read.all"
  | "incident.create"
  | "incident.classify"
  | "incident.note"
  | "incident.dispatch"
  | "incident.escalate"
  | "incident.transfer"
  | "incident.resolve"
  | "unit.view"
  | "unit.assign"
  | "unit.status.update"
  | "communication.citizen"
  | "communication.internal"
  | "communication.video"
  | "evidence.view"
  | "evidence.upload"
  | "evidence.export"
  | "evidence.restricted"
  | "complaint.view"
  | "complaint.update"
  | "analytics.station"
  | "analytics.district"
  | "analytics.state"
  | "audit.view"
  | "admin.users"
  | "admin.roles"
  | "admin.organization"
  | "admin.configuration"
  | "admin.integrations";

export type PermissionGroup =
  | "Incidents"
  | "Dispatch"
  | "Communication"
  | "Evidence"
  | "Complaints"
  | "Analytics"
  | "Administration";

export interface PermissionDefinition {
  key: Permission;
  group: PermissionGroup;
  label: string;
  description: string;
  sensitive?: boolean;
}

export interface Role {
  key: RoleKey;
  name: string;
  description: string;
  scope: "self" | "assigned" | "station" | "district" | "state" | "platform";
  permissions: Permission[];
  system?: boolean;
}

export interface User {
  id: ID;
  name: string;
  role: RoleKey;
  initials: string;
  phoneMasked?: string;
  email?: string;
}

export interface Citizen extends User {
  role: "citizen";
  city: string;
  area: string;
  home: LatLng;
  preferredLanguage: LanguageCode;
  verified: boolean;
}

export interface StaffUser extends User {
  badgeNo: string;
  rank: string;
  title: string;
  stationId?: ID;
  districtId?: ID;
  status: "active" | "suspended" | "invited";
  mfaEnabled: boolean;
  lastActiveAt: Timestamp;
  shift?: "A" | "B" | "C";
}

/** A demo persona is one of the seeded users the role switcher can impersonate. */
export interface Persona {
  id: ID;
  role: RoleKey;
  name: string;
  shortName: string;
  title: string;
  initials: string;
  home: string;
  description: string;
  unitId?: ID;
  stationId?: ID;
  districtId?: ID;
}

/** Who performed an action. Passed to every service command so the audit trail is complete. */
export interface ActorRef {
  id: ID;
  name: string;
  role: RoleKey;
}

/* ───────────────────────── Organisation ───────────────────────── */

export type OrgLevel =
  | "platform"
  | "state"
  | "commissionerate"
  | "district"
  | "division"
  | "station"
  | "unit";

export interface Organization {
  id: ID;
  parentId: ID | null;
  level: OrgLevel;
  name: string;
  code: string;
  headTitle?: string;
  headName?: string;
}

export interface District {
  id: ID;
  name: string;
  kind: "commissionerate" | "district";
  center: LatLng;
  stations: number;
  population: string;
}

export interface Station {
  id: ID;
  districtId: ID;
  name: string;
  code: string;
  area: string;
  position: LatLng;
  inChargeName: string;
  phoneMasked: string;
}

export type FacilityKind = "hospital" | "fire_station";

export interface Facility {
  id: ID;
  kind: FacilityKind;
  name: string;
  area: string;
  position: LatLng;
}

/* ───────────────────────── Geography ───────────────────────── */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Location extends LatLng {
  address: string;
  area: string;
  landmark?: string;
  districtId: ID;
  stationId: ID;
  /** How the position was obtained. Citizen locations exist only from an explicit emergency or reporting action. */
  source:
    | "device_emergency"
    | "citizen_entered"
    | "operator_entered"
    | "unit_reported";
  accuracyM?: number;
}

/* ───────────────────────── Units & officers ───────────────────────── */

export type UnitStatus =
  | "available"
  | "assigned"
  | "en_route"
  | "on_scene"
  | "unavailable"
  | "off_duty";

export type VehicleType =
  | "PCR van"
  | "Patrol SUV"
  | "Motorcycle"
  | "Women's help unit"
  | "Traffic interceptor";

export interface Officer {
  id: ID;
  name: string;
  rank: string;
  badgeNo: string;
  stationId: ID;
  unitId?: ID;
  onDuty: boolean;
  phoneMasked: string;
  initials: string;
}

export interface Unit {
  id: ID;
  callSign: string;
  officerId: ID;
  crew: number;
  vehicle: VehicleType;
  vehicleNo: string;
  stationId: ID;
  status: UnitStatus;
  /** Last position the unit reported while on authorised duty. */
  position: LatLng;
  positionAt: Timestamp;
  currentIncidentId: ID | null;
  shiftEndsAt: Timestamp;
  /** Where the unit set off from for the current run, used to animate the approach. */
  routeFrom?: LatLng;
}

/* ───────────────────────── Incidents ───────────────────────── */

export type IncidentPriority = "P1" | "P2" | "P3" | "P4";

export type IncidentStatus =
  | "new"
  | "acknowledged"
  | "assigned"
  | "en_route"
  | "on_scene"
  | "resolved"
  | "closed"
  | "cancelled";

export type IncidentSource =
  | "sos"
  | "silent_sos"
  | "report"
  | "call"
  | "tip"
  | "journey";

export type CategoryGroup =
  | "immediate_safety"
  | "public_safety"
  | "traffic"
  | "crime_intel"
  | "cyber"
  | "emergency_assist";

export interface IncidentCategory {
  id: ID;
  group: CategoryGroup;
  label: string;
  short: string;
  icon: string;
  defaultPriority: IncidentPriority;
  enabled: boolean;
  citizenVisible: boolean;
  agencies: AgencyKey[];
}

export type AgencyKey =
  | "police"
  | "ambulance"
  | "fire"
  | "disaster"
  | "cyber"
  | "traffic";

/** Officer-side progress, finer grained than the incident status the control room tracks. */
export type OfficerStage =
  | "assigned"
  | "accepted"
  | "en_route"
  | "on_scene"
  | "assistance_requested"
  | "situation_controlled"
  | "report_pending"
  | "completed";

export interface Assignment {
  id: ID;
  incidentId: ID;
  unitId: ID;
  assignedBy: ActorRef;
  assignedAt: Timestamp;
  response: "pending" | "accepted" | "rejected";
  respondedAt?: Timestamp;
  rejectReason?: string;
  stage: OfficerStage;
  role: "primary" | "backup";
  distanceKm: number;
  etaMin: number;
}

export type TimelineKind =
  | "created"
  | "acknowledged"
  | "triage"
  | "assigned"
  | "accepted"
  | "rejected"
  | "en_route"
  | "arrived"
  | "communication"
  | "evidence"
  | "note"
  | "backup"
  | "escalated"
  | "transferred"
  | "stage"
  | "resolved"
  | "cancelled"
  | "handoff"
  | "system";

export interface TimelineEvent {
  id: ID;
  at: Timestamp;
  kind: TimelineKind;
  title: string;
  detail?: string;
  actor?: string;
  /** Whether the citizen who raised the incident may see this entry. */
  citizenVisible: boolean;
}

export interface IncidentNote {
  id: ID;
  at: Timestamp;
  author: ActorRef;
  text: string;
}

/** Advisory output only. An operator must confirm before any of it takes effect. */
export interface AiTriage {
  suggestedPriority: IncidentPriority;
  suggestedCategoryId: ID;
  reason: string;
  summary: string;
  missingInfo: string[];
  duplicateOfId?: ID;
  translationOf?: { language: string; original: string };
  confirmedBy?: ActorRef;
  confirmedAt?: Timestamp;
}

export interface CaseHandoff {
  reportStatus: "not_started" | "draft" | "submitted" | "reviewed";
  reportDraft?: string;
  complaintId?: ID;
  evidencePackageRef?: string;
  reviewedBy?: string;
}

export interface Incident {
  id: ID;
  source: IncidentSource;
  categoryId: ID;
  priority: IncidentPriority;
  status: IncidentStatus;
  title: string;
  description: string;
  location: Location;
  citizenId?: ID;
  /** Display name already reduced to what staff roles may see. */
  reporterName: string;
  reporterPhoneMasked?: string;
  anonymous: boolean;
  peopleInDanger?: boolean;
  createdAt: Timestamp;
  acknowledgedAt?: Timestamp;
  assignedAt?: Timestamp;
  enRouteAt?: Timestamp;
  arrivedAt?: Timestamp;
  resolvedAt?: Timestamp;
  /** Expected arrival of the primary unit. Remaining ETA is derived from the clock, not stored. */
  etaAt?: Timestamp;
  operatorId?: ID;
  operatorName?: string;
  assignments: Assignment[];
  backupRequested: boolean;
  escalationLevel: 0 | 1 | 2 | 3;
  timeline: TimelineEvent[];
  notes: IncidentNote[];
  evidenceIds: ID[];
  ai?: AiTriage;
  handoff: CaseHandoff;
  resolution?: string;
  cancelReason?: string;
  /** Demo only: lets the simulator advance this incident when nobody acts on it. */
  auto?: boolean;
  /** Offline-first: whether the record has reached the control room yet. */
  sync: "synced" | "queued";
  silent?: boolean;
}

/* ───────────────────────── Communication ───────────────────────── */

export type MessageChannel = "citizen" | "internal";

export interface Message {
  id: ID;
  incidentId: ID;
  channel: MessageChannel;
  senderRole: RoleKey | "system";
  senderName: string;
  text: string;
  at: Timestamp;
  translated?: { language: string; text: string };
}

export type SessionType = "voice" | "video";

export interface CommunicationSession {
  id: ID;
  incidentId: ID;
  type: SessionType;
  status: "connecting" | "live" | "ended";
  startedBy: ActorRef;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  quality: "excellent" | "good" | "weak";
  participants: { name: string; role: RoleKey }[];
}

/* ───────────────────────── Evidence ───────────────────────── */

export type EvidenceType = "photo" | "video" | "audio" | "document";
export type EvidenceClassification = "standard" | "sensitive" | "restricted";
export type EvidenceIntegrity = "verified" | "pending" | "flagged";

export interface EvidenceAccess {
  id: ID;
  at: Timestamp;
  actorName: string;
  actorRole: RoleKey | "system";
  action:
    | "uploaded"
    | "integrity_recorded"
    | "linked"
    | "viewed"
    | "export_requested"
    | "export_approved"
    | "access_denied";
  detail?: string;
}

export interface Evidence {
  id: ID;
  incidentId: ID;
  type: EvidenceType;
  title: string;
  fileName: string;
  mime: string;
  sizeBytes: number;
  durationSec?: number;
  source: "citizen" | "officer" | "operator";
  uploadedByName: string;
  uploadedByRole: RoleKey;
  capturedAt: Timestamp;
  submittedAt: Timestamp;
  integrity: EvidenceIntegrity;
  /** Demo value. A real deployment records a cryptographic digest at ingestion. */
  hash: string;
  hashAlgorithm: "SHA-256 (demo)";
  classification: EvidenceClassification;
  retention: string;
  device?: string;
  access: EvidenceAccess[];
}

/* ───────────────────────── Complaints ───────────────────────── */

export type ComplaintStatus =
  | "submitted"
  | "received"
  | "under_review"
  | "assigned"
  | "in_progress"
  | "info_required"
  | "resolved"
  | "closed";

export type ComplaintKind = "report" | "emergency" | "confidential_tip";

export interface ComplaintUpdate {
  id: ID;
  at: Timestamp;
  status: ComplaintStatus;
  note: string;
  by: string;
}

export interface ComplaintDocument {
  id: ID;
  name: string;
  kind: EvidenceType;
  sizeBytes: number;
  addedAt: Timestamp;
}

export interface Complaint {
  id: ID;
  kind: ComplaintKind;
  citizenId?: ID;
  anonymous: boolean;
  categoryId: ID;
  title: string;
  description: string;
  stationId: ID;
  department: string;
  location: Pick<Location, "address" | "area">;
  occurredAt: Timestamp;
  submittedAt: Timestamp;
  status: ComplaintStatus;
  assignedAuthority?: string;
  contactPreference: "call" | "chat" | "none";
  updates: ComplaintUpdate[];
  documents: ComplaintDocument[];
  linkedIncidentId?: ID;
}

/* ───────────────────────── Journey safety & contacts ───────────────────────── */

export interface EmergencyContact {
  id: ID;
  citizenId: ID;
  name: string;
  relation:
    | "Mother"
    | "Father"
    | "Partner"
    | "Friend"
    | "Guardian"
    | "Sibling"
    | "Other";
  phoneMasked: string;
  notifyOnSos: boolean;
  notifyOnJourney: boolean;
  shareLocation: boolean;
}

export type JourneyStatus =
  | "active"
  | "completed"
  | "help_requested"
  | "stopped";

export interface Journey {
  id: ID;
  citizenId: ID;
  from: { label: string } & LatLng;
  destination: { label: string } & LatLng;
  startedAt: Timestamp;
  expectedArrivalAt: Timestamp;
  checkIntervalMin: number;
  lastCheckInAt: Timestamp;
  contactIds: ID[];
  status: JourneyStatus;
  endedAt?: Timestamp;
}

/* ───────────────────────── Notifications, escalation, audit ───────────────────────── */

export type NotificationKind =
  | "critical_incident"
  | "incident"
  | "assignment"
  | "backup"
  | "escalation"
  | "evidence"
  | "complaint"
  | "sos"
  | "journey"
  | "system";

export interface AppNotification {
  id: ID;
  kind: NotificationKind;
  title: string;
  body?: string;
  at: Timestamp;
  /** Roles that should see this. Citizen notifications are also scoped by citizenId. */
  audience: RoleKey[];
  citizenId?: ID;
  unitId?: ID;
  incidentId?: ID;
  href?: string;
  tone: "critical" | "high" | "info" | "success";
  readBy: ID[];
}

export interface Escalation {
  id: ID;
  incidentId: ID;
  level: 1 | 2 | 3;
  reason: string;
  ruleId?: ID;
  raisedBy: string;
  raisedAt: Timestamp;
  status: "open" | "acknowledged" | "resolved";
  acknowledgedBy?: string;
}

export interface EscalationRule {
  id: ID;
  priority: IncidentPriority;
  trigger:
    | "no_acknowledgement"
    | "no_assignment"
    | "no_progress"
    | "no_arrival";
  thresholdSec: number;
  action:
    | "alert_supervisor"
    | "escalate_dispatcher"
    | "notify_command"
    | "notify_state";
  enabled: boolean;
}

export interface SlaPolicy {
  priority: IncidentPriority;
  label: string;
  definition: string;
  acknowledgeSec: number;
  dispatchSec: number;
  arrivalMin: number;
  resolutionMin: number;
}

export interface AuditEvent {
  id: ID;
  at: Timestamp;
  actorName: string;
  actorRole: RoleKey | "system";
  action: string;
  category:
    | "incident"
    | "dispatch"
    | "communication"
    | "evidence"
    | "complaint"
    | "access"
    | "admin"
    | "system";
  incidentId?: ID;
  entityId?: ID;
  detail: string;
  /** Demo chain value showing how tamper-evident sequencing would read. */
  chainHash: string;
}

/* ───────────────────────── Integrations & configuration ───────────────────────── */

export interface Integration {
  id: ID;
  name: string;
  agency: string;
  adapter: string;
  description: string;
  direction: "inbound" | "outbound" | "bidirectional";
  status: "placeholder" | "sandbox" | "disabled";
  legalNote?: string;
}

export interface NotificationTemplate {
  id: ID;
  name: string;
  channel: "push" | "sms" | "in_app";
  audience: RoleKey;
  body: Record<LanguageCode, string>;
  enabled: boolean;
}

export type LanguageCode = "en" | "gu" | "hi";

/* ───────────────────────── Analytics ───────────────────────── */

export interface ResponseMetric {
  label: string;
  /** Seconds unless the consumer states otherwise. */
  value: number;
  target?: number;
  deltaPct?: number;
}

export interface HourlyVolumePoint {
  hour: string;
  incidents: number;
  critical: number;
}

export interface TrendPoint {
  day: string;
  responseMin: number;
  targetMin: number;
  resolved: number;
  opened: number;
  resolutionMin: number;
}

export interface CategoryShare {
  category: string;
  count: number;
}

export interface DistrictSummary {
  districtId: ID;
  name: string;
  center: LatLng;
  active: number;
  critical: number;
  resolvedToday: number;
  avgResponseMin: number;
  unitsAvailable: number;
  unitsTotal: number;
  slaPct: number;
  escalations: number;
}

export interface DensityCell {
  id: ID;
  area: string;
  center: LatLng;
  /** Count of historical incidents in the window. An aggregate of places, never of people. */
  count: number;
}

export interface AnalyticsOverview {
  hourly: HourlyVolumePoint[];
  trend: TrendPoint[];
  categories: CategoryShare[];
  districts: DistrictSummary[];
  resource: {
    label: string;
    available: number;
    engaged: number;
    offDuty: number;
  }[];
  sla: { stage: string; pct: number; targetLabel: string }[];
  unitUtilisation: { unit: string; pct: number }[];
  escalationRatePct: number;
  activeVsResolved: { label: string; active: number; resolved: number }[];
}

export type Connectivity = "online" | "weak" | "offline";
