"use client";

import {
  LocateFixed,
  Lock,
  Mic,
  MicOff,
  PhoneOff,
  Signal,
  SignalLow,
  SwitchCamera,
  TriangleAlert,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLiveSession, useUnit } from "@/hooks/use-demo-data";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { formatDuration, initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services, type RtcTransport } from "@/services";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Incident, SessionType } from "@/types";
import { EtaCountdown } from "./timers";

const SCRIPT_TO_CITIZEN = [
  "Stay in a safe location. A response unit has been dispatched.",
  "I can see your location. You do not need to describe where you are.",
  "Keep this session open. If you cannot talk, use the chat.",
  "The unit is close. Stay where you are until the officers reach you.",
];

const SCRIPT_TO_STAFF = [
  "I am inside the shop. They are still standing outside.",
  "I am okay. I can stay here until someone comes.",
  "There are two of them. One is wearing a dark jacket.",
  "Please stay on the line with me.",
];

function Control({
  icon: Icon,
  label,
  active,
  danger,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  /** Pressed state for toggles. */
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-full transition-colors sm:size-13",
            danger
              ? "bg-critical text-white hover:bg-critical/90"
              : active
                ? "bg-white text-slate-900"
                : "bg-white/12 text-white hover:bg-white/20",
          )}
        >
          <Icon aria-hidden className="size-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Voice and video assistance screen. The media is simulated: no camera or microphone is opened.
 * A real build passes frames from `CommunicationService.createTransport()` into the two tiles.
 *
 * Fill the parent — a full-screen dialog on phones, a panel in the control room.
 */
export function SecureSession({
  incident,
  type,
  onEnd,
  onEscalate,
  className,
}: {
  incident: Incident;
  type: SessionType;
  onEnd: () => void;
  /** Staff: open the escalation flow. Citizen: flag that the situation has worsened. */
  onEscalate?: () => void;
  className?: string;
}) {
  const session = useSession();
  const live = useLiveSession(incident.id);
  const connectivity = usePrefsStore((s) => s.connectivity);
  const now = useNow();
  const asCitizen = session.role === "citizen";
  const primary = incident.assignments.find(
    (a) => a.role === "primary" && a.response !== "rejected",
  );
  const unit = useUnit(primary?.unitId);

  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [camera, setCamera] = useState(type === "video");
  const [front, setFront] = useState(true);
  const [sharing, setSharing] = useState(
    incident.location.source === "device_emergency",
  );
  const started = useRef(false);
  const mounted = useRef(false);
  const sessionId = useRef<string | null>(null);
  const transport = useRef<RtcTransport | null>(null);

  // Tracks whether the screen is still on display. Kept separate from the start-up effect below
  // because development mode runs effects twice: the session must be opened once, and its result
  // must still land when the first run has been torn down.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      transport.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const link = services.communication.createTransport();
    transport.current = link;
    (async () => {
      try {
        const created = await services.communication.startSession(
          incident.id,
          type,
          session.actor,
        );
        sessionId.current = created.id;
        await link.connect(created.id);
        if (mounted.current) setConnected(true);
      } catch {
        if (!mounted.current) return;
        toast.error(
          "Could not start the session. Use chat while the connection recovers.",
        );
        onEnd();
      }
    })();
    // The session is opened once for the lifetime of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remoteName = asCitizen
    ? (incident.operatorName ?? "Control room")
    : incident.reporterName;
  const remoteRole = asCitizen ? "Emergency operator" : "Citizen";
  const script = asCitizen ? SCRIPT_TO_CITIZEN : SCRIPT_TO_STAFF;
  const startedAt = live?.startedAt ?? now;
  const elapsed =
    connected && now > 0 ? Math.max(0, (now - startedAt) / 1000) : 0;
  const caption = useMemo(
    () => script[Math.floor(elapsed / 7) % script.length],
    [script, elapsed],
  );
  const weak = connectivity !== "online";

  const end = () => {
    if (sessionId.current)
      void services.communication.endSession(sessionId.current, session.actor);
    onEnd();
  };

  return (
    <div
      className={cn(
        "relative flex size-full min-h-[420px] flex-col overflow-hidden bg-[#0b1220] text-white",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Lock aria-hidden className="size-3.5 text-emerald-300" /> Secure
            safety session
          </p>
          <p className="mt-0.5 truncate text-xs text-white/60">
            {incident.id} · {type === "video" ? "Video" : "Voice"} · simulated
            media
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1",
              weak ? "text-amber-300" : "text-emerald-300",
            )}
          >
            {weak ? (
              <SignalLow aria-hidden className="size-4" />
            ) : (
              <Signal aria-hidden className="size-4" />
            )}
            {connected
              ? weak
                ? "Weak connection"
                : "Good connection"
              : "Connecting…"}
          </span>
          <time
            role="timer"
            aria-label="Session length"
            className="tnum font-mono text-white/80"
          >
            {formatDuration(elapsed)}
          </time>
        </div>
      </header>

      <div className="relative mx-3 mb-3 min-h-0 flex-1 overflow-hidden rounded-2xl bg-[#111a2d] sm:mx-5">
        {/* Remote party */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center px-6 text-center">
            <span className="relative mb-4 grid place-items-center">
              {connected && (
                <span
                  aria-hidden
                  className="absolute size-24 rounded-full bg-white/10 animate-beacon sm:size-28"
                />
              )}
              <span className="relative grid size-24 place-items-center rounded-full bg-white/12 text-3xl font-semibold sm:size-28">
                {initialsOf(remoteName)}
              </span>
            </span>
            <p className="text-lg font-semibold">{remoteName}</p>
            <p className="text-sm text-white/60">
              {connected ? remoteRole : "Connecting securely…"}
            </p>
          </div>
        </div>

        {/* Local preview */}
        {type === "video" && (
          <div className="absolute right-3 bottom-3 grid h-32 w-24 place-items-center overflow-hidden rounded-xl border border-white/15 bg-[#1b2740] text-center sm:h-40 sm:w-28">
            {camera ? (
              <div className="px-2">
                <span className="mx-auto mb-1.5 grid size-10 place-items-center rounded-full bg-white/12 text-sm font-semibold">
                  {session.persona.initials}
                </span>
                <p className="text-[11px] text-white/70">
                  You · {front ? "front" : "rear"} camera
                </p>
              </div>
            ) : (
              <div className="px-2 text-white/60">
                <VideoOff aria-hidden className="mx-auto mb-1 size-5" />
                <p className="text-[11px]">Camera off</p>
              </div>
            )}
          </div>
        )}

        {unit && (
          <div className="absolute top-3 left-3 rounded-xl bg-black/45 px-3 py-2 backdrop-blur-sm">
            <p className="text-[11px] text-white/60">Responding unit</p>
            <p className="text-sm font-semibold">
              {unit.callSign}
              {incident.status === "en_route" && (
                <>
                  <span className="mx-1.5 font-normal text-white/50">ETA</span>
                  <EtaCountdown at={incident.etaAt} className="text-sm" />
                </>
              )}
              {incident.status === "on_scene" && (
                <span className="ml-1.5 font-normal text-emerald-300">
                  on scene
                </span>
              )}
            </p>
          </div>
        )}

        {connected && (
          <p
            aria-live="polite"
            className="absolute inset-x-3 bottom-3 mr-28 rounded-xl bg-black/55 px-3.5 py-2.5 text-sm leading-snug backdrop-blur-sm sm:mr-32"
          >
            <span className="text-white/60">
              {asCitizen ? remoteName.split(" ")[0] : "Citizen"}:{" "}
            </span>
            “{caption}”
          </p>
        )}
      </div>

      <div className="pb-safe">
        <div className="flex items-center gap-2.5 px-4 pb-4 sm:justify-center sm:gap-3">
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto sm:flex-none sm:gap-3 sm:overflow-visible">
          <Control
            icon={muted ? MicOff : Mic}
            label={muted ? "Unmute microphone" : "Mute microphone"}
            active={muted}
            onClick={() => setMuted((v) => !v)}
          />
          <Control
            icon={speaker ? Volume2 : VolumeX}
            label={speaker ? "Turn speaker off" : "Turn speaker on"}
            active={!speaker}
            onClick={() => setSpeaker((v) => !v)}
          />
          {type === "video" && (
            <>
              <Control
                icon={camera ? Video : VideoOff}
                label={camera ? "Turn camera off" : "Turn camera on"}
                active={!camera}
                onClick={() => setCamera((v) => !v)}
              />
              <Control
                icon={SwitchCamera}
                label="Switch camera"
                onClick={() => setFront((v) => !v)}
              />
            </>
          )}
          <Control
            icon={LocateFixed}
            label={sharing ? "Stop sharing location" : "Share location"}
            active={sharing}
            onClick={() => {
              setSharing((v) => !v);
              toast(
                sharing
                  ? "Location sharing stopped for this session"
                  : "Location shared with the control room for this session",
              );
            }}
          />
          {onEscalate && (
            <Control
              icon={TriangleAlert}
              label={asCitizen ? "It is getting worse" : "Escalate incident"}
              onClick={onEscalate}
            />
          )}
          </div>
          <Control icon={PhoneOff} label="End session" danger onClick={end} />
        </div>
      </div>
    </div>
  );
}
