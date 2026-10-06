"use client";

import {
  ClipboardCheck,
  FileText,
  FolderLock,
  Siren,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { ToneChip } from "@/components/shared/status-chips";
import { type Tone } from "@/config/incident";
import { useIncidentEvidence } from "@/hooks/use-demo-data";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CaseHandoff, Incident } from "@/types";

const REPORT_STATUS: Record<
  CaseHandoff["reportStatus"],
  { label: string; tone: Tone; detail: string }
> = {
  not_started: {
    label: "Not started",
    tone: "neutral",
    detail: "No report has been started for this incident.",
  },
  draft: {
    label: "Draft",
    tone: "medium",
    detail: "Waiting for the responding officer to complete and submit it.",
  },
  submitted: {
    label: "Submitted",
    tone: "normal",
    detail: "Submitted by the responding officer and waiting for review.",
  },
  reviewed: {
    label: "Reviewed",
    tone: "resolved",
    detail: "Reviewed and accepted.",
  },
};

type StepState = "done" | "current" | "pending";

function Step({
  icon: Icon,
  title,
  state,
  last,
  chip,
  children,
}: {
  icon: LucideIcon;
  title: string;
  state: StepState;
  last?: boolean;
  chip?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className={cn("relative flex gap-3", !last && "pb-4")}>
      {!last && (
        <span
          aria-hidden
          className="absolute top-7 bottom-0 left-[13px] w-px bg-border"
        />
      )}
      <span
        className={cn(
          "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border bg-card",
          state === "done" &&
            "border-resolved/40 bg-resolved-soft text-resolved-fg",
          state === "current" && "border-primary/50 text-primary",
          state === "pending" && "border-border text-subtle",
        )}
      >
        <Icon aria-hidden className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
          {title}
          {chip}
        </p>
        <div className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
          {children}
        </div>
      </div>
    </li>
  );
}

/**
 * What happens to a case after the emergency is over. It records where the paperwork stands and
 * nothing more: a complaint here is not an FIR, and onward filing belongs to authorised systems.
 */
export function HandoffChain({ incident }: { incident: Incident }) {
  const evidence = useIncidentEvidence(incident.id);
  const titleId = useId();
  const { handoff } = incident;
  const report = REPORT_STATUS[handoff.reportStatus];
  const reportDone =
    handoff.reportStatus === "submitted" || handoff.reportStatus === "reviewed";

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border border-border bg-card"
    >
      <header className="border-b border-border/70 px-3.5 py-2.5">
        <h3 id={titleId} className="text-sm font-semibold">
          Case hand-off
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Where the record goes after the response ends.
        </p>
      </header>
      <ol className="px-3.5 py-3.5">
        <Step icon={Siren} title="Incident" state="done">
          <span className="tnum font-mono text-xs">{incident.id}</span>
          {incident.resolvedAt && (
            <> · resolved {formatDateTime(incident.resolvedAt)}</>
          )}
        </Step>

        <Step
          icon={FileText}
          title="Preliminary response report"
          state={reportDone ? "done" : "current"}
          chip={<ToneChip tone={report.tone}>{report.label}</ToneChip>}
        >
          {report.detail}
          {handoff.reportDraft && (
            <q className="mt-1.5 line-clamp-3 block border-l-2 border-border pl-2.5 text-foreground/80 [quotes:none]">
              {handoff.reportDraft}
            </q>
          )}
        </Step>

        <Step
          icon={ClipboardCheck}
          title="Complaint or further official process"
          state={handoff.complaintId ? "done" : "pending"}
        >
          {handoff.complaintId ? (
            <>
              Linked complaint{" "}
              <Link
                href={`/control/complaints?id=${handoff.complaintId}`}
                className="tnum font-mono text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                {handoff.complaintId}
              </Link>
              .
            </>
          ) : (
            "None linked. If the citizen wants this taken further, a complaint can be registered from Complaints."
          )}{" "}
          A complaint in this system is a report to the station, not an FIR or
          any other statutory filing.
        </Step>

        <Step
          icon={FolderLock}
          title="Evidence package reference"
          state={handoff.evidencePackageRef ? "done" : "pending"}
        >
          {handoff.evidencePackageRef ? (
            <>
              <span className="tnum font-mono text-xs text-foreground">
                {handoff.evidencePackageRef}
              </span>{" "}
              · {evidence.length} {evidence.length === 1 ? "item" : "items"}{" "}
              linked to this incident
            </>
          ) : (
            "No package reference has been issued."
          )}
        </Step>

        <Step
          icon={UserCheck}
          title="Supervisor review"
          state={
            handoff.reviewedBy ? "done" : reportDone ? "current" : "pending"
          }
          last
        >
          {handoff.reviewedBy
            ? `Reviewed by ${handoff.reviewedBy}. The incident is closed.`
            : reportDone
              ? "Ready for review. Closing the incident records the review."
              : "Follows once the response report is submitted."}
        </Step>
      </ol>
      <p className="border-t border-border/70 px-3.5 py-2.5 text-xs text-muted-foreground">
        Hand-off to other authorised systems is a placeholder in this
        demonstration. Nothing here is sent outside it.
      </p>
    </section>
  );
}
