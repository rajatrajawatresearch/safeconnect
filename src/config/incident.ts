import type {
  CategoryGroup,
  ComplaintStatus,
  EvidenceClassification,
  EvidenceIntegrity,
  IncidentPriority,
  IncidentSource,
  IncidentStatus,
  OfficerStage,
  UnitStatus,
} from "@/types";

/** The five status colours used across the product. Nothing else may introduce a new hue. */
export type Tone =
  | "critical"
  | "high"
  | "medium"
  | "normal"
  | "resolved"
  | "neutral";

/** Literal class names so Tailwind can see them. Use these instead of composing colour classes by hand. */
export const TONE: Record<
  Tone,
  {
    soft: string;
    solid: string;
    dot: string;
    text: string;
    border: string;
    ring: string;
  }
> = {
  critical: {
    soft: "bg-critical-soft text-critical-fg",
    solid: "bg-critical text-critical-on",
    dot: "bg-critical",
    text: "text-critical-fg",
    border: "border-critical/35",
    ring: "ring-critical/30",
  },
  high: {
    soft: "bg-high-soft text-high-fg",
    solid: "bg-high text-high-on",
    dot: "bg-high",
    text: "text-high-fg",
    border: "border-high/35",
    ring: "ring-high/30",
  },
  medium: {
    soft: "bg-medium-soft text-medium-fg",
    solid: "bg-medium text-medium-on",
    dot: "bg-medium",
    text: "text-medium-fg",
    border: "border-medium/40",
    ring: "ring-medium/30",
  },
  normal: {
    soft: "bg-normal-soft text-normal-fg",
    solid: "bg-normal text-normal-on",
    dot: "bg-normal",
    text: "text-normal-fg",
    border: "border-normal/35",
    ring: "ring-normal/30",
  },
  resolved: {
    soft: "bg-resolved-soft text-resolved-fg",
    solid: "bg-resolved text-resolved-on",
    dot: "bg-resolved",
    text: "text-resolved-fg",
    border: "border-resolved/35",
    ring: "ring-resolved/30",
  },
  neutral: {
    soft: "bg-muted text-muted-foreground",
    solid: "bg-foreground text-background",
    dot: "bg-subtle",
    text: "text-muted-foreground",
    border: "border-border",
    ring: "ring-border",
  },
};

export const PRIORITY_META: Record<
  IncidentPriority,
  {
    code: IncidentPriority;
    label: string;
    tone: Tone;
    definition: string;
    rank: number;
  }
> = {
  P1: {
    code: "P1",
    label: "Critical",
    tone: "critical",
    definition: "Immediate threat to life or safety.",
    rank: 0,
  },
  P2: {
    code: "P2",
    label: "High",
    tone: "high",
    definition: "Serious active situation.",
    rank: 1,
  },
  P3: {
    code: "P3",
    label: "Medium",
    tone: "medium",
    definition: "Requires timely police attention.",
    rank: 2,
  },
  P4: {
    code: "P4",
    label: "Normal",
    tone: "normal",
    definition: "Non-emergency report.",
    rank: 3,
  },
};

export const PRIORITIES: IncidentPriority[] = ["P1", "P2", "P3", "P4"];

export const STATUS_META: Record<
  IncidentStatus,
  { label: string; tone: Tone; active: boolean }
> = {
  new: { label: "New", tone: "critical", active: true },
  acknowledged: { label: "Acknowledged", tone: "high", active: true },
  assigned: { label: "Assigned", tone: "medium", active: true },
  en_route: { label: "En route", tone: "normal", active: true },
  on_scene: { label: "On scene", tone: "normal", active: true },
  resolved: { label: "Resolved", tone: "resolved", active: false },
  closed: { label: "Closed", tone: "neutral", active: false },
  cancelled: { label: "Cancelled", tone: "neutral", active: false },
};

export const ACTIVE_STATUSES: IncidentStatus[] = [
  "new",
  "acknowledged",
  "assigned",
  "en_route",
  "on_scene",
];

/** Dispatch board columns, in order, and the statuses that fall into each. */
export const DISPATCH_COLUMNS: {
  key: "unassigned" | "assigned" | "en_route" | "on_scene" | "resolved";
  label: string;
  statuses: IncidentStatus[];
}[] = [
  { key: "unassigned", label: "Unassigned", statuses: ["new", "acknowledged"] },
  { key: "assigned", label: "Assigned", statuses: ["assigned"] },
  { key: "en_route", label: "En route", statuses: ["en_route"] },
  { key: "on_scene", label: "On scene", statuses: ["on_scene"] },
  { key: "resolved", label: "Resolved", statuses: ["resolved"] },
];

export const UNIT_STATUS_META: Record<
  UnitStatus,
  { label: string; tone: Tone; busy: boolean }
> = {
  available: { label: "Available", tone: "resolved", busy: false },
  assigned: { label: "Assigned", tone: "medium", busy: true },
  en_route: { label: "En route", tone: "normal", busy: true },
  on_scene: { label: "On scene", tone: "high", busy: true },
  unavailable: { label: "Unavailable", tone: "neutral", busy: true },
  off_duty: { label: "Off duty", tone: "neutral", busy: true },
};

export const OFFICER_STAGE_META: Record<
  OfficerStage,
  { label: string; tone: Tone }
> = {
  assigned: { label: "Assigned", tone: "medium" },
  accepted: { label: "Accepted", tone: "normal" },
  en_route: { label: "En route", tone: "normal" },
  on_scene: { label: "On scene", tone: "high" },
  assistance_requested: { label: "Assistance requested", tone: "critical" },
  situation_controlled: { label: "Situation controlled", tone: "resolved" },
  report_pending: { label: "Report pending", tone: "medium" },
  completed: { label: "Completed", tone: "resolved" },
};

export const OFFICER_STAGE_ORDER: OfficerStage[] = [
  "assigned",
  "accepted",
  "en_route",
  "on_scene",
  "situation_controlled",
  "report_pending",
  "completed",
];

export const COMPLAINT_STATUS_META: Record<
  ComplaintStatus,
  { label: string; tone: Tone }
> = {
  submitted: { label: "Submitted", tone: "neutral" },
  received: { label: "Received", tone: "normal" },
  under_review: { label: "Under review", tone: "normal" },
  assigned: { label: "Assigned", tone: "normal" },
  in_progress: { label: "Action in progress", tone: "medium" },
  info_required: { label: "Additional information required", tone: "high" },
  resolved: { label: "Resolved", tone: "resolved" },
  closed: { label: "Closed", tone: "neutral" },
};

export const COMPLAINT_STATUS_ORDER: ComplaintStatus[] = [
  "submitted",
  "received",
  "under_review",
  "assigned",
  "in_progress",
  "info_required",
  "resolved",
  "closed",
];

export const SOURCE_LABEL: Record<IncidentSource, string> = {
  sos: "SOS",
  silent_sos: "Silent SOS",
  report: "Citizen report",
  call: "Voice call",
  tip: "Confidential tip",
  journey: "Journey safety",
};

export const CATEGORY_GROUP_LABEL: Record<CategoryGroup, string> = {
  immediate_safety: "Immediate safety",
  public_safety: "Public safety",
  traffic: "Traffic",
  crime_intel: "Drugs and crime information",
  cyber: "Cyber and financial",
  emergency_assist: "Emergency assistance",
};

export const CLASSIFICATION_META: Record<
  EvidenceClassification,
  { label: string; tone: Tone }
> = {
  standard: { label: "Standard", tone: "neutral" },
  sensitive: { label: "Sensitive", tone: "medium" },
  restricted: { label: "Restricted", tone: "critical" },
};

export const INTEGRITY_META: Record<
  EvidenceIntegrity,
  { label: string; tone: Tone }
> = {
  verified: { label: "Integrity verified", tone: "resolved" },
  pending: { label: "Integrity check pending", tone: "medium" },
  flagged: { label: "Integrity flagged", tone: "critical" },
};

export const ESCALATION_LEVEL_LABEL: Record<1 | 2 | 3, string> = {
  1: "Station supervisor",
  2: "District command",
  3: "State command",
};
