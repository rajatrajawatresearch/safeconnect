"use client";

import {
  ArrowUpRight,
  EyeOff,
  Lock,
  MessageSquare,
  PhoneCall,
  Radio,
  ScrollText,
  StickyNote,
  Unlink,
  UserPlus,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ChatThread } from "@/components/shared/chat-thread";
import {
  MEDIA_KIND_META,
  MediaPicker,
  type PickedMedia,
} from "@/components/shared/media-picker";
import { BlankState, RestrictedState } from "@/components/shared/states";
import {
  ClassificationChip,
  IntegrityChip,
  OfficerStageChip,
  SeverityDot,
  ToneChip,
} from "@/components/shared/status-chips";
import { ClockStamp } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { VEHICLE_ICON } from "@/features/units/unit-meta";
import { useAction } from "@/hooks/use-action";
import {
  officerOfUnit,
  useIncidentEvidence,
  useIncidentMessages,
  useLiveSession,
  useUnits,
} from "@/hooks/use-demo-data";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  formatKm,
} from "@/lib/format";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type {
  Assignment,
  AuditEvent,
  CommunicationSession,
  Evidence,
  Incident,
  MessageChannel,
} from "@/types";
import { ActionButton } from "./action-button";
import { ReleaseUnitDialog } from "./incident-dialogs";
import { chatBlockedReason, isActive } from "./incident-rules";

/* ───────────────────────── Communication ───────────────────────── */

const OPERATOR_QUICK_REPLIES = [
  "Help is on the way.",
  "Are you in a safe place?",
  "Stay where you are if it is safe.",
  "Can you talk, or should we stay on chat?",
  "A unit has been assigned to you.",
];

/** Ticks on its own so the chat thread beside it does not re-render every second. */
function SessionClock({ session }: { session: CommunicationSession }) {
  const now = useNow();
  return (
    <time
      role="timer"
      aria-label="Session length"
      className="tnum font-mono text-xs text-muted-foreground"
    >
      {formatDuration(now > 0 ? (now - session.startedAt) / 1000 : 0)}
    </time>
  );
}

export function CommunicationTab({
  incident,
  callReason,
  videoReason,
  onStartSession,
}: {
  incident: Incident;
  callReason: string | null;
  videoReason: string | null;
  onStartSession: (type: "voice" | "video") => void;
}) {
  const { actor, can } = useSession();
  const live = useLiveSession(incident.id);
  const citizenCount = useIncidentMessages(incident.id, "citizen").length;
  const internalCount = useIncidentMessages(incident.id, "internal").length;
  const [channel, setChannel] = useState<MessageChannel>(
    can("communication.citizen") ? "citizen" : "internal",
  );
  const end = useAction(services.communication.endSession, {
    success: "Session ended",
  });
  const blocked = chatBlockedReason(incident);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/70 px-4 py-2.5"
      >
        {live ? (
          <>
            <span className="flex items-center gap-2 text-sm font-medium">
              <SeverityDot tone="resolved" pulse />
              Secure {live.type} session{" "}
              {live.status === "connecting" ? "connecting" : "live"}
            </span>
            <SessionClock session={live} />
            <span className="text-xs text-muted-foreground">
              Started by {live.startedBy.name}
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto"
              disabled={end.pending}
              onClick={() => end.run(live.id, actor)}
            >
              End session
            </Button>
          </>
        ) : (
          <>
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <SeverityDot tone="neutral" />
              No live voice or video session
            </span>
            <div className="ml-auto flex gap-1.5">
              <ActionButton
                size="sm"
                icon={PhoneCall}
                label="Call"
                reason={callReason}
                onClick={() => onStartSession("voice")}
              />
              <ActionButton
                size="sm"
                icon={Video}
                label="Video"
                reason={videoReason}
                onClick={() => onStartSession("video")}
              />
            </div>
          </>
        )}
      </div>

      <Tabs
        value={channel}
        onValueChange={(value) => setChannel(value as MessageChannel)}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="px-4 pt-3 pb-2">
          <TabsList className="w-full" aria-label="Conversation">
            <TabsTrigger value="citizen">
              <MessageSquare aria-hidden />
              With the citizen
              <span className="tnum text-xs text-muted-foreground">
                {citizenCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="internal">
              <EyeOff aria-hidden />
              Internal
              <span className="tnum text-xs text-muted-foreground">
                {internalCount}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="citizen" className="flex min-h-0 flex-col">
          {can("communication.citizen") ? (
            <ChatThread
              incidentId={incident.id}
              channel="citizen"
              quickReplies={OPERATOR_QUICK_REPLIES}
              disabled={Boolean(blocked)}
              disabledReason={blocked ?? undefined}
              className="flex-1"
            />
          ) : (
            <RestrictedState
              compact
              title="Citizen conversation is restricted"
              description="Your role does not permit contact with citizens."
            />
          )}
        </TabsContent>
        <TabsContent value="internal" className="flex min-h-0 flex-col">
          {can("communication.internal") ? (
            <ChatThread
              incidentId={incident.id}
              channel="internal"
              disabled={
                incident.status === "closed" || incident.status === "cancelled"
              }
              disabledReason="This incident is closed. The thread is read-only."
              className="flex-1"
            />
          ) : (
            <RestrictedState
              compact
              title="Internal thread is restricted"
              description="Your role does not permit access to internal messages."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────────────────────── Evidence ───────────────────────── */

const EVIDENCE_SOURCE: Record<Evidence["source"], string> = {
  citizen: "From the citizen",
  officer: "From the officer",
  operator: "Control room",
};

function EvidenceRow({
  item,
  restricted,
}: {
  item: Evidence;
  restricted: boolean;
}) {
  const meta = MEDIA_KIND_META[item.type];
  const Icon = restricted ? Lock : meta.icon;
  return (
    <li>
      <Link
        href={`/control/evidence?id=${item.id}`}
        className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-input hover:bg-muted/50"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="truncate text-sm font-medium">
              {restricted ? "Restricted evidence" : item.title}
            </span>
            <ArrowUpRight
              aria-hidden
              className="size-4 shrink-0 text-subtle group-hover:text-foreground"
            />
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            <span className="tnum font-mono">{item.id}</span> · {meta.label} ·{" "}
            {formatBytes(item.sizeBytes)} · {EVIDENCE_SOURCE[item.source]}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Submitted {formatDateTime(item.submittedAt)}
          </span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <ClassificationChip value={item.classification} />
            <IntegrityChip value={item.integrity} />
          </span>
          {restricted && (
            <span className="mt-2 block text-xs text-muted-foreground">
              Your role does not permit access. Opening it records the attempt.
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

export function EvidenceTab({ incident }: { incident: Incident }) {
  const { actor, can } = useSession();
  const evidence = useIncidentEvidence(incident.id);
  const upload = useAction(services.evidence.upload, {
    success: (record) => `Evidence ${record.id} added`,
  });

  if (!can("evidence.view"))
    return (
      <RestrictedState
        title="Evidence is restricted"
        description="Your role does not permit access to evidence."
      />
    );

  const add = (media: PickedMedia) =>
    upload.run(
      {
        incidentId: incident.id,
        type: media.kind,
        title: `${MEDIA_KIND_META[media.kind].label} received at the control room`,
        fileName: media.name,
        sizeBytes: media.sizeBytes,
        durationSec: media.durationSec,
        source: "operator",
        device: "Control room ingest",
      },
      actor,
    );

  return (
    <div className="space-y-4 p-4">
      {evidence.length === 0 ? (
        <BlankState
          compact
          title="No evidence on this incident"
          description="Photos, video, audio and documents sent by the citizen or the officer appear here."
        />
      ) : (
        <ul className="space-y-2" aria-label="Evidence linked to this incident">
          {evidence.map((item) => (
            <EvidenceRow
              key={item.id}
              item={item}
              restricted={
                item.classification === "restricted" &&
                !can("evidence.restricted")
              }
            />
          ))}
        </ul>
      )}

      {can("evidence.upload") ? (
        <section
          aria-label="Add evidence"
          className="rounded-xl border border-border/70 bg-inset p-3.5"
          aria-busy={upload.pending}
        >
          <h3 className="text-sm font-semibold">Add evidence</h3>
          <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
            Logged as received through the control room. The original is kept
            unchanged, a digest is recorded and every later view is audited.
          </p>
          <MediaPicker size="sm" onPick={add} />
          {upload.pending && (
            <p role="status" className="mt-2 text-xs text-muted-foreground">
              Recording the item…
            </p>
          )}
        </section>
      ) : (
        <p className="text-xs text-muted-foreground">
          Your role cannot add evidence.
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Responders ───────────────────────── */

function ResponderCard({
  assignment,
  canRelease,
  releaseReason,
  onRelease,
}: {
  assignment: Assignment;
  canRelease: boolean;
  releaseReason: string | null;
  onRelease: () => void;
}) {
  const units = useUnits();
  const unit = units.find((u) => u.id === assignment.unitId);
  const officer = officerOfUnit(unit);
  const Icon = unit ? VEHICLE_ICON[unit.vehicle] : Radio;
  const declined = assignment.response === "rejected";

  return (
    <li className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/control/units?id=${assignment.unitId}`}
              className="tnum font-mono text-sm font-semibold underline-offset-2 hover:underline"
            >
              {unit?.callSign ?? assignment.unitId}
            </Link>
            <ToneChip tone="neutral" variant="outline">
              {assignment.role === "primary" ? "Primary" : "Backup"}
            </ToneChip>
            {!declined && (
              <OfficerStageChip stage={assignment.stage} className="ml-auto" />
            )}
          </p>
          <p className="mt-1 text-sm">
            {officer?.name ?? "Officer not set"}
            {officer && (
              <span className="text-muted-foreground"> · {officer.rank}</span>
            )}
          </p>
          {unit && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {unit.vehicle} ·{" "}
              <span className="tnum font-mono">{unit.vehicleNo}</span> · crew of{" "}
              {unit.crew}
            </p>
          )}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-border/70 pt-3 @sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Response</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            {assignment.response === "pending" ? (
              <>
                <ToneChip tone="medium" dot>
                  Pending
                </ToneChip>
                <span className="text-muted-foreground">
                  Waiting for the officer
                </span>
              </>
            ) : assignment.response === "accepted" ? (
              <>
                <ToneChip tone="resolved" dot>
                  Accepted
                </ToneChip>
                {assignment.respondedAt && (
                  <ClockStamp at={assignment.respondedAt} />
                )}
              </>
            ) : (
              <>
                <ToneChip tone="high" dot>
                  Declined
                </ToneChip>
                <span className="text-muted-foreground">
                  {assignment.rejectReason ?? "No reason given"}
                </span>
              </>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">
            Distance and ETA at assignment
          </dt>
          <dd className="tnum mt-1 text-[13px]">
            {formatKm(assignment.distanceKm)} · about {assignment.etaMin} min
          </dd>
        </div>
        <div className="min-w-0 @sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Assigned</dt>
          <dd className="mt-1 text-[13px]">
            <ClockStamp at={assignment.assignedAt} /> by{" "}
            {assignment.assignedBy.name}
          </dd>
        </div>
      </dl>

      {canRelease && !declined && (
        <div className="mt-3 flex justify-end">
          <ActionButton
            icon={Unlink}
            label="Release unit"
            reason={releaseReason}
            onClick={onRelease}
          />
        </div>
      )}
    </li>
  );
}

export function RespondersTab({
  incident,
  assignReason,
  onAssign,
}: {
  incident: Incident;
  assignReason: string | null;
  onAssign: () => void;
}) {
  const { can } = useSession();
  const [releasingUnitId, setReleasingUnitId] = useState<string | null>(null);
  const open = isActive(incident);
  const releaseReason = !can("unit.assign")
    ? "Your role cannot release units."
    : null;

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-muted-foreground">
          {incident.assignments.length === 0
            ? "No unit has been assigned."
            : `${incident.assignments.length} ${incident.assignments.length === 1 ? "unit" : "units"} on this incident.`}
          {incident.backupRequested && " Backup has been requested."}
        </p>
        <ActionButton
          icon={UserPlus}
          label={incident.assignments.length ? "Add a unit" : "Assign unit"}
          reason={assignReason}
          onClick={onAssign}
        />
      </div>

      {incident.assignments.length === 0 ? (
        <BlankState
          compact
          icon={Radio}
          title="No responders yet"
          description={
            open
              ? "Assign a unit to start the response. Units are ranked by road distance."
              : "No unit was assigned before this incident ended."
          }
        />
      ) : (
        <ul className="space-y-2.5" aria-label="Responding units">
          {incident.assignments.map((assignment) => (
            <ResponderCard
              key={assignment.id}
              assignment={assignment}
              canRelease={open}
              releaseReason={releaseReason}
              onRelease={() => setReleasingUnitId(assignment.unitId)}
            />
          ))}
        </ul>
      )}

      <ReleaseUnitDialog
        incidentId={incident.id}
        unitId={releasingUnitId}
        open={releasingUnitId !== null}
        onOpenChange={(next) => !next && setReleasingUnitId(null)}
      />
    </div>
  );
}

/* ───────────────────────── Notes ───────────────────────── */

export function NotesTab({ incident }: { incident: Incident }) {
  const { actor, can } = useSession();
  const [text, setText] = useState("");
  const fieldId = useId();
  const add = useAction(services.incidents.addNote, {
    success: "Note added",
    onSuccess: () => setText(""),
  });
  const notes = useMemo(
    () => [...incident.notes].sort((a, b) => b.at - a.at),
    [incident.notes],
  );
  const allowed = can("incident.note");

  return (
    <div className="space-y-4 p-4">
      <p className="flex items-center gap-1.5 rounded-lg border border-dashed border-medium/50 bg-medium-soft px-3 py-2 text-xs font-medium text-medium-fg">
        <EyeOff aria-hidden className="size-3.5 shrink-0" />
        Internal notes. The citizen never sees these.
      </p>

      {allowed ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) void add.run(incident.id, text.trim(), actor);
          }}
        >
          <Label htmlFor={fieldId}>Add a note</Label>
          <Textarea
            id={fieldId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="What you learned, decided or asked for."
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!text.trim() || add.pending}>
              <StickyNote aria-hidden />
              {add.pending ? "Adding…" : "Add note"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          Your role cannot add notes to incidents.
        </p>
      )}

      {notes.length === 0 ? (
        <BlankState
          compact
          icon={StickyNote}
          title="No notes yet"
          description="Notes keep the next operator and the responding officer in step."
        />
      ) : (
        <ul className="space-y-2.5" aria-label="Internal notes, newest first">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-xl border border-border bg-card p-3.5"
            >
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="text-sm font-medium text-foreground">
                  {note.author.name}
                </span>
                <span>{ROLE_LABEL[note.author.role]}</span>
                <ClockStamp at={note.at} className="ml-auto" />
              </p>
              <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
                {note.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────── Audit ───────────────────────── */

const ROLE_LABEL: Record<AuditEvent["actorRole"], string> = {
  citizen: "Citizen",
  operator: "Operator",
  dispatcher: "Dispatcher",
  officer: "Officer",
  supervisor: "Supervisor",
  command: "District command",
  state_command: "State command",
  admin: "Administrator",
  system: "System",
};

export function AuditTab({ incident }: { incident: Incident }) {
  const { can } = useSession();
  const audit = useDemoStore((s) => s.audit);
  const events = useMemo(
    () => audit.filter((e) => e.incidentId === incident.id),
    [audit, incident.id],
  );

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-muted-foreground">
          Every recorded action on this incident, newest first. Entries cannot
          be edited or removed.
        </p>
        {can("audit.view") && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/control/audit">
              <ScrollText aria-hidden /> Full audit log
            </Link>
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <BlankState
          compact
          icon={ScrollText}
          title="No audit entries yet"
          description="Actions taken on this incident are recorded here as they happen."
        />
      ) : (
        <ol
          className="divide-y divide-border/70 rounded-xl border border-border bg-card"
          aria-label="Audit entries for this incident"
        >
          {events.map((event) => (
            <li key={event.id} className="flex gap-3 px-3.5 py-2.5">
              <ClockStamp at={event.at} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{event.action}</p>
                <p className="mt-0.5 text-[13px] leading-snug break-words text-muted-foreground">
                  {event.detail}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span>
                    {event.actorName}
                    {event.actorName !== ROLE_LABEL[event.actorRole] && (
                      <span className="text-subtle">
                        {" "}
                        · {ROLE_LABEL[event.actorRole]}
                      </span>
                    )}
                  </span>
                  <span
                    className="tnum ml-auto font-mono text-[11px] text-subtle"
                    title="Demo sequence value showing how tamper-evident chaining would read"
                  >
                    chain {event.chainHash.slice(0, 10)}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
