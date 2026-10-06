"use client";

import {
  Check,
  EyeOff,
  Info,
  Lock,
  MessageCircleQuestion,
  Minus,
  PencilLine,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { Field } from "@/components/shared/page";
import {
  ComplaintStatusChip,
  SensitiveBadge,
  ToneChip,
} from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import {
  COMPLAINT_STATUS_META,
  COMPLAINT_STATUS_ORDER,
} from "@/config/incident";
import { stationById } from "@/data/demo/geo";
import { CITIZENS } from "@/data/demo/people";
import { EVIDENCE_TYPE_META } from "@/features/evidence/evidence-meta";
import { IncidentLink } from "@/features/evidence/incident-link";
import { PaneFrame, PaneSection } from "@/features/evidence/record-layout";
import { useCategoryLookup, useIncident } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { formatBytes, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Complaint, ComplaintStatus } from "@/types";
import {
  CONTACT_LABEL,
  KIND_META,
  isOpenComplaint,
  shortenName,
} from "./complaint-meta";
import { UpdateStatusDialog } from "./update-status-dialog";

export function KindChip({ kind }: { kind: Complaint["kind"] }) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <ToneChip
      tone={meta.tone}
      variant={meta.tone === "neutral" ? "outline" : "soft"}
    >
      <Icon aria-hidden className="size-3" />
      {meta.label}
    </ToneChip>
  );
}

/**
 * Where the complaint stands in its lifecycle. A step counts as done only if the complaint
 * actually passed through it — "Additional information required", for one, is often never needed.
 */
function StatusStepper({ complaint }: { complaint: Complaint }) {
  const reachedAt = new Map<ComplaintStatus, number>();
  for (const update of complaint.updates)
    if (!reachedAt.has(update.status)) reachedAt.set(update.status, update.at);
  const currentIndex = COMPLAINT_STATUS_ORDER.indexOf(complaint.status);

  return (
    <ol aria-label="Complaint status" className="relative">
      {COMPLAINT_STATUS_ORDER.map((status, index) => {
        const at = reachedAt.get(status);
        const state =
          status === complaint.status
            ? "current"
            : at !== undefined
              ? "done"
              : index < currentIndex
                ? "skipped"
                : "upcoming";
        const last = index === COMPLAINT_STATUS_ORDER.length - 1;
        return (
          <li
            key={status}
            aria-current={state === "current" ? "step" : undefined}
            className={cn("relative flex gap-3", last ? "pb-0" : "pb-2.5")}
          >
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-5 bottom-0 left-[9px] w-px",
                  index < currentIndex ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-px grid size-[19px] shrink-0 place-items-center rounded-full border",
                state === "done" &&
                  "border-primary bg-primary text-primary-foreground",
                state === "current" &&
                  "border-primary bg-card ring-3 ring-primary/20",
                state === "skipped" &&
                  "border-dashed border-input bg-card text-subtle",
                state === "upcoming" && "border-input bg-card",
              )}
            >
              {state === "done" && <Check className="size-3" strokeWidth={3} />}
              {state === "current" && (
                <span className="size-2 rounded-full bg-primary" />
              )}
              {state === "skipped" && <Minus className="size-3" />}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
              <p
                className={cn(
                  "text-sm",
                  state === "current" && "font-semibold",
                  state === "done" && "font-medium",
                  (state === "upcoming" || state === "skipped") &&
                    "text-muted-foreground",
                )}
              >
                {COMPLAINT_STATUS_META[status].label}
                {state === "current" && (
                  <span className="sr-only"> (current status)</span>
                )}
              </p>
              <p className="tnum text-xs text-muted-foreground">
                {at !== undefined
                  ? formatDateTime(at)
                  : state === "skipped"
                    ? "Not needed"
                    : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Who raised it, reduced to what a staff role may see. A confidential tip never has an identity. */
function Complainant({ complaint }: { complaint: Complaint }) {
  const citizen = complaint.citizenId
    ? CITIZENS.find((c) => c.id === complaint.citizenId)
    : undefined;

  if (complaint.kind === "confidential_tip")
    return (
      <span className="inline-flex items-start gap-1.5">
        <EyeOff
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
        />
        No identity stored for a confidential tip
      </span>
    );
  if (complaint.anonymous)
    return <>Submitted anonymously. No identity stored.</>;
  if (!citizen) return <>Not shared with staff roles</>;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{shortenName(citizen.name)}</span>
      {citizen.phoneMasked && (
        <span className="tnum font-mono text-[13px] font-normal text-muted-foreground">
          {citizen.phoneMasked}
        </span>
      )}
      <SensitiveBadge label="Reduced details" />
    </span>
  );
}

export function ComplaintDetail({
  complaint,
  onClose,
}: {
  complaint: Complaint;
  onClose: () => void;
}) {
  const { can } = useSession();
  const category = useCategoryLookup()(complaint.categoryId);
  const linked = useIncident(complaint.linkedIncidentId);
  const station = stationById(complaint.stationId);
  const [dialog, setDialog] = useState<{ preset?: ComplaintStatus } | null>(
    null,
  );

  const canUpdate = can("complaint.update");
  const isTip = complaint.kind === "confidential_tip";
  const contactable =
    !isTip &&
    !complaint.anonymous &&
    Boolean(complaint.citizenId) &&
    complaint.contactPreference !== "none";
  const updates = complaint.updates.slice().sort((a, b) => b.at - a.at);

  const footer = canUpdate ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {contactable && isOpenComplaint(complaint.status) && (
        <Button
          variant="outline"
          size="lg"
          disabled={complaint.status === "info_required"}
          onClick={() => setDialog({ preset: "info_required" })}
        >
          <MessageCircleQuestion aria-hidden />
          {complaint.status === "info_required"
            ? "Information requested"
            : "Ask for more information"}
        </Button>
      )}
      <Button size="lg" onClick={() => setDialog({})}>
        <PencilLine aria-hidden /> Update status
      </Button>
    </div>
  ) : (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="flex min-w-0 flex-1 basis-56 items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
        <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Your role can read complaints but not update them. A station
          supervisor can change the status.
        </span>
      </p>
      <Button size="lg" disabled>
        <PencilLine aria-hidden /> Update status
      </Button>
    </div>
  );

  return (
    <PaneFrame
      eyebrow={complaint.id}
      title={complaint.title}
      meta={
        <>
          <ComplaintStatusChip status={complaint.status} />
          <KindChip kind={complaint.kind} />
        </>
      }
      onClose={onClose}
      footer={footer}
    >
      <div className="border-b border-border/70 px-4 py-3 sm:px-5">
        <p className="flex items-start gap-2 rounded-xl border border-border bg-inset p-3 text-[13px] leading-relaxed text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Demonstration record. A complaint here is not an FIR or any other
            statutory filing.
          </span>
        </p>
      </div>

      <PaneSection title="Details">
        <p className="mb-4 text-sm leading-relaxed">{complaint.description}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
          <Field label="Kind">{KIND_META[complaint.kind].label}</Field>
          <Field label="Category">
            <span className="inline-flex items-center gap-1.5">
              <CategoryIcon
                categoryId={complaint.categoryId}
                className="text-muted-foreground"
              />
              {category?.label ?? "Uncategorised"}
            </span>
          </Field>
          <Field label="Station">
            {station ? (
              <Link
                href={`/control/stations?id=${station.id}`}
                className="rounded text-primary hover:underline"
              >
                {station.name}
              </Link>
            ) : (
              "Not assigned to a station"
            )}
          </Field>
          <Field label="Department">{complaint.department}</Field>
          <Field label="Submitted">
            <span className="tnum">
              {formatDateTime(complaint.submittedAt)}
            </span>
          </Field>
          <Field label="Occurred">
            <span className="tnum">{formatDateTime(complaint.occurredAt)}</span>
          </Field>
          <Field label="Location" className="col-span-2">
            {complaint.location.address}
            {!complaint.location.address.includes(complaint.location.area) && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {complaint.location.area}
              </span>
            )}
          </Field>
          <Field label="Assigned authority">
            {complaint.assignedAuthority ?? (
              <span className="font-normal text-muted-foreground">
                Not assigned yet
              </span>
            )}
          </Field>
          <Field label="Contact preference">
            {CONTACT_LABEL[complaint.contactPreference]}
          </Field>
          <Field label="Raised by" className="col-span-2">
            <Complainant complaint={complaint} />
          </Field>
        </dl>
        {!contactable && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {isTip
              ? "No contact is possible. The source asked not to be contacted and no identity exists to contact."
              : complaint.contactPreference === "none"
                ? "The person who raised this asked not to be contacted."
                : "No app account is linked, so updates cannot be sent to the person who raised this."}
          </p>
        )}
      </PaneSection>

      <PaneSection title="Status">
        <StatusStepper complaint={complaint} />
      </PaneSection>

      <PaneSection
        title="Updates"
        description={
          isTip
            ? "Notes on the record. Nobody outside staff sees these."
            : "What the person who raised this can read, newest first."
        }
      >
        <ol className="space-y-3">
          {updates.map((update) => (
            <li
              key={update.id}
              className="rounded-xl border border-border bg-inset p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <ComplaintStatusChip status={update.status} />
                <time
                  dateTime={new Date(update.at).toISOString()}
                  className="tnum text-xs text-muted-foreground"
                >
                  {formatDateTime(update.at)}
                </time>
              </div>
              <p className="mt-2 text-sm leading-relaxed break-words">
                {update.note}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{update.by}</p>
            </li>
          ))}
        </ol>
      </PaneSection>

      <PaneSection title="Documents">
        {complaint.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents were added to this complaint.
          </p>
        ) : (
          <ul className="divide-y divide-border/70 rounded-xl border border-border">
            {complaint.documents.map((doc) => {
              const meta = EVIDENCE_TYPE_META[doc.kind];
              const Icon = meta.icon;
              return (
                <li
                  key={doc.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-inset text-muted-foreground"
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium break-words">
                      {doc.name}
                    </p>
                    <p className="tnum text-xs text-muted-foreground">
                      {meta.label} · {formatBytes(doc.sizeBytes)} · added{" "}
                      {formatDateTime(doc.addedAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {complaint.documents.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Only the file details are kept in the demonstration; the files
            themselves are not stored.
          </p>
        )}
      </PaneSection>

      <PaneSection title="Linked incident">
        {linked ? (
          <IncidentLink incident={linked} />
        ) : complaint.linkedIncidentId ? (
          <p className="text-sm text-muted-foreground">
            Linked to{" "}
            <Link
              href={`/control/incidents?id=${complaint.linkedIncidentId}`}
              className="rounded font-mono text-primary hover:underline"
            >
              {complaint.linkedIncidentId}
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No incident is linked to this complaint.
          </p>
        )}
      </PaneSection>

      {dialog && (
        <UpdateStatusDialog
          key={dialog.preset ?? "next"}
          complaint={complaint}
          preset={dialog.preset}
          onClose={() => setDialog(null)}
        />
      )}
    </PaneFrame>
  );
}
