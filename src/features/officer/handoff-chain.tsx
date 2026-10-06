import {
  ClipboardPen,
  FileText,
  FolderLock,
  Siren,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { ToneChip } from "@/components/shared/status-chips";
import type { Tone } from "@/config/incident";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types";

type StepState = "done" | "current" | "pending" | "not_applicable";

const STATE: Record<StepState, { label: string; tone: Tone }> = {
  done: { label: "Done", tone: "resolved" },
  current: { label: "In progress", tone: "normal" },
  pending: { label: "Pending", tone: "neutral" },
  not_applicable: { label: "Not applicable", tone: "neutral" },
};

interface Step {
  key: string;
  icon: LucideIcon;
  label: string;
  detail: ReactNode;
  note?: string;
  state: StepState;
}

const Ref = ({ children }: { children: ReactNode }) => (
  <span className="tnum font-mono text-[13px]">{children}</span>
);

/**
 * What happens to an incident after the emergency is over:
 * Incident → Preliminary response report → Complaint or further official process (when applicable)
 * → Evidence package reference → Supervisor review.
 *
 * Nothing here is a statutory filing. The complaint step only ever shows a reference handled
 * elsewhere, through the authorised process.
 */
export function HandoffChain({
  incident,
  evidenceCount,
  className,
}: {
  incident: Incident;
  evidenceCount: number;
  className?: string;
}) {
  const { handoff } = incident;
  const submitted =
    handoff.reportStatus === "submitted" || handoff.reportStatus === "reviewed";
  const reviewed = handoff.reportStatus === "reviewed";

  const steps: Step[] = [
    {
      key: "incident",
      icon: Siren,
      label: "Incident",
      detail: <Ref>{incident.id}</Ref>,
      note: incident.resolvedAt
        ? `Resolved ${formatDateTime(incident.resolvedAt)}`
        : undefined,
      state: "done",
    },
    {
      key: "report",
      icon: ClipboardPen,
      label: "Preliminary response report",
      detail: reviewed
        ? "Submitted and reviewed"
        : submitted
          ? "Submitted by the responding officer"
          : "Due from the responding officer",
      state: submitted ? "done" : "current",
    },
    {
      key: "complaint",
      icon: FileText,
      label: "Complaint or further official process",
      detail: handoff.complaintId ? (
        <Ref>{handoff.complaintId}</Ref>
      ) : (
        "None linked"
      ),
      note: handoff.complaintId
        ? "Handled by the station desk, outside this report."
        : "Only when applicable, and only through the authorised process.",
      state: handoff.complaintId ? "done" : "not_applicable",
    },
    {
      key: "evidence",
      icon: FolderLock,
      label: "Evidence package reference",
      detail: handoff.evidencePackageRef ? (
        <Ref>{handoff.evidencePackageRef}</Ref>
      ) : (
        "Not created yet"
      ),
      note: `${evidenceCount} ${evidenceCount === 1 ? "item" : "items"} linked to the incident`,
      state: handoff.evidencePackageRef ? "done" : "pending",
    },
    {
      key: "review",
      icon: UserCheck,
      label: "Supervisor review",
      detail: reviewed
        ? `Reviewed by ${handoff.reviewedBy ?? "the station supervisor"}`
        : submitted
          ? "Waiting for the station supervisor"
          : "Starts once the report is submitted",
      state: reviewed ? "done" : submitted ? "current" : "pending",
    },
  ];

  return (
    <ol className={cn("relative", className)}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const { label, tone } = STATE[step.state];
        return (
          <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-8 bottom-0 left-[15px] w-px",
                  step.state === "done" ? "bg-resolved/50" : "bg-border",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border bg-card",
                step.state === "done" &&
                  "border-resolved/40 bg-resolved-soft text-resolved-fg",
                step.state === "current" &&
                  "border-normal/40 bg-normal-soft text-normal-fg",
                (step.state === "pending" || step.state === "not_applicable") &&
                  "border-border text-muted-foreground",
              )}
            >
              <step.icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <p className="min-w-0 text-sm font-medium">{step.label}</p>
                <ToneChip
                  tone={tone}
                  variant={step.state === "not_applicable" ? "outline" : "soft"}
                >
                  {label}
                </ToneChip>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug break-words">
                {step.detail}
              </p>
              {step.note && (
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {step.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
