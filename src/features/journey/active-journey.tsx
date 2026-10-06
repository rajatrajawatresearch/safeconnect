"use client";

import {
  ArrowRight,
  BellRing,
  CircleCheck,
  Flag,
  HandHelping,
  Loader2,
  MapPin,
  ShieldCheck,
  Siren,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Panel } from "@/components/shared/page";
import { ToneChip } from "@/components/shared/status-chips";
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
import { StickyActions } from "@/features/citizen-flows/ui";
import { useHoldToConfirm } from "@/features/sos/use-hold-to-confirm";
import { useAction } from "@/hooks/use-action";
import { useIsMd } from "@/hooks/use-mounted";
import { useNow } from "@/hooks/use-now";
import { useT } from "@/hooks/use-t";
import { formatDuration, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type { Citizen, Journey } from "@/types";
import { JourneyMap } from "./journey-map";
import {
  journeyClock,
  journeyPosition,
  locationOnRoute,
} from "./journey-model";

/**
 * "I'm safe" and "Need help". Rendered twice by the screen: in the side column from `md` up and as
 * the sticky bar on phones, so the two actions are always within reach.
 */
export function SafetyActions({
  journey,
  citizen,
  emergencyActive,
  className,
}: {
  journey: Journey;
  citizen: Citizen;
  /** An emergency is already open for this citizen, so asking for help returns to it instead of raising another. */
  emergencyActive: boolean;
  className?: string;
}) {
  const t = useT();
  const router = useRouter();
  const checkIn = useAction(services.journeys.checkIn, {
    success: t("journey.safe.done"),
  });
  const help = useAction(services.journeys.requestHelp, {
    onSuccess: () => router.push("/citizen/sos"),
  });
  const busy = checkIn.pending || help.pending;

  return (
    <div className={cn("flex w-full items-stretch gap-3", className)}>
      <Button
        type="button"
        variant="success"
        size="2xl"
        disabled={busy}
        onClick={() => checkIn.run(journey.id)}
        className="min-w-0 flex-1 px-3 md:flex-none xl:flex-1"
      >
        {checkIn.pending ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <ShieldCheck aria-hidden className="max-[379px]:hidden" />
        )}
        <span className="truncate">{t("journey.safe")}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="2xl"
        disabled={busy}
        onClick={() =>
          emergencyActive
            ? router.push("/citizen/sos")
            : help.run(
                journey.id,
                citizen,
                journeyPosition(journey, Date.now()),
              )
        }
        className="min-w-0 flex-1 border-high/50 px-3 text-high-fg hover:bg-high-soft hover:text-high-fg md:flex-none xl:flex-1 dark:border-high/50"
      >
        {help.pending ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <HandHelping aria-hidden className="max-[379px]:hidden" />
        )}
        <span className="truncate">{t("journey.help")}</span>
      </Button>
    </div>
  );
}

/** Sticky copy of the safety actions for phones. Place it last in the page so it spans the whole scroll. */
export function SafetyActionBar(props: {
  journey: Journey;
  citizen: Citizen;
  emergencyActive: boolean;
}) {
  return (
    <StickyActions className="md:hidden">
      <SafetyActions {...props} />
    </StickyActions>
  );
}

/** Press-and-hold SOS. The route position goes with it so responders start from where the citizen is. */
function HoldForSos({
  journey,
  citizen,
}: {
  journey: Journey;
  citizen: Citizen;
}) {
  const t = useT();
  const router = useRouter();
  const sos = useAction(services.sos.trigger, {
    onSuccess: () => router.push("/citizen/sos"),
  });
  const hold = useHoldToConfirm({
    durationMs: 3000,
    disabled: sos.pending,
    onConfirm: () => {
      void sos.run({
        citizen,
        location: locationOnRoute(
          journeyPosition(journey, Date.now()),
          journey,
        ),
      });
    },
  });

  return (
    <div>
      <button
        type="button"
        {...hold.handlers}
        disabled={sos.pending}
        aria-describedby="journey-sos-hint"
        className="relative flex h-16 w-full touch-none items-center justify-center overflow-hidden rounded-2xl bg-critical text-lg font-semibold text-critical-on transition-transform select-none focus-visible:ring-3 focus-visible:ring-critical/30 active:scale-[0.99] disabled:opacity-60"
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-white/25"
          style={{ width: `${hold.progress * 100}%` }}
        />
        <span className="relative flex items-center gap-2.5">
          {sos.pending ? (
            <Loader2 aria-hidden className="size-5 animate-spin" />
          ) : (
            <Siren aria-hidden className="size-5" />
          )}
          {hold.holding ? (
            <>
              {t("citizen.sos.keepHolding")}
              <span className="tnum">{hold.secondsLeft}</span>
            </>
          ) : (
            t("citizen.sos.hold")
          )}
        </span>
      </button>
      <p
        id="journey-sos-hint"
        className="mt-2 text-sm leading-relaxed text-muted-foreground"
      >
        {t("journey.sos.hint")}
      </p>
    </div>
  );
}

/**
 * One timer of the pair at the top of the journey card. The three parts are siblings in a shared
 * grid so that labels, values and captions line up across both timers even when a label wraps.
 */
function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "warn";
}) {
  return (
    <>
      <dt className="self-end text-sm text-muted-foreground">{label}</dt>
      <dd
        role="timer"
        aria-label={label}
        // Sized so two timers always sit side by side, from a 320px phone to the narrow tablet column.
        className={cn(
          "tnum mt-0.5 font-mono text-2xl font-semibold tracking-tight min-[400px]:text-3xl sm:text-4xl md:text-2xl lg:text-3xl xl:text-4xl",
          tone === "warn" && "text-high-fg",
        )}
      >
        {value}
      </dd>
      <dd className="mt-0.5 text-sm text-muted-foreground">{sub}</dd>
    </>
  );
}

/** The running journey: timers, route, who it is shared with, the next safety check and every action. */
export function ActiveJourney({
  journey,
  citizen,
  emergencyActive,
}: {
  journey: Journey;
  citizen: Citizen;
  emergencyActive: boolean;
}) {
  const t = useT();
  const now = useNow();
  const mapNow = useNow(2000);
  const isMd = useIsMd();
  const contacts = useDemoStore((s) => s.contacts);
  const [confirmStop, setConfirmStop] = useState(false);

  const complete = useAction(services.journeys.complete, {
    success: t("journey.arrived.done"),
  });
  const stop = useAction(services.journeys.stop, {
    success: t("journey.stopped"),
  });

  const shared = useMemo(
    () => contacts.filter((c) => journey.contactIds.includes(c.id)),
    [contacts, journey.contactIds],
  );
  const position = useMemo(
    () => journeyPosition(journey, mapNow),
    [journey, mapNow],
  );
  const clock = journeyClock(journey, now);
  const status = clock.checkOverdue
    ? ({ label: "journey.status.overdue", tone: "high" } as const)
    : clock.late
      ? ({ label: "journey.status.late", tone: "medium" } as const)
      : ({ label: "journey.status.active", tone: "normal" } as const);
  const busy = complete.pending || stop.pending;

  return (
    <div className="space-y-4 md:grid md:grid-cols-[minmax(0,1fr)_21rem] md:items-start md:gap-6 md:space-y-0 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-4">
        {clock.checkOverdue && (
          <div
            role="alert"
            className="flex gap-3 rounded-2xl border border-high/40 bg-high-soft p-4"
          >
            <BellRing
              aria-hidden
              className="mt-0.5 size-6 shrink-0 text-high-fg"
            />
            <div className="min-w-0">
              <p className="text-lg font-semibold">
                {t("journey.check.overdueTitle")}
              </p>
              <p className="mt-1 text-[15px] leading-relaxed text-foreground/80">
                {t("journey.check.overdueBody")}
              </p>
            </div>
          </div>
        )}

        <Panel className="rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <ToneChip tone={status.tone} size="md" dot>
              {t(status.label)}
            </ToneChip>
            <span className="text-sm text-muted-foreground">
              {t("journey.sharing.live")}
            </span>
          </div>
          <h2 className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-semibold tracking-tight sm:text-2xl">
            <span className="min-w-0 break-words">{journey.from.label}</span>
            <ArrowRight
              aria-hidden
              className="size-5 shrink-0 text-muted-foreground"
            />
            <span className="sr-only">{t("journey.to")}</span>
            <span className="min-w-0 break-words">
              {journey.destination.label}
            </span>
          </h2>

          <dl className="mt-5 grid grid-flow-col grid-cols-2 grid-rows-[auto_auto_auto] gap-x-4">
            <Metric
              label={t("journey.elapsed")}
              value={formatDuration(clock.elapsedSec)}
              sub={t("journey.startedAt", {
                time: formatTime(journey.startedAt),
              })}
            />
            <Metric
              label={clock.late ? t("journey.lateBy") : t("journey.remaining")}
              value={formatDuration(Math.abs(clock.remainingSec))}
              sub={t("journey.arrivalAt", {
                time: formatTime(journey.expectedArrivalAt),
              })}
              tone={clock.late ? "warn" : undefined}
            />
          </dl>

          <div
            role="progressbar"
            aria-label={t("journey.progress")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clock.progress * 100)}
            className="mt-5 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-1000 ease-linear",
                clock.late ? "bg-high" : "bg-primary",
              )}
              style={{ width: `${clock.progress * 100}%` }}
            />
          </div>
        </Panel>

        <Panel className="overflow-hidden rounded-2xl">
          <div className="h-60 sm:h-72 md:h-[26rem]">
            <JourneyMap
              journey={journey}
              position={position}
              interactive={isMd}
            />
          </div>
          <div className="space-y-2 px-4 py-3 text-sm">
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/20"
                />
                <span className="ml-1">{t("journey.map.you")}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="truncate">{journey.destination.label}</span>
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {t("journey.map.caption")}
            </p>
          </div>
        </Panel>
      </div>

      <div className="space-y-4 md:sticky md:top-6">
        <Panel className="rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl",
                clock.checkOverdue
                  ? "bg-high-soft text-high-fg"
                  : "bg-accent text-accent-foreground",
              )}
            >
              <BellRing aria-hidden className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">
                {t("journey.nextCheck")}
              </p>
              <p
                role="timer"
                aria-label={t("journey.nextCheck")}
                className={cn(
                  "tnum font-mono text-2xl font-semibold tracking-tight",
                  clock.checkOverdue && "text-high-fg",
                )}
              >
                {clock.checkOverdue
                  ? t("journey.check.overdueBy", {
                      time: formatDuration(-clock.checkInSec),
                    })
                  : formatDuration(clock.checkInSec)}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("journey.check.every", { n: journey.checkIntervalMin })} ·{" "}
                {t("journey.lastCheck", {
                  time: formatTime(journey.lastCheckInAt),
                })}
              </p>
            </div>
          </div>
          <SafetyActions
            journey={journey}
            citizen={citizen}
            emergencyActive={emergencyActive}
            className="mt-4 hidden md:flex md:flex-col xl:flex-row"
          />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("journey.check.note")}
          </p>
        </Panel>

        {/* With an emergency already open, the way back to it is the notice at the top of the page. */}
        {!emergencyActive && (
          <Panel className="rounded-2xl p-5">
            <h3 className="mb-3 text-base font-semibold">
              {t("journey.sos.title")}
            </h3>
            <HoldForSos journey={journey} citizen={citizen} />
          </Panel>
        )}

        <Panel className="rounded-2xl p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Users aria-hidden className="size-4 text-muted-foreground" />
            {t("journey.sharedWith")}
          </h3>
          {shared.length === 0 ? (
            <p className="mt-2 text-[15px] text-muted-foreground">
              {t("journey.sharedWithNone")}
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {shared.map((contact) => (
                <li key={contact.id} className="flex items-center gap-3">
                  <CircleCheck
                    aria-hidden
                    className="size-4 shrink-0 text-resolved-fg"
                  />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                    {contact.name}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {contact.relation}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("journey.shared.note")}
          </p>

          <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
            <Button
              type="button"
              size="xl"
              disabled={busy}
              onClick={() => complete.run(journey.id)}
            >
              {complete.pending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : (
                <Flag aria-hidden />
              )}
              {t("journey.arrived")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xl"
              disabled={busy}
              onClick={() => setConfirmStop(true)}
            >
              {t("journey.stop")}
            </Button>
          </div>
        </Panel>
      </div>

      <AlertDialog open={confirmStop} onOpenChange={setConfirmStop}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("journey.stop.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("journey.stop.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="lg" className="h-11">
              {t("journey.stop.keep")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="lg"
              className="h-11"
              onClick={() => stop.run(journey.id)}
            >
              {t("journey.stop")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
