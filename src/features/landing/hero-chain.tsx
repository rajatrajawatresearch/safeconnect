"use client";

import {
  Check,
  Headset,
  MapPin,
  RotateCcw,
  Smartphone,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PriorityBadge, ToneChip } from "@/components/shared/status-chips";
import type { Tone } from "@/config/incident";
import { useHoldToConfirm } from "@/features/sos/use-hold-to-confirm";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

type Phase =
  | "idle"
  | "sent"
  | "acknowledged"
  | "assigned"
  | "en_route"
  | "arrived";

const ORDER: Phase[] = [
  "idle",
  "sent",
  "acknowledged",
  "assigned",
  "en_route",
  "arrived",
];
/** Milliseconds after the SOS at which each phase begins. */
const AT: Record<Exclude<Phase, "idle">, number> = {
  sent: 0,
  acknowledged: 1600,
  assigned: 3400,
  en_route: 5200,
  arrived: 11000,
};

const STATUS: Record<Phase, { label: string; tone: Tone }> = {
  idle: { label: "Waiting", tone: "neutral" },
  sent: { label: "New", tone: "critical" },
  acknowledged: { label: "Acknowledged", tone: "high" },
  assigned: { label: "Unit assigned", tone: "medium" },
  en_route: { label: "En route", tone: "normal" },
  arrived: { label: "On scene", tone: "resolved" },
};

const reached = (phase: Phase, target: Phase) =>
  ORDER.indexOf(phase) >= ORDER.indexOf(target);

/**
 * The product in one gesture: hold the button and watch one SOS travel from a citizen's phone,
 * through the control room, to a unit on the road. Nothing here touches the demo data.
 */
export function HeroChain() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  }, []);

  const run = useCallback(() => {
    clear();
    const startedAt = Date.now();
    setElapsed(0);
    setPhase("sent");
    ticker.current = setInterval(() => setElapsed(Date.now() - startedAt), 250);
    (Object.keys(AT) as Exclude<Phase, "idle">[]).forEach((p) => {
      if (p === "sent") return;
      timers.current.push(setTimeout(() => setPhase(p), AT[p]));
    });
    timers.current.push(
      setTimeout(() => {
        if (ticker.current) clearInterval(ticker.current);
        ticker.current = null;
      }, AT.arrived + 300),
    );
  }, [clear]);

  // Plays once on arrival so the chain is understood before anyone touches it.
  useEffect(() => {
    const id = setTimeout(run, 1100);
    return () => {
      clearTimeout(id);
      clear();
    };
  }, [run, clear]);

  const hold = useHoldToConfirm({ durationMs: 3000, onConfirm: run });
  const ring = 2 * Math.PI * 27;
  const seconds = elapsed / 1000;
  const eta = Math.max(0, 228 - Math.max(0, seconds - AT.en_route / 1000) * 38);

  const rows = [
    {
      key: "citizen",
      icon: Smartphone,
      label: "Citizen",
      active: true,
      body: (
        <div className="flex items-center gap-4">
          <button
            type="button"
            {...hold.handlers}
            aria-label="Hold for three seconds to replay the SOS demonstration"
            className="relative grid size-16 shrink-0 touch-none place-items-center rounded-full bg-critical text-critical-on outline-offset-4 select-none"
          >
            <svg
              aria-hidden
              viewBox="0 0 60 60"
              className="absolute inset-0 size-full -rotate-90"
            >
              <circle
                cx="30"
                cy="30"
                r="27"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.28"
                strokeWidth="3"
              />
              <circle
                cx="30"
                cy="30"
                r="27"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={ring}
                strokeDashoffset={ring * (1 - hold.progress)}
              />
            </svg>
            <span className="text-sm font-semibold tracking-wide">
              {hold.holding ? hold.secondsLeft : "SOS"}
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {phase === "idle" ? "Hold for SOS" : "SOS sent"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
              {phase === "idle" ? (
                "Press and hold for 3 seconds"
              ) : (
                <>
                  <MapPin aria-hidden className="size-3.5 shrink-0" /> Location
                  attached · Navrangpura
                </>
              )}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "control",
      icon: Headset,
      label: "Control room",
      active: reached(phase, "sent"),
      body: (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge
              priority="P1"
              variant={reached(phase, "sent") ? "solid" : "outline"}
            />
            <span className="text-sm font-semibold">Personal danger</span>
            <ToneChip tone={STATUS[phase].tone} dot className="ml-auto">
              {STATUS[phase].label}
            </ToneChip>
          </div>
          <p className="mt-1.5 flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
            <span className="truncate">
              {reached(phase, "acknowledged")
                ? "Operator Meera is with the citizen"
                : reached(phase, "sent")
                  ? "Ringing the control room"
                  : "No incident"}
            </span>
            <time className="tnum font-mono text-foreground">
              {formatDuration(seconds, true)}
            </time>
          </p>
        </div>
      ),
    },
    {
      key: "unit",
      icon: Truck,
      label: "Field unit",
      active: reached(phase, "assigned"),
      body: (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Unit GJ-AHD-01</p>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {phase === "arrived"
                ? "Officers are with the citizen"
                : reached(phase, "en_route")
                  ? "Accepted · on the way"
                  : reached(phase, "assigned")
                    ? "Assignment received"
                    : "Available · 1.1 km away"}
            </p>
          </div>
          {phase === "arrived" ? (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-resolved-soft text-resolved-fg">
              <Check aria-hidden className="size-5" />
            </span>
          ) : (
            <p className="shrink-0 text-right">
              <span className="block text-[11px] text-muted-foreground">
                ETA
              </span>
              <span className="tnum font-mono text-sm font-semibold">
                {reached(phase, "en_route") ? formatDuration(eta) : "—"}
              </span>
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-raised sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">One SOS, three screens</p>
        <button
          type="button"
          onClick={run}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RotateCcw aria-hidden className="size-3.5" /> Replay
        </button>
      </div>
      <ol className="relative space-y-2.5" aria-live="polite">
        {rows.map((row, index) => (
          <li key={row.key} className="relative flex gap-3">
            {index < rows.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-10 -bottom-2.5 left-[17px] w-px",
                  rows[index + 1].active ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 mt-2 grid size-9 shrink-0 place-items-center rounded-full border transition-colors",
                row.active
                  ? "border-primary/40 bg-accent text-accent-foreground"
                  : "border-border bg-card text-subtle",
              )}
            >
              <row.icon aria-hidden className="size-4" />
            </span>
            <div
              className={cn(
                "min-w-0 flex-1 rounded-2xl border p-3.5 transition-opacity",
                row.active
                  ? "border-border bg-inset"
                  : "border-dashed border-border opacity-55",
              )}
            >
              <p className="mb-2 text-xs text-muted-foreground">{row.label}</p>
              {row.body}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
