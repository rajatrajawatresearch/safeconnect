import {
  AudioLines,
  Ban,
  Eye,
  FileOutput,
  FileText,
  Fingerprint,
  ImageIcon,
  Link2,
  PackageCheck,
  Upload,
  Video,
  type LucideIcon,
} from "lucide-react";
import type {
  Evidence,
  EvidenceAccess,
  EvidenceClassification,
  EvidenceIntegrity,
  EvidenceType,
  RoleKey,
} from "@/types";

export const EVIDENCE_TYPES: EvidenceType[] = [
  "photo",
  "video",
  "audio",
  "document",
];
export const CLASSIFICATIONS: EvidenceClassification[] = [
  "standard",
  "sensitive",
  "restricted",
];
export const INTEGRITY_STATES: EvidenceIntegrity[] = [
  "verified",
  "pending",
  "flagged",
];
export const EVIDENCE_SOURCES: Evidence["source"][] = [
  "citizen",
  "officer",
  "operator",
];

export const EVIDENCE_TYPE_META: Record<
  EvidenceType,
  { label: string; icon: LucideIcon }
> = {
  photo: { label: "Photo", icon: ImageIcon },
  video: { label: "Video", icon: Video },
  audio: { label: "Audio", icon: AudioLines },
  document: { label: "Document", icon: FileText },
};

export const EVIDENCE_SOURCE_LABEL: Record<Evidence["source"], string> = {
  citizen: "Citizen upload",
  officer: "Officer upload",
  operator: "Operator upload",
};

export const ROLE_LABEL: Record<RoleKey | "system", string> = {
  citizen: "Citizen",
  operator: "Emergency operator",
  dispatcher: "Dispatcher",
  officer: "Field officer",
  supervisor: "Station supervisor",
  command: "District command",
  state_command: "State command",
  admin: "Administrator",
  system: "System",
};

/** How each entry of an item's access history reads in the chain-of-custody timeline. */
export const ACCESS_META: Record<
  EvidenceAccess["action"],
  { label: string; icon: LucideIcon; emphasis?: "good" | "warn" | "critical" }
> = {
  uploaded: { label: "Uploaded", icon: Upload },
  integrity_recorded: {
    label: "Integrity recorded",
    icon: Fingerprint,
    emphasis: "good",
  },
  linked: { label: "Linked to incident", icon: Link2 },
  viewed: { label: "Viewed by authorised user", icon: Eye },
  export_requested: {
    label: "Export requested",
    icon: FileOutput,
    emphasis: "warn",
  },
  export_approved: {
    label: "Export approved",
    icon: PackageCheck,
    emphasis: "good",
  },
  access_denied: { label: "Access denied", icon: Ban, emphasis: "critical" },
};
