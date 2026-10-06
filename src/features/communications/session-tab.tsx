"use client";

import {
  Lock,
  MessageSquareText,
  Phone,
  PhoneOff,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { Panel, PanelHeader } from "@/components/shared/page";
import { SecureSession } from "@/components/shared/secure-session";
import { ToneChip } from "@/components/shared/status-chips";
import { ClockStamp, ResponseTimer } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { SOURCE_LABEL } from "@/config/incident";
import { ROLE_LABEL } from "@/features/evidence/evidence-meta";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { formatDuration, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type {
  CommunicationSession,
  Incident,
  Permission,
  SessionType,
} from "@/types";
import { isActiveIncident } from "./use-threads";

/** The session this console has opened on the incident and is currently showing. */
export interface CallState {
  type: SessionType;
  /** When the operator pressed start; tells this console's session apart from earlier ones. */
  openedAt: number;
}

const TYPE_META: Record<SessionType, { label: string; icon: LucideIcon }> = {
  voice: { label: "Voice", icon: Phone },
  video: { label: "Video", icon: Video },
};

const QUALITY_LABEL: Record<CommunicationSession["quality"], string> = {
  excellent: "Excellent connection",
  good: "Good connection",
  weak: "Weak connection",
};

interface Unavailable {
  title: string;
  body: string;
  /** Chat is the right channel instead. */
  offerChat?: boolean;
  restricted?: boolean;
}

/** Why a voice or video session may not be started on this incident, if it may not. */
function unavailableReason(
  incident: Incident,
  linked: boolean,
  can: (permission: Permission) => boolean,
): Unavailable | null {
  if (!can("communication.video"))
    return {
      title: "Voice and video are restricted",
      body: "Your role does not permit starting a secure session with a citizen.",
      restricted: true,
    };
  if (incident.silent || incident.source === "silent_sos")
    return {
      title: "Chat only — the citizen cannot speak safely",
      body: "This is a silent SOS. A ringing phone or a voice in the room could put the citizen at risk. Use chat: they can answer by typing or with one tap.",
      offerChat: true,
    };
  if (incident.anonymous)
    return {
      title: "No session with an anonymous source",
      body: "The source chose to stay anonymous. There is no identity and no device to connect to.",
    };
  if (!linked)
    return {
      title: "No citizen is linked to this incident",
      body: `It came in as a ${SOURCE_LABEL[incident.source].toLowerCase()}, not from the citizen app, so there is no app session to connect to.`,
    };
  if (!isActiveIncident(incident))
    return {
      title: "This incident is no longer open",
      body: "A secure session can be started only while an incident is open. Earlier sessions stay listed below.",
    };
  return null;
}

function StageCard({
  icon: Icon,
  title,
  children,
  actions,
  muted,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Panel className="flex flex-col items-center px-5 py-9 text-center">
      <span
        className={cn(
          "mb-4 grid size-12 place-items-center rounded-full",
          muted
            ? "bg-muted text-muted-foreground"
            : "bg-accent text-accent-foreground",
        )}
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
      {actions && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {actions}
        </div>
      )}
    </Panel>
  );
}

function SessionHistory({ sessions }: { sessions: CommunicationSession[] }) {
  return (
    <Panel>
      <PanelHeader
        title="Session history"
        description="Voice and video sessions on this incident, newest first"
      />
      {sessions.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No voice or video session has been held on this incident.
        </p>
      ) : (
        <ul className="divide-y divide-border/70">
          {sessions.map((session) => {
            const meta = TYPE_META[session.type];
            const Icon = meta.icon;
            const live = session.status !== "ended";
            return (
              <li
                key={session.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
              >
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-inset text-muted-foreground"
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="text-sm font-medium">{meta.label} session</p>
                  <p className="text-xs text-muted-foreground">
                    Started by {session.startedBy.name} ·{" "}
                    {ROLE_LABEL[session.startedBy.role]} ·{" "}
                    {QUALITY_LABEL[session.quality]}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <ClockStamp at={session.startedAt} />
                    <p className="tnum font-mono text-xs">
                      {live ? (
                        <ResponseTimer
                          since={session.startedAt}
                          size="sm"
                          label="Session length"
                        />
                      ) : (
                        formatDuration(
                          ((session.endedAt ?? session.startedAt) -
                            session.startedAt) /
                            1000,
                        )
                      )}
                    </p>
                  </div>
                  <ToneChip tone={live ? "resolved" : "neutral"} dot>
                    {live ? "Live" : "Ended"}
                  </ToneChip>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/**
 * Voice or video for one incident: the reason it is unavailable, the start state, a session
 * already in progress, or the session itself — and always the history underneath.
 */
export function SessionTab({
  incident,
  linked,
  type,
  call,
  onStart,
  onEnd,
  onOpenChat,
  onEscalate,
}: {
  incident: Incident;
  /** A citizen can be reached through the app on this incident. */
  linked: boolean;
  type: SessionType;
  /** The session this console is showing right now, on either tab. */
  call: CallState | null;
  onStart: (type: SessionType) => void;
  onEnd: () => void;
  onOpenChat: () => void;
  onEscalate?: () => void;
}) {
  const { actor, can } = useSession();
  const allSessions = useDemoStore((s) => s.sessions);
  const sessions = useMemo(
    () =>
      allSessions
        .filter((s) => s.incidentId === incident.id)
        .sort((a, b) => b.startedAt - a.startedAt),
    [allSessions, incident.id],
  );
  const live = sessions.find((s) => s.status !== "ended");
  const end = useAction(services.communication.endSession, {
    success: "Session ended",
  });

  const meta = TYPE_META[type];
  const reason = unavailableReason(incident, linked, can);
  const name = incident.reporterName;

  let stage: React.ReactNode;
  if (call?.type === type) {
    stage = (
      <div className="h-[460px] overflow-hidden rounded-xl border border-border xl:h-[520px]">
        <SecureSession
          incident={incident}
          type={type}
          onEnd={onEnd}
          onEscalate={onEscalate}
        />
      </div>
    );
  } else if (reason) {
    stage = (
      <StageCard
        icon={
          reason.restricted ? Lock : reason.offerChat ? PhoneOff : meta.icon
        }
        title={reason.title}
        muted
        actions={
          reason.offerChat && (
            <Button size="lg" onClick={onOpenChat}>
              <MessageSquareText aria-hidden /> Open chat
            </Button>
          )
        }
      >
        <p>{reason.body}</p>
      </StageCard>
    );
  } else if (live) {
    const liveLabel = TYPE_META[live.type].label.toLowerCase();
    const sameType = live.type === type;
    stage = (
      <StageCard
        icon={TYPE_META[live.type].icon}
        title={`A ${liveLabel} session is in progress`}
        actions={
          <>
            <Button size="lg" onClick={() => onStart(type)}>
              <meta.icon aria-hidden />
              {sameType
                ? live.startedBy.role === "citizen"
                  ? "Join session"
                  : "Reconnect"
                : `Switch to ${meta.label.toLowerCase()}`}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={end.pending}
              onClick={() => end.run(live.id, actor)}
            >
              <PhoneOff aria-hidden /> End session
            </Button>
          </>
        }
      >
        <p>
          Started by {live.startedBy.name} at{" "}
          <span className="tnum">{formatTime(live.startedAt)}</span>. Running
          for{" "}
          <ResponseTimer
            since={live.startedAt}
            size="sm"
            label="Session length"
            className="text-foreground"
          />
          .
        </p>
        <p className="mt-1.5">
          {sameType
            ? "Connecting from this console opens a new session and closes the one in progress."
            : `Switching closes the ${liveLabel} session and opens a ${meta.label.toLowerCase()} session in its place.`}
        </p>
      </StageCard>
    );
  } else {
    stage = (
      <StageCard
        icon={meta.icon}
        title={`Start a secure ${meta.label.toLowerCase()} session`}
        actions={
          <Button size="lg" onClick={() => onStart(type)}>
            <meta.icon aria-hidden /> Start secure session
          </Button>
        }
      >
        <p>
          {name} is asked to accept on their phone. The session is added to the
          incident timeline and the audit log.
        </p>
        <p className="mt-1.5">
          Media is simulated in the demonstration: no microphone or camera is
          opened.
        </p>
      </StageCard>
    );
  }

  return (
    <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
      {stage}
      <SessionHistory sessions={sessions} />
    </div>
  );
}
