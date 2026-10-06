"use client";

import { format } from "date-fns";
import {
  Copy,
  FileOutput,
  Lock,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/shared/page";
import { ErrorState, RestrictedState } from "@/components/shared/states";
import {
  ClassificationChip,
  IntegrityChip,
  ToneChip,
} from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { formatBytes, formatDateTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services, ServiceError } from "@/services";
import { usePrefsStore } from "@/stores/prefs-store";
import type {
  Evidence,
  EvidenceAccess,
  EvidenceClassification,
  Incident,
} from "@/types";
import {
  ACCESS_META,
  EVIDENCE_SOURCE_LABEL,
  EVIDENCE_TYPE_META,
  ROLE_LABEL,
} from "./evidence-meta";
import { EvidencePreview } from "./evidence-preview";
import { ExportDialog } from "./export-dialog";
import { IncidentLink } from "./incident-link";
import { PaneFrame, PaneSection } from "./record-layout";

const stamp = (at: number) => format(at, "d MMM, HH:mm:ss");

const CLASSIFICATION_NOTE: Record<EvidenceClassification, string> = {
  standard: "Open to roles with evidence access. Every view is logged.",
  sensitive:
    "Contains personal information. Open to roles with evidence access; every view is logged.",
  restricted:
    "Involves minors or protected persons. Open only to roles with restricted-evidence access.",
};

function AccessTimeline({ entries }: { entries: EvidenceAccess[] }) {
  const ordered = entries.slice().sort((a, b) => a.at - b.at);
  return (
    <ol className="relative">
      {ordered.map((entry, index) => {
        const meta = ACCESS_META[entry.action];
        const Icon = meta.icon;
        const last = index === ordered.length - 1;
        return (
          <li
            key={entry.id}
            className={cn("relative flex gap-3", last ? "pb-0" : "pb-3.5")}
          >
            {!last && (
              <span
                aria-hidden
                className="absolute top-7 bottom-0 left-[13px] w-px bg-border"
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border bg-card",
                meta.emphasis === "critical" &&
                  "border-critical/40 bg-critical-soft text-critical-fg",
                meta.emphasis === "warn" &&
                  "border-high/40 bg-high-soft text-high-fg",
                meta.emphasis === "good" &&
                  "border-resolved/40 bg-resolved-soft text-resolved-fg",
                !meta.emphasis && "border-border text-muted-foreground",
              )}
            >
              <Icon aria-hidden className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium">{meta.label}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                {entry.actorName}
                <span className="text-subtle">
                  {" "}
                  · {ROLE_LABEL[entry.actorRole]}
                </span>
              </p>
              {entry.detail && (
                <p className="mt-0.5 text-[13px] leading-snug break-words text-muted-foreground">
                  {entry.detail}
                </p>
              )}
              <time
                dateTime={new Date(entry.at).toISOString()}
                title={formatDateTime(entry.at)}
                className="tnum mt-0.5 block font-mono text-xs text-subtle"
              >
                {stamp(entry.at)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function HashBlock({ evidence }: { evidence: Evidence }) {
  const groups = evidence.hash.match(/.{1,8}/g) ?? [evidence.hash];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(evidence.hash);
      toast.success("Hash copied");
    } catch {
      toast.error("Could not copy. Select the value and copy it by hand.");
    }
  };
  return (
    <div className="rounded-xl border border-border bg-inset p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {evidence.hashAlgorithm}
        </p>
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy aria-hidden /> Copy hash
        </Button>
      </div>
      <p className="tnum mt-2 flex flex-wrap gap-x-2 font-mono text-[13px] leading-relaxed">
        {groups.map((group, index) => (
          <span key={index}>{group}</span>
        ))}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Demo value. A live deployment records a cryptographic digest when the
        item arrives and checks it again before any export.
      </p>
    </div>
  );
}

/** Shown in place of a restricted item. Opening it is itself recorded. */
function RestrictedEvidence({
  evidence,
  onClose,
}: {
  evidence: Evidence;
  onClose: () => void;
}) {
  const { actor } = useSession();
  const logged = useRef(false);

  useEffect(() => {
    // One denied entry per attempt, including when effects run twice in development.
    if (logged.current) return;
    logged.current = true;
    services.evidence.logDenied(evidence.id, actor).catch(() => {});
  }, [evidence.id, actor]);

  return (
    <PaneFrame
      eyebrow={evidence.id}
      title="Evidence record"
      meta={<ClassificationChip value="restricted" />}
      onClose={onClose}
    >
      <RestrictedState
        title="Restricted evidence"
        description="Your role does not permit access."
      />
      <div className="mx-4 mb-5 rounded-xl border border-border bg-inset p-3 sm:mx-5">
        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
          <ShieldAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-high-fg"
          />
          <span>
            This attempt has been recorded in the item&apos;s access history and
            in the audit log. Restricted items involve minors or protected
            persons and open only for roles with restricted-evidence access.
          </span>
        </p>
      </div>
    </PaneFrame>
  );
}

function OpenEvidence({
  evidence,
  incident,
  onClose,
}: {
  evidence: Evidence;
  incident: Incident | undefined;
  onClose: () => void;
}) {
  const { actor, can } = useSession();
  const mfaVerifiedAt = usePrefsStore((s) => s.mfaVerifiedAt);
  const [access, setAccess] = useState<"pending" | "granted" | "failed">(
    "pending",
  );
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);

  // The item opens only after this view has been written to its access history.
  useEffect(() => {
    let cancelled = false;
    services.evidence.logView(evidence.id, actor).then(
      () => {
        if (!cancelled) setAccess("granted");
      },
      (error: unknown) => {
        if (cancelled) return;
        setOffline(error instanceof ServiceError && error.code === "offline");
        setAccess("failed");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [evidence.id, actor, attempt]);

  const type = EVIDENCE_TYPE_META[evidence.type];
  const TypeIcon = type.icon;
  const blocked = !can("evidence.export")
    ? "role"
    : !mfaVerifiedAt
      ? "mfa"
      : null;

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="flex min-w-0 flex-1 basis-56 items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
        {blocked ? (
          <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        ) : (
          <ShieldCheck
            aria-hidden
            className="mt-0.5 size-3.5 shrink-0 text-resolved-fg"
          />
        )}
        <span>
          {blocked === "role" &&
            "Export is not part of your role. A station supervisor can request it."}
          {blocked === "mfa" &&
            "Export needs second-factor verification. Verify from the account menu, under Session and security."}
          {!blocked &&
            "Second factor verified. Export requests are logged and reviewed; originals are never edited or deleted."}
        </span>
      </p>
      <Button
        size="lg"
        disabled={Boolean(blocked) || access !== "granted"}
        onClick={() => setExportOpen(true)}
      >
        <FileOutput aria-hidden /> Request export
      </Button>
    </div>
  );

  return (
    <PaneFrame
      eyebrow={evidence.id}
      title={evidence.title}
      meta={
        <>
          <ToneChip tone="neutral" variant="outline">
            <TypeIcon aria-hidden className="size-3" />
            {type.label}
          </ToneChip>
          <IntegrityChip value={evidence.integrity} />
          <ClassificationChip value={evidence.classification} />
        </>
      }
      onClose={onClose}
      footer={footer}
    >
      {access === "pending" && (
        <div role="status" className="space-y-4 px-4 py-5 sm:px-5">
          <p className="text-sm text-muted-foreground">
            Recording this view in the access history…
          </p>
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {access === "failed" && (
        <ErrorState
          offline={offline}
          title="This item could not be opened."
          description="Evidence opens only after the view has been written to its access history. That entry could not be saved, so the item stays closed."
          onRetry={() => {
            setAccess("pending");
            setAttempt((n) => n + 1);
          }}
        />
      )}

      {access === "granted" && (
        <>
          <PaneSection title="Preview">
            <EvidencePreview evidence={evidence} />
          </PaneSection>

          <PaneSection title="Metadata">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <Field label="File name" className="col-span-2">
                <span className="font-mono text-[13px] font-normal break-all">
                  {evidence.fileName}
                </span>
              </Field>
              <Field label="MIME type">
                <span className="font-mono text-[13px] font-normal">
                  {evidence.mime}
                </span>
              </Field>
              <Field label="Size">
                <span className="tnum">{formatBytes(evidence.sizeBytes)}</span>
              </Field>
              <Field label="Duration">
                <span className="tnum">
                  {evidence.durationSec
                    ? formatDuration(evidence.durationSec)
                    : "Not applicable"}
                </span>
              </Field>
              <Field label="Device">{evidence.device ?? "Not recorded"}</Field>
              <Field label="Captured">
                <span className="tnum">{stamp(evidence.capturedAt)}</span>
              </Field>
              <Field label="Submitted">
                <span className="tnum">{stamp(evidence.submittedAt)}</span>
              </Field>
              <Field label="Uploaded by" className="col-span-2">
                {evidence.uploadedByName}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {ROLE_LABEL[evidence.uploadedByRole]} ·{" "}
                  {EVIDENCE_SOURCE_LABEL[evidence.source]}
                </span>
              </Field>
            </dl>
          </PaneSection>

          <PaneSection title="Associated incident">
            {incident ? (
              <IncidentLink incident={incident} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Linked to{" "}
                <span className="font-mono text-foreground">
                  {evidence.incidentId}
                </span>
                . That incident is not in the current view.
              </p>
            )}
          </PaneSection>

          <PaneSection
            title="Integrity hash"
            actions={<IntegrityChip value={evidence.integrity} />}
          >
            {evidence.integrity === "flagged" && (
              <p
                role="alert"
                className="mb-3 flex items-start gap-2 rounded-xl border border-critical/35 bg-critical-soft p-3 text-[13px] leading-relaxed text-critical-fg"
              >
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  A later check produced a different digest. The original is
                  preserved and the differing copy is quarantined. Treat this
                  item with care until a supervisor has reviewed it.
                </span>
              </p>
            )}
            {evidence.integrity === "pending" && (
              <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
                The digest is queued. It is recorded a few seconds after the
                item arrives.
              </p>
            )}
            <HashBlock evidence={evidence} />
          </PaneSection>

          <PaneSection
            title="Access history"
            description="Every upload, check, view, export request and refusal on this item, oldest first."
          >
            <AccessTimeline entries={evidence.access} />
          </PaneSection>

          <PaneSection title="Retention classification">
            <div className="flex flex-wrap items-center gap-2">
              <ClassificationChip value={evidence.classification} />
              <span className="text-sm font-medium">{evidence.retention}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {CLASSIFICATION_NOTE[evidence.classification]}
            </p>
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-inset p-3 text-[13px] leading-relaxed text-muted-foreground">
              <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                The original is preserved exactly as received. It cannot be
                edited, replaced or deleted from this console.
              </span>
            </p>
          </PaneSection>
        </>
      )}

      <ExportDialog
        evidence={evidence}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </PaneFrame>
  );
}

/**
 * One evidence record. Mount it with `key={evidence.id}` so each opening is logged on its own.
 */
export function EvidenceDetail({
  evidence,
  incident,
  onClose,
}: {
  evidence: Evidence;
  incident: Incident | undefined;
  onClose: () => void;
}) {
  const { can } = useSession();
  const locked =
    evidence.classification === "restricted" && !can("evidence.restricted");
  return locked ? (
    <RestrictedEvidence evidence={evidence} onClose={onClose} />
  ) : (
    <OpenEvidence evidence={evidence} incident={incident} onClose={onClose} />
  );
}
