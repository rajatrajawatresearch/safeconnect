"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  EyeOff,
  Loader2,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  useForm,
  useFormState,
  useWatch,
  type FieldErrors,
} from "react-hook-form";
import { PageContainer, Panel } from "@/components/shared/page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TONE } from "@/config/incident";
import { useAction } from "@/hooks/use-action";
import { useCategories } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import { citizenLocation } from "@/services";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Citizen, Location } from "@/types";
import { SectionTitle, StickyActions, scrollMainToTop } from "../ui";
import { KindOptions } from "./kind-chooser";
import {
  KIND_META,
  LAST_STEP,
  STEPS,
  areaLocation,
  defaultReportValues,
  reportSchema,
  type ReportData,
  type ReportField,
  type ReportKind,
  type ReportValues,
  type StepId,
} from "./model";
import {
  ContactStep,
  DangerStep,
  EvidenceStep,
  InvolvedStep,
  ReviewStep,
  WhatStep,
  WhenStep,
  WhereStep,
  useStepAnswers,
  type SetField,
} from "./steps";
import { submitReport, type SubmitProgress, type SubmitResult } from "./submit";

const STEP_HINT: Partial<
  Record<StepId, "report.where.hint" | "report.contact.hint">
> = {
  where: "report.where.hint",
  contact: "report.contact.hint",
};

/** Reading a position from the device takes a moment; the demo keeps that pause so the state is visible. */
const LOCATE_MS = 650;

const WHERE_STEP = STEPS.findIndex((s) => s.id === "where");
const WHERE_FIELDS = STEPS[WHERE_STEP].fields;

/** Segmented bar for phones: one segment per step. */
function StepProgress({ step }: { step: number }) {
  const t = useT();
  const label = t("report.progress", {
    current: step + 1,
    total: STEPS.length,
  });
  return (
    <div className="mb-4 md:hidden">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="truncate text-muted-foreground">
          {t(STEPS[step].short)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        aria-valuetext={`${label}: ${t(STEPS[step].title)}`}
        className="mt-2 flex gap-1"
      >
        {STEPS.map((s, index) => (
          <span
            key={s.id}
            aria-hidden
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index <= step ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Side summary from `md` up: every step, its answer so far, and a way back to it. */
function StepRail({
  step,
  reached,
  answers,
  onJump,
}: {
  step: number;
  reached: number;
  answers: Record<StepId, string | null>;
  onJump: (index: number) => void;
}) {
  const t = useT();
  return (
    <nav aria-label={t("report.rail.label")}>
      <h2 className="mb-3 text-sm font-semibold">{t("report.rail.title")}</h2>
      <ol>
        {STEPS.map((s, index) => {
          const done = index < step || (index <= reached && index !== step);
          const current = index === step;
          const enabled = index <= reached && !current;
          const answer = answers[s.id];
          const last = index === STEPS.length - 1;
          return (
            <li key={s.id} className="relative flex gap-3 pb-1">
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-8 bottom-0 left-[13px] w-px",
                    index < step ? "bg-primary/50" : "bg-border",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "tnum relative z-10 mt-1.5 grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                  current &&
                    "border-primary bg-primary text-primary-foreground",
                  !current &&
                    done &&
                    "border-primary/40 bg-accent text-accent-foreground",
                  !current &&
                    !done &&
                    "border-border bg-card text-muted-foreground",
                )}
              >
                {done && !current ? <Check className="size-3.5" /> : index + 1}
              </span>
              <button
                type="button"
                disabled={!enabled}
                onClick={() => onJump(index)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "min-h-11 min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left",
                  enabled && "hover:bg-muted",
                  !enabled && !current && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "block text-sm",
                    current ? "font-semibold" : "font-medium",
                  )}
                >
                  {t(s.title)}
                </span>
                {answer && index <= reached && (
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted-foreground">
                    {answer}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ReportWizard({
  kind,
  onKindChange,
  initialCategoryId,
  citizen,
  onExit,
  onDone,
}: {
  kind: ReportKind;
  onKindChange: (kind: ReportKind) => void;
  initialCategoryId: string;
  citizen: Citizen;
  /** Leave the wizard and return to the kind chooser. Called only after any discard confirmation. */
  onExit: () => void;
  onDone: (result: SubmitResult) => void;
}) {
  const t = useT();
  const { actor } = useSession();
  const categories = useCategories();
  const locationAllowed = usePrefsStore((s) => s.privacy.location);
  const offline = usePrefsStore((s) => s.connectivity === "offline");

  const form = useForm<ReportValues, unknown, ReportData>({
    resolver: zodResolver(reportSchema),
    mode: "onChange",
    defaultValues: {
      ...defaultReportValues(kind, initialCategoryId),
      // A tip never reads the device position, so the only way to give a place is already chosen.
      locationMode: kind === "tip" ? "area" : "",
    },
  });
  // Every field has a default, so the watched object is always complete.
  const values = useWatch({ control: form.control }) as ReportValues;
  const { isDirty } = useFormState({ control: form.control });

  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [attempted, setAttempted] = useState<number[]>([]);
  const [fromReview, setFromReview] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<Location | null>(null);
  const [locating, setLocating] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const progress = useRef<SubmitProgress>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const submit = useAction(submitReport);

  const location = useMemo(
    () =>
      values.locationMode === "current"
        ? deviceLocation
        : values.locationMode === "area"
          ? areaLocation(values.areaKey, values.landmark)
          : null,
    [deviceLocation, values.areaKey, values.landmark, values.locationMode],
  );
  const answers = useStepAnswers(values, location);
  const showErrors = attempted.includes(step);
  const current = STEPS[step];
  // A tip has no contact choice to make, so the question under that heading would mislead.
  const hintKey =
    current.id === "contact" && kind === "tip"
      ? undefined
      : STEP_HINT[current.id];
  const meta = KIND_META[kind];
  const KindIcon = meta.icon;

  // Move focus to the new question so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  // A reload or closed tab would silently drop a half-written report.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const set: SetField = (name, value) => {
    form.setValue(name, value, { shouldDirty: true, shouldTouch: true });
    // Rules that span fields (area needed only when "choose an area" is picked) are re-checked together.
    if (attempted.includes(step)) void form.trigger(current.fields);
  };

  const goTo = (index: number) => {
    setStep(index);
    setReached((r) => Math.max(r, index));
    scrollMainToTop();
  };

  const validate = async (fields: ReportField[]) =>
    fields.length === 0 || form.trigger(fields, { shouldFocus: true });

  const next = async () => {
    if (!(await validate(current.fields))) {
      setAttempted((a) => (a.includes(step) ? a : [...a, step]));
      return;
    }
    if (fromReview) {
      setFromReview(false);
      goTo(LAST_STEP);
    } else goTo(Math.min(step + 1, LAST_STEP));
  };

  const jump = async (index: number) => {
    if (index < step) return goTo(index);
    // Going forward past steps: everything in between must still be valid.
    const between = STEPS.slice(step, index).flatMap((s) => s.fields);
    if (await validate(between)) goTo(index);
    else setAttempted((a) => (a.includes(step) ? a : [...a, step]));
  };

  const requestExit = () => (isDirty ? setConfirmExit(true) : onExit());
  const back = () => (step === 0 ? requestExit() : goTo(step - 1));

  const locate = async () => {
    setLocating(true);
    await new Promise((resolve) => setTimeout(resolve, LOCATE_MS));
    setDeviceLocation(citizenLocation(citizen, "report"));
    form.setValue("located", true, { shouldDirty: true });
    setLocating(false);
    // Clears "wait for your location" if the citizen had already tried to continue.
    void form.trigger(WHERE_FIELDS);
  };

  const pickCurrentLocation = () => {
    set("locationMode", "current");
    if (locationAllowed && !deviceLocation && !locating) void locate();
  };

  const changeKind = (nextKind: ReportKind) => {
    setTypeOpen(false);
    if (nextKind === kind) return;
    if (nextKind === "tip") {
      form.setValue("contact", "none", { shouldDirty: true });
      form.setValue("locationMode", "area", { shouldDirty: true });
      form.setValue("located", false);
      setDeviceLocation(null);
    } else if (kind === "tip") {
      form.setValue("contact", "chat", { shouldDirty: true });
    }
    onKindChange(nextKind);
  };

  const send = async (data: ReportData) => {
    if (!location) return goTo(WHERE_STEP);
    setFailed(false);
    const result = await submit.run(
      {
        kind,
        values: data,
        location,
        citizen,
        actor,
        category: categories.find((c) => c.id === data.categoryId),
      },
      progress.current,
    );
    if (result) onDone(result);
    else setFailed(true);
  };

  /** Something changed after its step was passed: go to the first step that needs fixing. */
  const fixFirstInvalid = (errors: FieldErrors<ReportValues>) => {
    const index = STEPS.findIndex((s) =>
      s.fields.some((field) => errors[field]),
    );
    if (index < 0) return;
    setAttempted((a) => (a.includes(index) ? a : [...a, index]));
    goTo(index);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (step === LAST_STEP)
      return void form.handleSubmit(send, fixFirstInvalid)(event);
    // Enter inside a field moves on rather than sending a half-finished report.
    event.preventDefault();
    void next();
  };

  const stepProps = { form, values, set, showErrors, kind };

  return (
    <PageContainer
      width="wide"
      className="flex min-h-full flex-col pb-0 sm:pb-0 md:pb-6"
    >
      <header className="mb-4 flex items-center gap-2">
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
          {t("report.title")}
        </h1>
        <Button
          type="button"
          variant="ghost"
          onClick={requestExit}
          className="-mr-2 h-11 px-3 text-[15px]"
        >
          {t("action.cancel")}
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTypeOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card py-1 pr-3 pl-1.5 text-[15px] font-medium shadow-card transition-colors hover:border-input"
        >
          <span
            className={cn(
              "grid size-8 place-items-center rounded-full",
              TONE[meta.tone].soft,
            )}
          >
            <KindIcon aria-hidden className="size-4" />
          </span>
          {t(meta.title)}
          <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
          <span className="sr-only">{t("report.changeType.title")}</span>
        </button>
        {kind === "tip" && (
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <EyeOff aria-hidden className="size-4 shrink-0" />
            {t("report.tip.strip")}
          </p>
        )}
      </div>

      <StepProgress step={step} />

      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-1 flex-col md:grid md:flex-none md:grid-cols-[minmax(0,1fr)_16rem] md:items-start md:gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <Panel
            aria-labelledby="report-step-title"
            className="mb-4 rounded-2xl p-4 min-[400px]:p-5 sm:p-6 md:mb-0"
          >
            <p className="mb-1 hidden text-sm text-muted-foreground md:block">
              {t("report.progress", {
                current: step + 1,
                total: STEPS.length,
              })}
            </p>
            <SectionTitle
              id="report-step-title"
              headingRef={heading}
              hint={hintKey ? t(hintKey) : undefined}
            >
              {t(current.title)}
            </SectionTitle>

            {current.id === "what" && <WhatStep {...stepProps} />}
            {current.id === "danger" && (
              <DangerStep
                {...stepProps}
                onSwitchToEmergency={() => changeKind("emergency")}
              />
            )}
            {current.id === "where" && (
              <WhereStep
                {...stepProps}
                location={location}
                locating={locating}
                locationAllowed={locationAllowed}
                onUseCurrent={pickCurrentLocation}
              />
            )}
            {current.id === "when" && <WhenStep {...stepProps} />}
            {current.id === "involved" && <InvolvedStep {...stepProps} />}
            {current.id === "evidence" && <EvidenceStep {...stepProps} />}
            {current.id === "contact" && (
              <ContactStep {...stepProps} citizen={citizen} />
            )}
            {current.id === "review" && (
              <ReviewStep
                values={values}
                kind={kind}
                answers={answers}
                failed={failed}
                offline={offline}
                onEdit={(index) => {
                  setFromReview(true);
                  goTo(index);
                }}
              />
            )}
          </Panel>

          <StickyActions>
            <Button
              type="button"
              variant="outline"
              size="xl"
              onClick={back}
              disabled={submit.pending}
            >
              <ArrowLeft aria-hidden />
              {t("action.back")}
            </Button>
            {step === LAST_STEP ? (
              <Button
                type="submit"
                size="xl"
                disabled={submit.pending}
                className="min-w-0 flex-1 md:ml-auto md:flex-none"
              >
                {submit.pending ? (
                  <Loader2 aria-hidden className="animate-spin" />
                ) : (
                  <Send aria-hidden />
                )}
                <span className="truncate">
                  {submit.pending
                    ? t("report.submitting")
                    : failed
                      ? t("action.retry")
                      : t(meta.submit)}
                </span>
              </Button>
            ) : (
              <Button
                type="button"
                size="xl"
                onClick={next}
                disabled={locating}
                className="min-w-0 flex-1 md:ml-auto md:flex-none"
              >
                <span className="truncate">
                  {fromReview ? t("report.backToReview") : t("action.next")}
                </span>
                <ArrowRight aria-hidden />
              </Button>
            )}
          </StickyActions>
        </div>

        <aside className="hidden md:sticky md:top-6 md:block">
          <Panel className="rounded-2xl p-4">
            <StepRail
              step={step}
              reached={reached}
              answers={answers}
              onJump={jump}
            />
          </Panel>
        </aside>
      </form>

      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("report.changeType.title")}</DialogTitle>
            <DialogDescription>{t("report.changeType.body")}</DialogDescription>
          </DialogHeader>
          <KindOptions selected={kind} onSelect={changeKind} compact />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("report.cancel.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("report.cancel.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="lg" className="h-11">
              {t("report.cancel.keep")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="lg"
              className="h-11"
              onClick={onExit}
            >
              {t("report.cancel.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
