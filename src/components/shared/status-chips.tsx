import { Lock, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import {
  CLASSIFICATION_META,
  COMPLAINT_STATUS_META,
  INTEGRITY_META,
  OFFICER_STAGE_META,
  PRIORITY_META,
  STATUS_META,
  TONE,
  UNIT_STATUS_META,
  type Tone,
} from "@/config/incident";
import { cn } from "@/lib/utils";
import type {
  ComplaintStatus,
  EvidenceClassification,
  EvidenceIntegrity,
  IncidentPriority,
  IncidentStatus,
  OfficerStage,
  UnitStatus,
} from "@/types";

interface ChipProps {
  tone: Tone;
  children: ReactNode;
  /** `solid` is reserved for the single most urgent thing in a view. */
  variant?: "soft" | "solid" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

/** The one chip every status in the product is drawn with. */
export function ToneChip({
  tone,
  children,
  variant = "soft",
  size = "sm",
  dot,
  className,
}: ChipProps) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "h-5.5 px-2 text-xs" : "h-7 px-2.5 text-[13px]",
        variant === "soft" && t.soft,
        variant === "solid" && t.solid,
        variant === "outline" && cn("border bg-transparent", t.border, t.text),
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            variant === "solid" ? "bg-white" : t.dot,
          )}
        />
      )}
      {children}
    </span>
  );
}

export function SeverityDot({
  tone,
  pulse,
  className,
}: {
  tone: Tone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-flex size-2 shrink-0", className)}
    >
      {pulse && (
        <span
          className={cn(
            "absolute inset-0 rounded-full animate-beacon",
            TONE[tone].dot,
          )}
        />
      )}
      <span className={cn("relative size-2 rounded-full", TONE[tone].dot)} />
    </span>
  );
}

export function PriorityBadge({
  priority,
  variant,
  size,
  showCode = true,
  className,
}: {
  priority: IncidentPriority;
  variant?: ChipProps["variant"];
  size?: ChipProps["size"];
  showCode?: boolean;
  className?: string;
}) {
  const meta = PRIORITY_META[priority];
  return (
    <ToneChip
      tone={meta.tone}
      variant={variant ?? (priority === "P1" ? "solid" : "soft")}
      size={size}
      className={className}
    >
      {showCode && <span className="tnum opacity-80">{meta.code}</span>}
      {meta.label}
    </ToneChip>
  );
}

export function StatusChip({
  status,
  size,
  className,
}: {
  status: IncidentStatus;
  size?: ChipProps["size"];
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <ToneChip tone={meta.tone} size={size} dot className={className}>
      {meta.label}
    </ToneChip>
  );
}

export function UnitStatusChip({
  status,
  size,
  className,
}: {
  status: UnitStatus;
  size?: ChipProps["size"];
  className?: string;
}) {
  const meta = UNIT_STATUS_META[status];
  return (
    <ToneChip tone={meta.tone} size={size} dot className={className}>
      {meta.label}
    </ToneChip>
  );
}

export function OfficerStageChip({
  stage,
  size,
  className,
}: {
  stage: OfficerStage;
  size?: ChipProps["size"];
  className?: string;
}) {
  const meta = OFFICER_STAGE_META[stage];
  return (
    <ToneChip tone={meta.tone} size={size} dot className={className}>
      {meta.label}
    </ToneChip>
  );
}

export function ComplaintStatusChip({
  status,
  size,
  className,
}: {
  status: ComplaintStatus;
  size?: ChipProps["size"];
  className?: string;
}) {
  const meta = COMPLAINT_STATUS_META[status];
  return (
    <ToneChip tone={meta.tone} size={size} dot className={className}>
      {meta.label}
    </ToneChip>
  );
}

export function ClassificationChip({
  value,
  className,
}: {
  value: EvidenceClassification;
  className?: string;
}) {
  const meta = CLASSIFICATION_META[value];
  return (
    <ToneChip
      tone={meta.tone}
      variant={value === "standard" ? "outline" : "soft"}
      className={className}
    >
      {value !== "standard" && <Lock aria-hidden className="size-3" />}
      {meta.label}
    </ToneChip>
  );
}

export function IntegrityChip({
  value,
  className,
}: {
  value: EvidenceIntegrity;
  className?: string;
}) {
  const meta = INTEGRITY_META[value];
  return (
    <ToneChip tone={meta.tone} dot className={className}>
      {meta.label}
    </ToneChip>
  );
}

/** Marks a field or record that carries personal or protected information. */
export function SensitiveBadge({
  label = "Sensitive data",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-medium/40 bg-medium-soft px-1.5 py-0.5 text-[11px] font-medium text-medium-fg",
        className,
      )}
    >
      <ShieldAlert aria-hidden className="size-3" />
      {label}
    </span>
  );
}
