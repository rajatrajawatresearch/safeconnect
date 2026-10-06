"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CircleCheckBig,
  MapPinCheck,
  Phone,
  PhoneOff,
  ShieldPlus,
  Video,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { ChatThread } from "@/components/shared/chat-thread";
import { SecureSession } from "@/components/shared/secure-session";
import {
  ErrorState,
  ListSkeleton,
  RestrictedState,
} from "@/components/shared/states";
import { ToneChip } from "@/components/shared/status-chips";
import { EtaCountdown } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useLiveSession } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { formatKm } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ServiceError, services } from "@/services";
import type { Incident, SessionType, Unit } from "@/types";
import { ResponsiveSheet } from "./officer-ui";
import { OpenInMapsLink, RouteMap, useRouteProgress } from "./route-map";

const DIALOG_BODY = "max-h-[85dvh] overflow-y-auto sm:max-w-md";

/* ───────────────────────── Decline ───────────────────────── */

const DECLINE_REASONS = [
  "Already engaged",
  "Vehicle issue",
  "Too far — closer unit available",
  "Other",
] as const;

function DeclineForm({
  incident,
  unitId,
  onCancel,
  onDeclined,
}: {
  incident: Incident;
  unitId: string;
  onCancel: () => void;
  onDeclined: () => void;
}) {
  const { actor } = useSession();
  const [choice, setChoice] = useState("");
  const [other, setOther] = useState("");
  const decline = useAction(services.units.rejectAssignment, {
    success: "Assignment declined. The control room has been told.",
    onSuccess: onDeclined,
  });
  const isOther = choice === "Other";
  const reason = isOther ? other.trim() : choice;
  const valid = choice !== "" && (!isOther || reason.length >= 5);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid || decline.pending) return;
    void decline.run(incident.id, unitId, reason, actor);
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Decline this assignment</DialogTitle>
        <DialogDescription>
          A reason is required. It goes to the control room so another unit can
          be assigned without delay.
        </DialogDescription>
      </DialogHeader>

      <RadioGroup
        value={choice}
        onValueChange={setChoice}
        aria-label="Reason for declining"
      >
        {DECLINE_REASONS.map((option) => (
          <label
            key={option}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 text-sm font-medium transition-colors",
              choice === option
                ? "border-primary/60 bg-accent/60"
                : "border-border hover:bg-muted/50",
            )}
          >
            <RadioGroupItem value={option} />
            {option}
          </label>
        ))}
      </RadioGroup>

      {isOther && (
        <div className="grid gap-1.5">
          <Label htmlFor="decline-other">What is the reason?</Label>
          <Textarea
            id="decline-other"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            maxLength={160}
            rows={3}
            autoFocus
            aria-describedby="decline-other-hint"
            placeholder="For example: attending a traffic stop at Stadium Circle"
          />
          <p id="decline-other-hint" className="text-xs text-muted-foreground">
            At least five characters.
          </p>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" size="xl" onClick={onCancel}>
          Keep assignment
        </Button>
        <Button
          type="submit"
          variant="destructive"
          size="xl"
          disabled={!valid || decline.pending}
        >
          {decline.pending ? "Declining…" : "Decline assignment"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DeclineDialog({
  open,
  onOpenChange,
  incident,
  unitId,
  onDeclined,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  unitId: string;
  onDeclined?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_BODY}>
        <DeclineForm
          incident={incident}
          unitId={unitId}
          onCancel={() => onOpenChange(false)}
          onDeclined={() => {
            onOpenChange(false);
            onDeclined?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Request backup ───────────────────────── */

const BACKUP_REASONS = [
  "More than one suspect present",
  "Crowd is gathering",
  "Medical help needed",
  "Women's help unit needed",
];

function BackupForm({
  incident,
  unit,
  onCancel,
  onDone,
}: {
  incident: Incident;
  unit: Unit;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { actor, persona } = useSession();
  const [note, setNote] = useState("");
  const nearest = useQuery({
    queryKey: ["officer", "backup-units", incident.id],
    queryFn: () => services.dispatch.recommendUnits(incident.id),
    staleTime: 0,
  });
  const request = useAction(
    async (text: string) => {
      await services.units.updateStage(
        incident.id,
        unit.id,
        "assistance_requested",
        actor,
      );
      if (text)
        await services.communication.sendMessage(
          incident.id,
          "internal",
          `Backup requested: ${text}`,
          actor,
          `${persona.name} · Unit ${unit.callSign}`,
        );
    },
    { success: "Backup requested. Control room alerted.", onSuccess: onDone },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (request.pending) return;
    void request.run(note.trim());
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Request backup</DialogTitle>
        <DialogDescription>
          The control room is alerted at once and decides which unit to send.
          Your stage changes to assistance requested.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="backup-note">Short note for the control room</Label>
        <Textarea
          id="backup-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={160}
          rows={2}
          placeholder="Optional. What do you need and why?"
        />
        <div className="flex flex-wrap gap-2">
          {BACKUP_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setNote(reason)}
              aria-pressed={note === reason}
              className={cn(
                "min-h-9 rounded-full border px-3 text-[13px] font-medium transition-colors",
                note === reason
                  ? "border-primary/60 bg-accent text-accent-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {reason}
            </button>
          ))}
        </div>
      </div>

      <section aria-labelledby="backup-nearest" className="grid gap-2">
        <h3 id="backup-nearest" className="text-sm font-medium">
          Nearest available units
        </h3>
        {nearest.isPending ? (
          <ListSkeleton rows={2} />
        ) : nearest.isError ? (
          <ErrorState
            compact
            className="rounded-xl border border-border py-5"
            offline={
              nearest.error instanceof ServiceError &&
              nearest.error.code === "offline"
            }
            onRetry={() => void nearest.refetch()}
          />
        ) : nearest.data.length === 0 ? (
          <p className="rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            No unit is free right now. The control room will release one as soon
            as it can.
          </p>
        ) : (
          <ul className="grid gap-2">
            {nearest.data.slice(0, 2).map((option) => (
              <li
                key={option.unit.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="tnum truncate font-mono text-sm font-medium">
                    {option.unit.callSign}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {option.unit.vehicle} · crew of {option.unit.crew}
                  </p>
                </div>
                <p className="tnum shrink-0 text-right text-[13px] text-muted-foreground">
                  {formatKm(option.distanceKm)}
                  <span className="block text-xs">
                    about {option.etaMin} min
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          For your awareness only. Dispatch is the control room&apos;s decision.
        </p>
      </section>

      <DialogFooter>
        <Button type="button" variant="outline" size="xl" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="xl" disabled={request.pending}>
          <ShieldPlus aria-hidden />
          {request.pending ? "Requesting…" : "Request backup"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function BackupDialog({
  open,
  onOpenChange,
  incident,
  unit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  unit: Unit;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_BODY}>
        <BackupForm
          incident={incident}
          unit={unit}
          onCancel={() => onOpenChange(false)}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Complete response ───────────────────────── */

const RESOLUTION_STARTERS = [
  "Situation controlled on scene. The citizen is safe.",
  "Individuals had left before arrival. Area checked, nothing further found.",
  "Confirmed with the reporter as a false alarm. No action required.",
];

const MIN_RESOLUTION = 15;

function CompleteForm({
  incident,
  unitId,
  onCancel,
  onCompleted,
}: {
  incident: Incident;
  unitId: string;
  onCancel: () => void;
  onCompleted: () => void;
}) {
  const { actor } = useSession();
  const [summary, setSummary] = useState("");
  const [touched, setTouched] = useState(false);
  const complete = useAction(services.units.completeResponse, {
    success: "Response completed. Your report is now due.",
    onSuccess: onCompleted,
  });
  const text = summary.trim();
  const valid = text.length >= MIN_RESOLUTION;
  const showError = touched && !valid;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!valid || complete.pending) return;
    void complete.run(incident.id, unitId, text, actor);
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Complete response</DialogTitle>
        <DialogDescription>
          {incident.id} will be marked resolved and your unit becomes available.
          A preliminary response report then becomes due from you.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="resolution">Resolution summary</Label>
        <Textarea
          id="resolution"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={4}
          maxLength={400}
          aria-invalid={showError}
          aria-describedby="resolution-hint"
          placeholder="What was the outcome on scene?"
        />
        <p
          id="resolution-hint"
          role={showError ? "alert" : undefined}
          className={cn(
            "text-xs",
            showError ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {showError
            ? `Write at least ${MIN_RESOLUTION} characters so the record is useful.`
            : "The citizen sees this summary on their incident."}
        </p>
        <div className="grid gap-2">
          {RESOLUTION_STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => setSummary(starter)}
              className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-left text-[13px] leading-snug hover:bg-muted"
            >
              {starter}
            </button>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="xl" onClick={onCancel}>
          Not yet
        </Button>
        <Button
          type="submit"
          variant="success"
          size="xl"
          disabled={complete.pending}
        >
          <CircleCheckBig aria-hidden />
          {complete.pending ? "Completing…" : "Complete response"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CompleteDialog({
  open,
  onOpenChange,
  incident,
  unitId,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  unitId: string;
  onCompleted?: (incidentId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_BODY}>
        <CompleteForm
          incident={incident}
          unitId={unitId}
          onCancel={() => onOpenChange(false)}
          onCompleted={() => {
            onOpenChange(false);
            onCompleted?.(incident.id);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Secure session ───────────────────────── */

/** Full-screen on phones. The media is simulated; no microphone or camera is opened. */
export function SessionDialog({
  incident,
  type,
  onClose,
}: {
  incident: Incident;
  type: SessionType | null;
  onClose: () => void;
}) {
  const { actor } = useSession();
  const live = useLiveSession(incident.id);
  const endSession = useAction(services.communication.endSession);

  // Leaving by Escape or a tap outside must hang up too, not leave a session marked live.
  const dismiss = () => {
    if (live) void endSession.run(live.id, actor);
    onClose();
  };

  return (
    <Dialog
      open={type !== null}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-dvh max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[min(42rem,90dvh)] sm:max-w-md sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">
          Secure session with {incident.reporterName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Simulated {type ?? "voice"} session on {incident.id}. No microphone or
          camera is used in the demo.
        </DialogDescription>
        {type && (
          <SecureSession
            incident={incident}
            type={type}
            onEnd={onClose}
            className="min-h-0 flex-1"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Contact citizen ───────────────────────── */

export const CITIZEN_QUICK_REPLIES = [
  "This is the responding officer. I am on my way.",
  "I have arrived. Stay where you are.",
  "Are you safe right now?",
  "Where exactly are you?",
];

export function ContactSheet({
  open,
  onOpenChange,
  incident,
  onStartSession,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  onStartSession: (type: SessionType) => void;
}) {
  const t = useT();
  const { can } = useSession();
  const live = useLiveSession(incident.id);
  const reachable = Boolean(incident.citizenId);
  const mayCall = reachable && !incident.silent;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("officer.contactCitizen")}
      description={
        <>
          {incident.anonymous ? "Anonymous reporter" : incident.reporterName}
          {incident.reporterPhoneMasked && (
            <span className="tnum font-mono text-[13px]">
              {" "}
              · {incident.reporterPhoneMasked}
            </span>
          )}
        </>
      }
    >
      {!can("communication.citizen") ? (
        <RestrictedState description="Your role does not include citizen communication." />
      ) : (
        <>
          <div className="shrink-0 border-b border-border/70 px-4 py-3">
            {incident.silent ? (
              <p
                role="note"
                className="flex items-center gap-2 rounded-xl bg-high-soft px-3 py-2.5 text-sm font-medium text-high-fg"
              >
                <PhoneOff aria-hidden className="size-4 shrink-0" />
                {t("officer.chatOnly")}
              </p>
            ) : mayCall ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="xl"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onStartSession("voice")}
                >
                  <Phone aria-hidden />
                  {live
                    ? "Rejoin secure session"
                    : "Start secure voice session"}
                </Button>
                {can("communication.video") && (
                  <Button
                    size="icon-xl"
                    variant="outline"
                    aria-label="Start secure video session"
                    onClick={() => onStartSession("video")}
                  >
                    <Video aria-hidden />
                  </Button>
                )}
              </div>
            ) : (
              <p className="rounded-xl bg-muted px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
                This incident was not raised from the citizen app, so there is
                no in-app chat or secure session. Ask the control room to relay.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              The citizen&apos;s number stays masked. Sessions run through the
              platform and are recorded on the incident timeline.
            </p>
          </div>
          <ChatThread
            incidentId={incident.id}
            channel="citizen"
            quickReplies={CITIZEN_QUICK_REPLIES}
            disabled={!reachable}
            disabledReason="No in-app contact for this reporter."
            className="min-h-0 flex-1"
          />
        </>
      )}
    </ResponsiveSheet>
  );
}

/* ───────────────────────── Control room ───────────────────────── */

export const CONTROL_QUICK_REPLIES = [
  "On scene.",
  "Citizen located and safe.",
  "Suspects have left the area.",
  "Need an ambulance here.",
  "Situation under control.",
];

export function ControlRoomSheet({
  open,
  onOpenChange,
  incident,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
}) {
  const t = useT();
  const { can } = useSession();
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("officer.controlRoom")}
      description={
        <>
          Internal thread on{" "}
          <span className="tnum font-mono text-[13px]">{incident.id}</span>
          {incident.operatorName ? ` · ${incident.operatorName}` : ""}
        </>
      }
    >
      {can("communication.internal") ? (
        <ChatThread
          incidentId={incident.id}
          channel="internal"
          quickReplies={CONTROL_QUICK_REPLIES}
          placeholder="Message the control room…"
          className="min-h-0 flex-1"
        />
      ) : (
        <RestrictedState description="Your role does not include internal communication." />
      )}
    </ResponsiveSheet>
  );
}

/* ───────────────────────── Navigation ───────────────────────── */

/** Large map for the run. One thumb reaches both actions at the bottom. */
export function NavigationDialog({
  open,
  onOpenChange,
  incident,
  unit,
  onArrived,
  arriving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  unit: Unit;
  /** Present while the unit is still on the way. */
  onArrived?: () => void;
  arriving?: boolean;
}) {
  const t = useT();
  const { position, km } = useRouteProgress(unit, incident);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-dvh max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[min(46rem,92dvh)] sm:max-w-3xl sm:rounded-2xl">
        <DialogHeader className="shrink-0 px-4 pt-4 pr-12 pb-3">
          <DialogTitle>{t("officer.navigate")}</DialogTitle>
          <DialogDescription className="truncate">
            {incident.location.address}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RouteMap
            unit={unit}
            incident={incident}
            interactive
            className="min-h-0 flex-1"
          />
        )}
        <div className="pb-safe shrink-0 border-t border-border bg-card">
          <div className="grid gap-3 px-4 py-3">
            <dl className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("officer.distance")}
                </dt>
                <dd className="tnum text-xl font-semibold tracking-tight">
                  {formatKm(km)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("officer.eta")}
                </dt>
                <dd className="text-xl font-semibold tracking-tight">
                  <EtaCountdown at={incident.etaAt} />
                </dd>
              </div>
              {incident.location.landmark && (
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Landmark</dt>
                  <dd className="truncate text-sm font-medium">
                    {incident.location.landmark}
                  </dd>
                </div>
              )}
              <ToneChip tone="neutral" variant="outline" className="ml-auto">
                Straight-line guide
              </ToneChip>
            </dl>
            <div className="flex gap-2">
              <OpenInMapsLink
                from={position}
                to={incident.location}
                className="flex-1"
              />
              {onArrived && (
                <Button
                  variant="success"
                  size="xl"
                  className="flex-1"
                  disabled={arriving}
                  onClick={onArrived}
                >
                  <MapPinCheck aria-hidden />
                  {arriving ? "Marking…" : t("officer.arrived")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
