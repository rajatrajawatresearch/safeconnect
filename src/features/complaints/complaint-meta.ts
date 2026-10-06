import { EyeOff, FileText, Siren, type LucideIcon } from "lucide-react";
import type { Tone } from "@/config/incident";
import type { Complaint, ComplaintKind, ComplaintStatus } from "@/types";

export const COMPLAINT_KINDS: ComplaintKind[] = [
  "report",
  "emergency",
  "confidential_tip",
];

export const KIND_META: Record<
  ComplaintKind,
  { label: string; icon: LucideIcon; tone: Tone }
> = {
  report: { label: "Report", icon: FileText, tone: "neutral" },
  emergency: { label: "Emergency", icon: Siren, tone: "high" },
  confidential_tip: {
    label: "Confidential tip",
    icon: EyeOff,
    tone: "medium",
  },
};

export const CONTACT_LABEL: Record<Complaint["contactPreference"], string> = {
  call: "Phone call",
  chat: "In-app chat",
  none: "No contact",
};

/** The step staff usually move a complaint to next. A suggestion only; any status can be chosen. */
export const NEXT_STATUS: Record<ComplaintStatus, ComplaintStatus> = {
  submitted: "received",
  received: "under_review",
  under_review: "assigned",
  assigned: "in_progress",
  in_progress: "resolved",
  info_required: "under_review",
  resolved: "closed",
  closed: "closed",
};

export const isOpenComplaint = (status: ComplaintStatus) =>
  status !== "resolved" && status !== "closed";

/** "Aarav Shah" → "Aarav S." Staff roles see the shortened form only. */
export function shortenName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}
