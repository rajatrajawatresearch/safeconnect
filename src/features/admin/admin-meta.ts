import type { Tone } from "@/config/incident";
import { PERMISSIONS } from "@/data/demo/admin";
import { districtById, stationById } from "@/data/demo/geo";
import type {
  AgencyKey,
  EscalationRule,
  Integration,
  NotificationTemplate,
  OrgLevel,
  Permission,
  PermissionDefinition,
  PermissionGroup,
  Role,
  RoleKey,
  StaffUser,
} from "@/types";

/* ───────────────────────── Roles and permissions ───────────────────────── */

/** The order the role builder lists permission groups in. */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  "Incidents",
  "Dispatch",
  "Communication",
  "Evidence",
  "Complaints",
  "Analytics",
  "Administration",
];

export const PERMISSIONS_BY_GROUP: {
  group: PermissionGroup;
  permissions: PermissionDefinition[];
}[] = PERMISSION_GROUPS.map((group) => ({
  group,
  permissions: PERMISSIONS.filter((p) => p.group === group),
}));

export const SENSITIVE_PERMISSIONS: Permission[] = PERMISSIONS.filter(
  (p) => p.sensitive,
).map((p) => p.key);

export const SCOPE_META: Record<
  Role["scope"],
  { label: string; description: string }
> = {
  self: { label: "Own records", description: "Only records they created." },
  assigned: {
    label: "Assigned work",
    description: "Only incidents assigned to them or their unit.",
  },
  station: {
    label: "Station",
    description: "Records within their police station.",
  },
  district: {
    label: "District",
    description: "Records within their district or commissionerate.",
  },
  state: { label: "State", description: "Records across every district." },
  platform: {
    label: "Platform",
    description: "Platform configuration. No operational records.",
  },
};

/** Staff roles an administrator can assign. Citizens register through the app, not the directory. */
export const isStaffRole = (key: RoleKey) => key !== "citizen";

/**
 * Plain statements of what a role is not permitted to do, derived from the permissions it lacks.
 * Shown in the role builder so least privilege is readable without scanning every checkbox.
 */
export function deniedCapabilities(permissions: Permission[]): string[] {
  const has = (p: Permission) => permissions.includes(p);
  const out: string[] = [];

  const readsIncidents =
    has("incident.read.assigned") ||
    has("incident.read.station") ||
    has("incident.read.all");
  if (!readsIncidents) out.push("Open incidents");
  else if (!has("incident.read.all") && !has("incident.read.station"))
    out.push("See incidents not assigned to them");
  if (!has("incident.dispatch") && !has("unit.assign"))
    out.push("Dispatch or assign units");
  if (readsIncidents && !has("incident.resolve"))
    out.push("Resolve or close incidents");
  if (!has("communication.citizen")) out.push("Message citizens");
  if (!has("communication.video")) out.push("Start voice or video sessions");
  if (!has("evidence.view")) out.push("View evidence");
  else {
    if (!has("evidence.restricted")) out.push("Open restricted evidence");
    if (!has("evidence.export")) out.push("Request evidence export");
  }
  if (!has("complaint.view")) out.push("See complaints");
  else if (!has("complaint.update")) out.push("Update complaints");
  if (
    !has("analytics.station") &&
    !has("analytics.district") &&
    !has("analytics.state")
  )
    out.push("Open analytics");
  if (!has("audit.view")) out.push("Read the audit log");
  if (!has("admin.users")) out.push("Manage users");
  if (!has("admin.roles")) out.push("Manage roles");
  if (!has("admin.configuration")) out.push("Change policy or configuration");
  if (!has("admin.integrations")) out.push("Manage integrations");
  return out;
}

/* ───────────────────────── Staff directory ───────────────────────── */

export const STAFF_STATUS_META: Record<
  StaffUser["status"],
  { label: string; tone: Tone }
> = {
  active: { label: "Active", tone: "resolved" },
  invited: { label: "Invited", tone: "normal" },
  suspended: { label: "Suspended", tone: "neutral" },
};

export const STAFF_STATUSES: StaffUser["status"][] = [
  "active",
  "invited",
  "suspended",
];

/** Where a staff member is posted: their station, else their district, else the level their role works at. */
export function postingOf(
  user: Pick<StaffUser, "stationId" | "districtId">,
  role?: Role,
): { label: string; detail?: string } {
  const station = user.stationId ? stationById(user.stationId) : undefined;
  if (station)
    return {
      label: station.name,
      detail: districtById(station.districtId)?.name,
    };
  const district = user.districtId ? districtById(user.districtId) : undefined;
  if (district)
    return {
      label: district.name,
      detail:
        district.kind === "commissionerate" ? "Commissionerate" : "District",
    };
  if (role?.scope === "state") return { label: "State-wide" };
  if (role?.scope === "platform") return { label: "Platform" };
  return { label: "Not posted" };
}

/* ───────────────────────── Categories ───────────────────────── */

export const AGENCY_LABEL: Record<AgencyKey, string> = {
  police: "Police",
  ambulance: "Ambulance",
  fire: "Fire",
  disaster: "Disaster management",
  cyber: "Cybercrime",
  traffic: "Traffic",
};

/* ───────────────────────── Escalation policy ───────────────────────── */

export const TRIGGER_META: Record<
  EscalationRule["trigger"],
  { label: string; description: string }
> = {
  no_acknowledgement: {
    label: "No acknowledgement",
    description: "Counted from creation while no operator has opened it.",
  },
  no_assignment: {
    label: "No assignment",
    description: "Counted from creation while no unit is assigned.",
  },
  no_progress: {
    label: "No response progress",
    description: "Counted from assignment while the unit has not set off.",
  },
  no_arrival: {
    label: "No arrival on scene",
    description: "Counted from departure while the unit is still en route.",
  },
};

export const TRIGGERS = Object.keys(
  TRIGGER_META,
) as EscalationRule["trigger"][];

/** `level` mirrors the level the demo simulator raises for each action. */
export const ACTION_META: Record<
  EscalationRule["action"],
  { label: string; level: 1 | 2 | 3 }
> = {
  alert_supervisor: { label: "Alert supervisor", level: 1 },
  escalate_dispatcher: { label: "Escalate to dispatcher", level: 1 },
  notify_command: { label: "Notify district command", level: 2 },
  notify_state: { label: "Notify state command", level: 3 },
};

export const ACTIONS = Object.keys(ACTION_META) as EscalationRule["action"][];

/* ───────────────────────── Integrations ───────────────────────── */

export const INTEGRATION_STATUS_META: Record<
  Integration["status"],
  { label: string; tone: Tone; description: string }
> = {
  placeholder: {
    label: "Placeholder",
    tone: "medium",
    description: "Interface defined. No endpoint is configured.",
  },
  sandbox: {
    label: "Sandbox",
    tone: "normal",
    description: "Calls go to a simulated endpoint.",
  },
  disabled: {
    label: "Disabled",
    tone: "neutral",
    description: "Switched off. No calls are attempted.",
  },
};

export const INTEGRATION_STATUSES: Integration["status"][] = [
  "placeholder",
  "sandbox",
  "disabled",
];

export const DIRECTION_LABEL: Record<Integration["direction"], string> = {
  inbound: "Inbound",
  outbound: "Outbound",
  bidirectional: "Two-way",
};

/* ───────────────────────── Templates ───────────────────────── */

export const CHANNEL_LABEL: Record<NotificationTemplate["channel"], string> = {
  push: "Push",
  sms: "SMS",
  in_app: "In-app",
};

/** `{unit}`, `{eta}` … in the order they first appear. */
export function placeholdersIn(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/\{(\w+)\}/g)) {
    if (!found.includes(match[0])) found.push(match[0]);
  }
  return found;
}

/* ───────────────────────── Organisation ───────────────────────── */

export const ORG_LEVEL_LABEL: Record<OrgLevel | "officer", string> = {
  platform: "Platform",
  state: "State",
  commissionerate: "Commissionerate",
  district: "District",
  division: "Division",
  station: "Police station",
  unit: "Unit",
  officer: "Officer",
};

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;
