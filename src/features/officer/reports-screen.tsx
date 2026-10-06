"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Info,
  Lock,
  Paperclip,
  SendHorizontal,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { CategoryIcon } from "@/components/shared/category-icon";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { BlankState, EmptyState } from "@/components/shared/states";
import { ClassificationChip, ToneChip } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useIncidentEvidence } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { Evidence, Incident } from "@/types";
import { HandoffChain } from "./handoff-chain";
import { NoUnitState, OfficerCard } from "./officer-ui";
import { useOfficer } from "./use-officer";

/* ───────────────────────── Report form ───────────────────────── */

const reportSchema = z
  .object({
    summary: z
      .string()
      .trim()
      .min(20, "Describe what happened in at least 20 characters.")
      .max(1200, "Keep this under 1,200 characters."),
    actions: z
      .string()
      .trim()
      .min(10, "List the actions you took, in at least 10 characters.")
      .max(1200, "Keep this under 1,200 characters."),
    peopleAssisted: z
      .number({ error: "Enter a number, or 0 if nobody needed help." })
      .int("Enter a whole number.")
      .min(0, "This cannot be negative.")
      .max(200, "Enter 200 or fewer."),
    followUp: z.boolean(),
    followUpNote: z.string().trim().max(400, "Keep this under 400 characters."),
  })
  .refine((v) => !v.followUp || v.followUpNote.length >= 5, {
    path: ["followUpNote"],
    message: "Say what follow-up is needed.",
  });

type ReportValues = z.infer<typeof reportSchema>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

function EvidenceReferences({ evidence }: { evidence: Evidence[] }) {
  const { can } = useSession();
  return (
    <div className="grid gap-2">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Paperclip aria-hidden className="size-4 text-muted-foreground" />
        Evidence references
      </p>
      {evidence.length === 0 ? (
        <p className="rounded-xl bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">
          No evidence is linked to this incident. The report will say so.
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {evidence.map((item) => {
            const locked =
              item.classification === "restricted" &&
              !can("evidence.restricted");
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="tnum truncate font-mono text-xs">{item.id}</p>
                  <p className="flex items-center gap-1 truncate text-[13px] text-muted-foreground">
                    {locked && <Lock aria-hidden className="size-3 shrink-0" />}
                    {locked ? "Restricted item" : item.title}
                  </p>
                </div>
                <ClassificationChip value={item.classification} />
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Listed automatically by reference. The files stay in the evidence centre
        and are not copied into the report.
      </p>
    </div>
  );
}

function ReportForm({
  incident,
  unitId,
}: {
  incident: Incident;
  unitId: string;
}) {
  const t = useT();
  const { actor } = useSession();
  const evidence = useIncidentEvidence(incident.id);
  const submit = useAction(services.units.submitReport, {
    success: "Report submitted for supervisor review",
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    mode: "onTouched",
    defaultValues: {
      summary: incident.handoff.reportDraft ?? incident.resolution ?? "",
      actions: "",
      peopleAssisted: incident.citizenId ? 1 : 0,
      followUp: false,
      followUpNote: "",
    },
  });
  const followUp = useWatch({ control, name: "followUp" });
  const id = (field: string) => `report-${incident.id}-${field}`;

  const onSubmit = (values: ReportValues) => {
    const report = [
      `What happened: ${values.summary}`,
      `Actions taken: ${values.actions}`,
      `People assisted: ${values.peopleAssisted}`,
      `Follow-up needed: ${values.followUp ? `Yes. ${values.followUpNote}` : "No"}`,
      `Evidence references: ${evidence.length ? evidence.map((e) => e.id).join(", ") : "None"}`,
    ].join("\n");
    void submit.run(incident.id, unitId, report, actor);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label={`Preliminary response report for ${incident.id}`}
      className="grid gap-5"
    >
      <div className="grid gap-1.5">
        <Label htmlFor={id("summary")}>What happened</Label>
        <Textarea
          id={id("summary")}
          rows={4}
          className="rounded-xl"
          aria-invalid={Boolean(errors.summary)}
          aria-describedby={`${id("summary")}-hint ${id("summary")}-error`}
          placeholder="What you found on arrival and how it ended"
          {...register("summary")}
        />
        <p
          id={`${id("summary")}-hint`}
          className="text-xs text-muted-foreground"
        >
          Starts from your resolution summary. Facts only; leave out names and
          phone numbers.
        </p>
        <FieldError
          id={`${id("summary")}-error`}
          message={errors.summary?.message}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={id("actions")}>Actions taken</Label>
        <Textarea
          id={id("actions")}
          rows={3}
          className="rounded-xl"
          aria-invalid={Boolean(errors.actions)}
          aria-describedby={`${id("actions")}-error`}
          placeholder="For example: located the citizen, searched the lane, spoke to the shopkeeper"
          {...register("actions")}
        />
        <FieldError
          id={`${id("actions")}-error`}
          message={errors.actions?.message}
        />
      </div>

      <div className="grid gap-1.5 sm:max-w-56">
        <Label htmlFor={id("people")}>People assisted</Label>
        <Input
          id={id("people")}
          type="number"
          inputMode="numeric"
          min={0}
          max={200}
          step={1}
          className="tnum h-12 rounded-xl"
          aria-invalid={Boolean(errors.peopleAssisted)}
          aria-describedby={`${id("people")}-error`}
          {...register("peopleAssisted", { valueAsNumber: true })}
        />
        <FieldError
          id={`${id("people")}-error`}
          message={errors.peopleAssisted?.message}
        />
      </div>

      <div className="grid gap-3 rounded-xl border border-border p-3.5">
        <div className="flex items-center justify-between gap-4">
          <Label
            htmlFor={id("followup")}
            className="min-h-11 flex-1 leading-snug"
          >
            Follow-up needed
          </Label>
          <Switch
            id={id("followup")}
            checked={followUp}
            onCheckedChange={(checked) =>
              setValue("followUp", checked, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
        </div>
        {followUp && (
          <div className="grid gap-1.5">
            <Label htmlFor={id("followup-note")}>What is needed</Label>
            <Textarea
              id={id("followup-note")}
              rows={2}
              className="rounded-xl"
              aria-invalid={Boolean(errors.followUpNote)}
              aria-describedby={`${id("followup-note")}-error`}
              placeholder="For example: evening patrol near the cross road for two days"
              {...register("followUpNote")}
            />
            <FieldError
              id={`${id("followup-note")}-error`}
              message={errors.followUpNote?.message}
            />
          </div>
        )}
      </div>

      <EvidenceReferences evidence={evidence} />

      <div className="grid gap-2">
        <Button
          type="submit"
          size="2xl"
          className="w-full"
          disabled={submit.pending}
        >
          <SendHorizontal aria-hidden />
          {submit.pending ? "Submitting…" : t("officer.submitReport")}
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Goes to your station supervisor for review. {t("officer.notFir")}
        </p>
      </div>
    </form>
  );
}

/* ───────────────────────── Cards ───────────────────────── */

function IncidentSummary({ incident }: { incident: Incident }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <CategoryIcon
          categoryId={incident.categoryId}
          className="text-muted-foreground"
        />
        <span className="truncate">{incident.title}</span>
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        <span className="tnum font-mono">{incident.id}</span> ·{" "}
        {incident.location.area}
        {incident.resolvedAt && (
          <>
            {" "}
            · resolved <RelativeTime at={incident.resolvedAt} />
          </>
        )}
      </p>
    </div>
  );
}

function DueReportCard({
  incident,
  unitId,
  open,
  onToggle,
}: {
  incident: Incident;
  unitId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const panelId = `due-${incident.id}`;
  return (
    <OfficerCard as="li" className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40"
      >
        <IncidentSummary incident={incident} />
        <ToneChip tone="medium" dot>
          Due
        </ToneChip>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          id={panelId}
          className="grid gap-6 border-t border-border/70 p-4 sm:p-5"
        >
          <section aria-labelledby={`${panelId}-chain`}>
            <h3 id={`${panelId}-chain`} className="mb-3 text-sm font-semibold">
              {t("officer.handoff")}
            </h3>
            <HandoffChain
              incident={incident}
              evidenceCount={incident.evidenceIds.length}
            />
          </section>
          <section
            aria-labelledby={`${panelId}-form`}
            className="border-t border-border/70 pt-5"
          >
            <h3 id={`${panelId}-form`} className="mb-4 text-sm font-semibold">
              Preliminary response report
            </h3>
            <ReportForm incident={incident} unitId={unitId} />
          </section>
        </div>
      )}
    </OfficerCard>
  );
}

function SubmittedReportCard({ incident }: { incident: Incident }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const reviewed = incident.handoff.reportStatus === "reviewed";
  const panelId = `sub-${incident.id}`;
  return (
    <OfficerCard as="li" className="p-4">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <IncidentSummary incident={incident} />
        <ToneChip tone={reviewed ? "resolved" : "normal"} dot>
          {reviewed ? "Reviewed" : "Awaiting review"}
        </ToneChip>
      </div>

      <h3 className="mt-4 mb-3 text-sm font-semibold">
        {t("officer.handoff")}
      </h3>
      <HandoffChain
        incident={incident}
        evidenceCount={incident.evidenceIds.length}
      />

      <Button
        variant="ghost"
        size="xl"
        className="mt-3 -ml-3 text-primary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide report" : "View report"}
        <ChevronDown
          aria-hidden
          className={cn("transition-transform", open && "rotate-180")}
        />
      </Button>
      {open && (
        <p
          id={panelId}
          className="mt-1 rounded-xl border border-border bg-inset px-3.5 py-3 text-sm leading-relaxed whitespace-pre-line"
        >
          {incident.handoff.reportDraft ?? "The report text is not available."}
        </p>
      )}
    </OfficerCard>
  );
}

/* ───────────────────────── Screen ───────────────────────── */

function ReportsContent({ unitId }: { unitId: string }) {
  const t = useT();
  const params = useSearchParams();
  const { work } = useOfficer();
  const { reportsDue, history } = work;
  const submitted = history.filter(
    (i) =>
      i.handoff.reportStatus === "submitted" ||
      i.handoff.reportStatus === "reviewed",
  );
  // `undefined` means "nothing chosen yet": open the linked report, or the first one due.
  const [chosen, setChosen] = useState<string | null | undefined>(
    () => params.get("id") ?? undefined,
  );
  const openId =
    chosen === null
      ? null
      : reportsDue.some((i) => i.id === chosen)
        ? chosen
        : (reportsDue[0]?.id ?? null);

  return (
    <PageContainer width="wide">
      <PageHeader
        title={t("officer.reports")}
        description="Preliminary response reports for the incidents your unit attended, and where each one stands in the hand-off."
      />

      <p
        role="note"
        className="mb-5 flex items-start gap-2.5 rounded-2xl border border-normal/35 bg-normal-soft px-4 py-3 text-sm leading-relaxed text-normal-fg"
      >
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          {t("officer.notFir")} Any complaint or further official process is
          handled separately, through the authorised system.
        </span>
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="reports-due">
          <h2
            id="reports-due"
            className="mb-3 flex items-center gap-2 text-lg font-semibold"
          >
            {t("officer.reportsDue")}
            <span className="tnum text-sm font-normal text-muted-foreground">
              {reportsDue.length}
            </span>
          </h2>
          {reportsDue.length === 0 ? (
            <OfficerCard>
              <EmptyState
                icon={ClipboardCheck}
                title="No reports due"
                description="A preliminary response report becomes due when you complete a response."
              />
            </OfficerCard>
          ) : (
            <ul className="grid gap-3">
              {reportsDue.map((incident) => (
                <DueReportCard
                  key={incident.id}
                  incident={incident}
                  unitId={unitId}
                  open={incident.id === openId}
                  onToggle={() =>
                    setChosen(incident.id === openId ? null : incident.id)
                  }
                />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="reports-submitted">
          <h2
            id="reports-submitted"
            className="mb-3 flex items-center gap-2 text-lg font-semibold"
          >
            {t("officer.submittedReports")}
            <span className="tnum text-sm font-normal text-muted-foreground">
              {submitted.length}
            </span>
          </h2>
          {submitted.length === 0 ? (
            <OfficerCard>
              <BlankState
                icon={ClipboardList}
                title="Nothing submitted yet"
                description="Reports you submit appear here with their hand-off chain and review status."
              />
            </OfficerCard>
          ) : (
            <ul className="grid gap-3">
              {submitted.map((incident) => (
                <SubmittedReportCard key={incident.id} incident={incident} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  );
}

/** `/officer/reports` — reports the officer owes, reports already sent, and the hand-off for each. */
export function OfficerReportsScreen() {
  const { unit, unitId } = useOfficer();
  if (!unit || !unitId) return <NoUnitState />;
  return <ReportsContent unitId={unitId} />;
}
