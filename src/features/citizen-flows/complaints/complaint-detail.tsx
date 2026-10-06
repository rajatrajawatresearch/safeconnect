"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FilePlus2,
  Loader2,
  MessageSquareWarning,
  Minus,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { CategoryIcon } from "@/components/shared/category-icon";
import {
  MEDIA_KIND_META,
  MediaPicker,
  PickedMediaList,
} from "@/components/shared/media-picker";
import { Field, Panel } from "@/components/shared/page";
import { BlankState } from "@/components/shared/states";
import {
  ComplaintStatusChip,
  ToneChip,
} from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPLAINT_STATUS_META,
  COMPLAINT_STATUS_ORDER,
} from "@/config/incident";
import { stationById } from "@/data/demo/geo";
import { useAction } from "@/hooks/use-action";
import { useCategoryLookup } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { Complaint, ComplaintStatus } from "@/types";
import { CopyButton, DemoRecordNote, FieldError } from "../ui";

export const STATUS_KEY: Record<ComplaintStatus, TKey> = {
  submitted: "complaints.status.submitted",
  received: "complaints.status.received",
  under_review: "complaints.status.under_review",
  assigned: "complaints.status.assigned",
  in_progress: "complaints.status.in_progress",
  info_required: "complaints.status.info_required",
  resolved: "complaints.status.resolved",
  closed: "complaints.status.closed",
};

const CONTACT_KEY: Record<Complaint["contactPreference"], TKey> = {
  call: "complaints.contact.call",
  chat: "complaints.contact.chat",
  none: "complaints.contact.none",
};

/* ───────────────────────── Status stepper ───────────────────────── */

type StepState = "done" | "current" | "upcoming" | "not_needed";

/**
 * Where a complaint stands against the full list of statuses.
 *
 * "Additional information required" is a side step: most complaints never visit it, and one that is
 * waiting there still has the review and action steps ahead of it. So a step counts as done when it
 * was actually recorded, or when the complaint has plainly moved past it.
 */
function statusSteps(complaint: Complaint) {
  const recordedAt = new Map<ComplaintStatus, number>();
  for (const update of complaint.updates)
    recordedAt.set(update.status, update.at);
  const currentIndex = COMPLAINT_STATUS_ORDER.indexOf(complaint.status);
  const waitingOnCitizen = complaint.status === "info_required";

  return COMPLAINT_STATUS_ORDER.map((status, index) => {
    const at = recordedAt.get(status);
    let state: StepState = "upcoming";
    if (status === complaint.status) state = "current";
    else if (at !== undefined) state = "done";
    else if (index < currentIndex && !waitingOnCitizen)
      state = status === "info_required" ? "not_needed" : "done";
    return { status, state, at };
  });
}

function StatusStepper({ complaint }: { complaint: Complaint }) {
  const t = useT();
  const steps = useMemo(() => statusSteps(complaint), [complaint]);
  return (
    <ol className="space-y-1">
      {steps.map(({ status, state, at }, index) => {
        const last = index === steps.length - 1;
        const needsInput = state === "current" && status === "info_required";
        return (
          <li
            key={status}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "relative flex items-start gap-3 rounded-xl px-2 py-2",
              state === "current" &&
                (needsInput ? "bg-high-soft" : "bg-accent/70"),
            )}
          >
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-8 -bottom-2 left-[19px] w-px",
                  state === "done" ? "bg-resolved/50" : "bg-border",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                state === "done" && "border-resolved bg-resolved text-resolved-on",
                state === "current" &&
                  (needsInput
                    ? "border-high bg-high text-high-on"
                    : "border-primary bg-primary text-primary-foreground"),
                state === "upcoming" && "border-input bg-card",
                state === "not_needed" &&
                  "border-dashed border-input bg-card text-subtle",
              )}
            >
              {state === "done" && <Check className="size-3.5" />}
              {state === "current" && (
                <span className="size-2 rounded-full bg-current" />
              )}
              {state === "not_needed" && <Minus className="size-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[15px] leading-snug",
                  state === "current" && "font-semibold",
                  state === "done" && "font-medium",
                  (state === "upcoming" || state === "not_needed") &&
                    "text-muted-foreground",
                )}
              >
                {t(STATUS_KEY[status])}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {state === "current" && (
                  <>
                    {t("complaints.step.current")}
                    {at !== undefined && ` · ${formatDate(at)}`}
                  </>
                )}
                {state === "done" &&
                  (at !== undefined ? (
                    formatDate(at)
                  ) : (
                    <span className="sr-only">{t("complaints.step.done")}</span>
                  ))}
                {state === "not_needed" && t("complaints.step.notNeeded")}
                {state === "upcoming" && (
                  <span className="sr-only">
                    {t("complaints.step.upcoming")}
                  </span>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────────────────── Add information ───────────────────────── */

const infoSchema = z
  .object({
    note: z
      .string()
      .trim()
      .max(600, "report.error.tooLong" satisfies TKey),
    files: z
      .array(
        z.object({
          name: z.string(),
          kind: z.enum(["photo", "video", "audio", "document"]),
          sizeBytes: z.number(),
          durationSec: z.number().optional(),
        }),
      )
      .max(6, "report.error.media" satisfies TKey),
  })
  .refine((v) => v.note.length >= 5 || v.files.length > 0, {
    path: ["note"],
    message: "complaints.info.required" satisfies TKey,
  });

type InfoValues = z.infer<typeof infoSchema>;

function AddInformation({
  complaint,
  requested,
  headingAs: HeadingTag,
}: {
  complaint: Complaint;
  /** The police have asked for more; the form opens straight away. */
  requested: boolean;
  headingAs: "h2" | "h3";
}) {
  const t = useT();
  const { actor } = useSession();
  const [open, setOpen] = useState(requested);
  const form = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: { note: "", files: [] },
  });
  const files = useWatch({ control: form.control, name: "files" });
  const { errors, isSubmitted } = form.formState;
  const add = useAction(services.complaints.addInformation, {
    success: t("complaints.info.sent"),
  });
  const request = requested
    ? [...complaint.updates].reverse().find((u) => u.status === "info_required")
    : undefined;

  const send = async (data: InfoValues) => {
    const done = await add.run(
      complaint.id,
      data.note,
      data.files.map((f) => ({
        name: f.name,
        kind: f.kind,
        sizeBytes: f.sizeBytes,
      })),
      actor,
    );
    if (done === undefined) return;
    form.reset();
    setOpen(false);
  };

  if (!open)
    return (
      <Button
        type="button"
        variant="outline"
        size="xl"
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto"
      >
        <FilePlus2 aria-hidden />
        {t("complaints.info.add")}
      </Button>
    );

  return (
    <section
      id="add-information"
      aria-labelledby="add-information-title"
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        requested ? "border-high/35 bg-high-soft" : "border-border bg-inset",
      )}
    >
      <div className="flex items-start gap-3">
        {requested && (
          <MessageSquareWarning
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-high-fg"
          />
        )}
        <div className="min-w-0 flex-1">
          <HeadingTag
            id="add-information-title"
            className="text-base font-semibold"
          >
            {requested
              ? t("complaints.info.requestedTitle")
              : t("complaints.info.add")}
          </HeadingTag>
          {request && (
            <p className="mt-1 text-[15px] leading-relaxed text-foreground/80">
              {request.note}
              <span className="block text-[13px] text-muted-foreground">
                {request.by} · {formatDateTime(request.at)}
              </span>
            </p>
          )}
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(send)}
        noValidate
        className="mt-4 space-y-4"
      >
        <div>
          <Label htmlFor="complaint-info-note" className="text-[15px]">
            {t("complaints.info.note")}
          </Label>
          <Textarea
            id="complaint-info-note"
            {...form.register("note")}
            rows={3}
            maxLength={600}
            placeholder={t("complaints.info.notePlaceholder")}
            aria-invalid={Boolean(errors.note)}
            aria-describedby="complaint-info-error"
            className="mt-2 min-h-24 rounded-xl bg-card px-3.5 py-3 text-base md:text-base dark:bg-card"
          />
          <FieldError
            id="complaint-info-error"
            message={errors.note?.message}
          />
        </div>

        <div>
          <p className="mb-2 text-[15px] font-medium">
            {t("complaints.info.files")}
          </p>
          <MediaPicker
            size="sm"
            kinds={["document", "photo"]}
            onPick={(m) =>
              form.setValue("files", [...files, m], {
                shouldDirty: true,
                shouldValidate: isSubmitted,
              })
            }
          />
          <PickedMediaList
            items={files}
            className="mt-3"
            onRemove={(index) =>
              form.setValue(
                "files",
                files.filter((_, i) => i !== index),
                { shouldDirty: true },
              )
            }
          />
          <FieldError message={errors.files?.message} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" size="xl" disabled={add.pending}>
            {add.pending ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <Send aria-hidden />
            )}
            {t("complaints.info.send")}
          </Button>
          {!requested && (
            <Button
              type="button"
              variant="ghost"
              size="xl"
              disabled={add.pending}
              onClick={() => {
                form.reset();
                setOpen(false);
              }}
            >
              {t("action.cancel")}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

/* ───────────────────────── Detail ───────────────────────── */

function SectionHeading({
  as: Tag,
  children,
}: {
  as: "h2" | "h3";
  children: React.ReactNode;
}) {
  return <Tag className="mb-3 text-lg font-semibold">{children}</Tag>;
}

export function ComplaintDetail({
  complaint,
  linkedIncidentVisible,
  onBack,
}: {
  complaint: Complaint;
  /** Whether the linked incident is one this citizen raised and may open. */
  linkedIncidentVisible: boolean;
  /** Present on phones, where the detail takes the whole page. */
  onBack?: () => void;
}) {
  const t = useT();
  const lookup = useCategoryLookup();
  const category = lookup(complaint.categoryId);
  const station = stationById(complaint.stationId);
  const open = complaint.status !== "resolved" && complaint.status !== "closed";
  const requested = complaint.status === "info_required";
  // As a page of its own (phones) the complaint title is the page heading; in the side panel it sits under "My complaints".
  const TitleTag = onBack ? "h1" : "h2";
  const SectionTag = onBack ? "h2" : "h3";
  const updates = useMemo(
    () => [...complaint.updates].sort((a, b) => b.at - a.at),
    [complaint.updates],
  );

  return (
    <article aria-labelledby="complaint-title" className="space-y-5">
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="-ml-2 h-11 px-2 text-[15px]"
        >
          <ArrowLeft aria-hidden />
          {t("complaints.title")}
        </Button>
      )}

      <Panel as="div" className="rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <ComplaintStatusChip status={complaint.status} size="md" />
          <span className="text-sm text-muted-foreground">
            {t("complaints.submittedOn", {
              date: formatDate(complaint.submittedAt),
            })}
          </span>
        </div>
        <TitleTag
          id="complaint-title"
          className="mt-3 text-xl font-semibold tracking-tight break-words sm:text-2xl"
        >
          {complaint.title}
        </TitleTag>
        <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">
          {complaint.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-inset px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground">
              {t("complaints.field.id")}
            </p>
            <p className="tnum font-mono text-base font-semibold break-all">
              {complaint.id}
            </p>
          </div>
          <CopyButton value={complaint.id} />
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label={t("complaints.field.category")}>
            <span className="inline-flex items-center gap-1.5">
              <CategoryIcon
                categoryId={complaint.categoryId}
                className="text-muted-foreground"
              />
              {category?.label ?? complaint.categoryId}
            </span>
          </Field>
          <Field label={t("complaints.field.status")}>
            {t(STATUS_KEY[complaint.status])}
          </Field>
          <Field label={t("complaints.field.station")}>
            {station?.name ?? "—"}
          </Field>
          <Field label={t("complaints.field.department")}>
            {complaint.department}
          </Field>
          <Field label={t("complaints.field.submitted")}>
            {formatDateTime(complaint.submittedAt)}
          </Field>
          <Field label={t("complaints.field.occurred")}>
            {formatDateTime(complaint.occurredAt)}
          </Field>
          <Field label={t("complaints.field.location")}>
            {complaint.location.address}
          </Field>
          {complaint.assignedAuthority && (
            <Field label={t("complaints.field.authority")}>
              {complaint.assignedAuthority}
            </Field>
          )}
          <Field label={t("complaints.field.contact")}>
            {t(CONTACT_KEY[complaint.contactPreference])}
          </Field>
          {complaint.linkedIncidentId && linkedIncidentVisible && (
            <Field label={t("complaints.field.linked")}>
              <Link
                href={`/citizen/activity?id=${complaint.linkedIncidentId}`}
                className="inline-flex min-h-6 items-center gap-1 font-mono text-primary underline-offset-2 hover:underline"
              >
                {complaint.linkedIncidentId}
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </Field>
          )}
        </dl>
      </Panel>

      {open && (
        <AddInformation
          key={requested ? "requested" : "optional"}
          complaint={complaint}
          requested={requested}
          headingAs={SectionTag}
        />
      )}

      <Panel as="div" className="rounded-2xl p-5 sm:p-6">
        <SectionHeading as={SectionTag}>
          {t("complaints.section.progress")}
        </SectionHeading>
        <StatusStepper complaint={complaint} />
      </Panel>

      <Panel as="div" className="rounded-2xl p-5 sm:p-6">
        <SectionHeading as={SectionTag}>
          {t("complaints.section.updates")}
        </SectionHeading>
        <ol className="space-y-5">
          {updates.map((update, index) => (
            <li key={update.id} className="relative flex gap-3">
              {index < updates.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-4 -bottom-5 left-[5px] w-px bg-border"
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-card",
                  index === 0 ? "bg-primary" : "bg-input",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <ToneChip
                    tone={COMPLAINT_STATUS_META[update.status].tone}
                    variant={index === 0 ? "soft" : "outline"}
                  >
                    {t(STATUS_KEY[update.status])}
                  </ToneChip>
                  <time
                    dateTime={new Date(update.at).toISOString()}
                    className="tnum text-[13px] text-muted-foreground"
                  >
                    {formatDateTime(update.at)}
                  </time>
                </div>
                <p className="mt-1.5 text-[15px] leading-relaxed">
                  {update.note}
                </p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {update.by}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel as="div" className="rounded-2xl p-5 sm:p-6">
        <SectionHeading as={SectionTag}>
          {t("complaints.section.documents")}
        </SectionHeading>
        {complaint.documents.length === 0 ? (
          <BlankState compact title={t("complaints.docs.empty")} />
        ) : (
          <ul className="space-y-2">
            {complaint.documents.map((doc) => {
              const DocIcon = MEDIA_KIND_META[doc.kind].icon;
              return (
                <li
                  key={doc.id}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <DocIcon aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">
                      {doc.name}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {formatBytes(doc.sizeBytes)} · {formatDate(doc.addedAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <DemoRecordNote />
    </article>
  );
}
