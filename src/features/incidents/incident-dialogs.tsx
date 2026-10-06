"use client";

import { useId, useState } from "react";
import { SecureSession } from "@/components/shared/secure-session";
import { PriorityBadge } from "@/components/shared/status-chips";
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ESCALATION_LEVEL_LABEL } from "@/config/incident";
import { STATIONS } from "@/data/demo/geo";
import { useAction } from "@/hooks/use-action";
import { useIncident, useLiveSession, useUnits } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { Incident, SessionType } from "@/types";
import { liveAssignments, stationName } from "./incident-rules";

interface DialogProps {
  incidentId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function IncidentLine({ incident }: { incident: Incident }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <PriorityBadge priority={incident.priority} variant="soft" />
      <span className="tnum font-mono text-xs">{incident.id}</span>
      <span>
        {incident.title} · {incident.location.area}
      </span>
    </span>
  );
}

function Header({
  title,
  incident,
}: {
  title: string;
  incident: Incident | undefined;
}) {
  return (
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription asChild>
        <div className="text-sm text-muted-foreground">
          {incident ? (
            <IncidentLine incident={incident} />
          ) : (
            "Unable to load the incident."
          )}
        </div>
      </DialogDescription>
    </DialogHeader>
  );
}

/** One-tap phrases that fill a text field. Editing afterwards is expected. */
function Suggestions({
  items,
  onPick,
  label,
}: {
  items: string[];
  onPick: (text: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── Resolve ───────────────────────── */

const RESOLUTION_PHRASES = [
  "Situation controlled on scene. No further police action required at this time.",
  "Citizen is safe. Unit remained until the citizen confirmed they needed nothing further.",
  "Attended and assessed. Referred for follow-up at the station.",
];

function ResolveBody({
  incidentId,
  initialNote,
  onDone,
}: {
  incidentId: string;
  initialNote?: string;
  onDone: () => void;
}) {
  const incident = useIncident(incidentId);
  const units = useUnits();
  const live = useLiveSession(incidentId);
  const { actor } = useSession();
  const [note, setNote] = useState(initialNote ?? "");
  const fieldId = useId();
  const resolve = useAction(services.incidents.resolve, {
    success: "Incident resolved",
    onSuccess: onDone,
  });
  const engaged = incident
    ? liveAssignments(incident)
        .map((a) => units.find((u) => u.id === a.unitId)?.callSign)
        .filter(Boolean)
    : [];
  const valid = note.trim().length >= 10;

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) void resolve.run(incidentId, note.trim(), actor);
      }}
    >
      <Header title="Resolve incident" incident={incident} />
      <div className="space-y-2">
        <Label htmlFor={fieldId}>Resolution note</Label>
        <Textarea
          id={fieldId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          autoFocus
          placeholder="What happened, and how it was left."
          aria-describedby={`${fieldId}-hint`}
        />
        <Suggestions
          label="Common resolution notes"
          items={RESOLUTION_PHRASES}
          onPick={setNote}
        />
        <p id={`${fieldId}-hint`} className="text-xs text-muted-foreground">
          The citizen sees this note on their timeline. It also starts the
          preliminary response report.
        </p>
      </div>
      <ul className="space-y-1 rounded-lg bg-inset px-3 py-2.5 text-[13px] text-muted-foreground">
        <li>
          {engaged.length > 0
            ? `${engaged.join(", ")} will be released and marked available.`
            : "No unit is engaged on this incident."}
        </li>
        {live && <li>The live {live.type} session will end.</li>}
        <li>Open escalations on this incident will be marked resolved.</li>
      </ul>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          variant="success"
          disabled={!valid || resolve.pending}
        >
          {resolve.pending ? "Resolving…" : "Resolve incident"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ResolveIncidentDialog({
  incidentId,
  open,
  onOpenChange,
  initialNote,
}: DialogProps & {
  /** Prefills the resolution note, for example from the assistant's draft report. */
  initialNote?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        {incidentId ? (
          <ResolveBody
            incidentId={incidentId}
            initialNote={initialNote}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <Header title="Resolve incident" incident={undefined} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Escalate ───────────────────────── */

const ESCALATION_PHRASES = [
  "No unit available within the response target.",
  "Situation is worsening on scene.",
  "Needs a decision above the control room.",
];

const LEVELS = [1, 2, 3] as const;

function EscalateBody({
  incidentId,
  onDone,
}: {
  incidentId: string;
  onDone: () => void;
}) {
  const incident = useIncident(incidentId);
  const { actor } = useSession();
  const current = incident?.escalationLevel ?? 0;
  const [level, setLevel] = useState<1 | 2 | 3>(
    Math.min(3, current + 1) as 1 | 2 | 3,
  );
  const [reason, setReason] = useState("");
  const fieldId = useId();
  const escalate = useAction(services.incidents.escalate, {
    success: "Incident escalated",
    onSuccess: onDone,
  });
  const valid = reason.trim().length >= 5;

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) void escalate.run(incidentId, level, reason.trim(), actor);
      }}
    >
      <Header title="Escalate incident" incident={incident} />
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Escalate to</legend>
        <RadioGroup
          value={String(level)}
          onValueChange={(value) => setLevel(Number(value) as 1 | 2 | 3)}
        >
          {LEVELS.map((value) => {
            const id = `${fieldId}-level-${value}`;
            return (
              <label
                key={value}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5",
                  level === value
                    ? "border-primary/60 bg-accent/60"
                    : "border-border",
                )}
              >
                <RadioGroupItem id={id} value={String(value)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    Level {value} · {ESCALATION_LEVEL_LABEL[value]}
                  </span>
                  {value <= current && (
                    <span className="block text-xs text-muted-foreground">
                      Already informed. Escalating again raises a new alert.
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-reason`}>Reason</Label>
        <Textarea
          id={`${fieldId}-reason`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
          placeholder="Why this needs attention at a higher level."
        />
        <Suggestions
          label="Common reasons"
          items={ESCALATION_PHRASES}
          onPick={setReason}
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={!valid || escalate.pending}>
          {escalate.pending
            ? "Escalating…"
            : `Escalate to ${ESCALATION_LEVEL_LABEL[level].toLowerCase()}`}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EscalateIncidentDialog({
  incidentId,
  open,
  onOpenChange,
}: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        {incidentId ? (
          <EscalateBody
            incidentId={incidentId}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <Header title="Escalate incident" incident={undefined} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Transfer ───────────────────────── */

function TransferBody({
  incidentId,
  onDone,
}: {
  incidentId: string;
  onDone: () => void;
}) {
  const incident = useIncident(incidentId);
  const { actor } = useSession();
  const [stationId, setStationId] = useState("");
  const fieldId = useId();
  const transfer = useAction(services.incidents.transfer, {
    success: "Incident transferred",
    onSuccess: onDone,
  });
  const currentId = incident?.location.stationId;

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (stationId) void transfer.run(incidentId, stationId, actor);
      }}
    >
      <Header title="Transfer incident" incident={incident} />
      <div className="space-y-2">
        <p className="text-[13px] text-muted-foreground">
          Currently with{" "}
          <span className="font-medium text-foreground">
            {currentId ? stationName(currentId) : "no station"}
          </span>
          .
        </p>
        <Label htmlFor={fieldId}>Transfer to</Label>
        <Select value={stationId} onValueChange={setStationId}>
          <SelectTrigger id={fieldId} className="w-full">
            <SelectValue placeholder="Choose a station" />
          </SelectTrigger>
          <SelectContent position="popper">
            {STATIONS.filter((s) => s.id !== currentId).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Units already assigned stay on the incident. The receiving station
          takes over responsibility for it.
        </p>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={!stationId || transfer.pending}>
          {transfer.pending ? "Transferring…" : "Transfer incident"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TransferIncidentDialog({
  incidentId,
  open,
  onOpenChange,
}: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        {incidentId ? (
          <TransferBody
            incidentId={incidentId}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <Header title="Transfer incident" incident={undefined} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Request backup ───────────────────────── */

const BACKUP_PHRASES = [
  "More than one person involved.",
  "Crowd forming at the scene.",
  "Officer asked for a second unit.",
];

function BackupBody({
  incidentId,
  onDone,
}: {
  incidentId: string;
  onDone: () => void;
}) {
  const incident = useIncident(incidentId);
  const { actor } = useSession();
  const [note, setNote] = useState("");
  const fieldId = useId();
  const backup = useAction(services.dispatch.requestBackup, {
    success: "Backup requested",
    onSuccess: onDone,
  });

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        void backup.run(incidentId, actor, note.trim() || undefined);
      }}
    >
      <Header title="Request backup" incident={incident} />
      <div className="space-y-2">
        <Label htmlFor={fieldId}>Note for dispatch (optional)</Label>
        <Textarea
          id={fieldId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="What the extra unit is needed for."
        />
        <Suggestions
          label="Common notes"
          items={BACKUP_PHRASES}
          onPick={setNote}
        />
        <p className="text-xs text-muted-foreground">
          This flags the incident and alerts dispatch and supervisors. Use
          Assign unit to add the backup unit itself.
        </p>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={backup.pending}>
          {backup.pending ? "Requesting…" : "Request backup"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RequestBackupDialog({
  incidentId,
  open,
  onOpenChange,
}: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        {incidentId ? (
          <BackupBody
            incidentId={incidentId}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <Header title="Request backup" incident={undefined} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Close ───────────────────────── */

export function CloseIncidentDialog({
  incidentId,
  open,
  onOpenChange,
}: DialogProps) {
  const { actor } = useSession();
  const close = useAction(services.incidents.close, {
    success: "Incident closed",
    onSuccess: () => onOpenChange(false),
  });
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close this incident?</AlertDialogTitle>
          <AlertDialogDescription>
            Closing records that the preliminary response report has been
            reviewed. The incident stays on record and can still be read, but no
            further response actions can be taken on it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep open</AlertDialogCancel>
          <AlertDialogAction
            disabled={close.pending || !incidentId}
            onClick={(e) => {
              // Keep the dialog up until the service answers, so a failure is not hidden.
              e.preventDefault();
              if (incidentId) void close.run(incidentId, actor);
            }}
          >
            {close.pending ? "Closing…" : "Close incident"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ───────────────────────── Release unit ───────────────────────── */

const RELEASE_REASONS = [
  "Reassigning to a closer unit",
  "Unit needed for a higher priority incident",
  "Unit reported a vehicle or crew problem",
  "No longer required at the scene",
];

export function ReleaseUnitDialog({
  incidentId,
  unitId,
  open,
  onOpenChange,
}: DialogProps & { unitId: string | null | undefined }) {
  const { actor } = useSession();
  const units = useUnits();
  const unit = units.find((u) => u.id === unitId);
  const [reason, setReason] = useState(RELEASE_REASONS[0]);
  const fieldId = useId();
  const release = useAction(services.dispatch.releaseUnit, {
    success: "Unit released",
    onSuccess: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            if (incidentId && unitId)
              void release.run(incidentId, unitId, actor, reason);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              Release {unit ? `unit ${unit.callSign}` : "unit"}?
            </DialogTitle>
            <DialogDescription>
              The unit is taken off{" "}
              <span className="tnum font-mono text-xs">{incidentId}</span> and
              becomes available. If no other unit remains, the incident returns
              to the unassigned queue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={fieldId}>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id={fieldId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {RELEASE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Recorded on the incident timeline and in the audit log.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              disabled={release.pending || !incidentId || !unitId}
            >
              {release.pending ? "Releasing…" : "Release unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Voice / video session ───────────────────────── */

/**
 * The mock voice or video screen in a dialog. Closing the dialog by any route ends the session,
 * so a call is never left "live" behind a dismissed window.
 */
export function SessionDialog({
  incident,
  type,
  onClose,
  onEscalate,
}: {
  incident: Incident;
  /** Null keeps the dialog closed. */
  type: SessionType | null;
  onClose: () => void;
  onEscalate?: () => void;
}) {
  const { actor } = useSession();
  const live = useLiveSession(incident.id);

  const end = () => {
    if (live) void services.communication.endSession(live.id, actor);
    onClose();
  };

  return (
    <Dialog open={type !== null} onOpenChange={(open) => !open && end()}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        // Focus the session itself, not the first control: its tooltip would cover the caption.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
        className="h-[min(86dvh,680px)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">
          Secure {type ?? "voice"} session with the citizen
        </DialogTitle>
        <DialogDescription className="sr-only">
          Simulated media for {incident.id}. No camera or microphone is used.
        </DialogDescription>
        {type && (
          <SecureSession
            incident={incident}
            type={type}
            onEnd={onClose}
            onEscalate={onEscalate}
            className="min-h-0"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
