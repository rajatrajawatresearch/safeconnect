"use client";

import {
  CopyCheck,
  FilePen,
  ListTodo,
  ScanSearch,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PriorityBadge, StatusChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PRIORITY_META, STATUS_META } from "@/config/incident";
import {
  useCategoryLookup,
  useIncidentEvidence,
  useIncidents,
  useUnits,
} from "@/hooks/use-demo-data";
import { formatTime } from "@/lib/format";
import { distanceKm } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { Incident, IncidentSource, Unit } from "@/types";
import { ActionButton } from "./action-button";
import { liveAssignments } from "./incident-rules";

type Helper = "summary" | "report" | "duplicates" | "missing";

const HELPERS: { key: Helper; label: string; icon: LucideIcon }[] = [
  { key: "summary", label: "Summarise incident", icon: Sparkles },
  { key: "report", label: "Draft response report", icon: FilePen },
  { key: "duplicates", label: "Check for duplicates", icon: ScanSearch },
  { key: "missing", label: "List missing information", icon: ListTodo },
];

const SOURCE_PHRASE: Record<IncidentSource, string> = {
  sos: "an SOS from the citizen app",
  silent_sos: "a silent SOS",
  report: "a citizen report",
  call: "a voice call",
  tip: "a confidential tip",
  journey: "a journey safety alert",
};

const callSigns = (incident: Incident, units: Unit[]) =>
  liveAssignments(incident)
    .map((a) => units.find((u) => u.id === a.unitId)?.callSign)
    .filter((c): c is string => Boolean(c));

function buildSummary(
  incident: Incident,
  units: Unit[],
  category: string,
  evidenceCount: number,
): string[] {
  const signs = callSigns(incident, units);
  return [
    `${PRIORITY_META[incident.priority].label} priority ${category.toLowerCase()} at ${incident.location.area}, raised at ${formatTime(incident.createdAt)} through ${SOURCE_PHRASE[incident.source]}.`,
    incident.ai?.summary ?? incident.description,
    `Status is ${STATUS_META[incident.status].label.toLowerCase()}${
      signs.length ? ` with ${signs.join(" and ")} on the response` : ""
    }. ${evidenceCount} evidence ${evidenceCount === 1 ? "item" : "items"} and ${incident.notes.length} internal ${incident.notes.length === 1 ? "note" : "notes"} are on record.`,
  ];
}

/** A plain draft from the recorded times. The outcome is deliberately left for the operator. */
function buildReportDraft(
  incident: Incident,
  units: Unit[],
  category: string,
): string {
  const signs = callSigns(incident, units);
  const parts = [
    `${category} at ${incident.location.address}.`,
    `Raised at ${formatTime(incident.createdAt)} through ${SOURCE_PHRASE[incident.source]}${
      incident.acknowledgedAt
        ? `; acknowledged by the control room at ${formatTime(incident.acknowledgedAt)}`
        : ""
    }.`,
    signs.length
      ? `${signs.join(" and ")} responded${
          incident.arrivedAt
            ? ` and reached the scene at ${formatTime(incident.arrivedAt)}`
            : ""
        }.`
      : "No unit attended.",
    "Outcome: ",
  ];
  return parts.join(" ");
}

/** Same category, a few hundred metres apart and close in time — or already flagged on either record. */
function likelyDuplicates(incident: Incident, all: Incident[]): Incident[] {
  const found = new Map<string, Incident>();
  for (const other of all) {
    if (other.id === incident.id) continue;
    const flagged =
      incident.ai?.duplicateOfId === other.id ||
      other.ai?.duplicateOfId === incident.id;
    const similar =
      other.categoryId === incident.categoryId &&
      distanceKm(other.location, incident.location) < 0.6 &&
      Math.abs(other.createdAt - incident.createdAt) < 45 * 60_000;
    if (flagged || similar) found.set(other.id, other);
  }
  return [...found.values()];
}

/**
 * Operator assistant. Every helper works from the incident record already on screen and returns
 * text for the operator to read, edit or ignore — none of them changes the incident.
 */
export function AssistantPanel({
  incident,
  resolveReason,
  onUseAsResolution,
  onAskCitizen,
}: {
  incident: Incident;
  /** Why the incident cannot be resolved right now, if it cannot. */
  resolveReason: string | null;
  onUseAsResolution: (note: string) => void;
  /** Jumps to the conversation with the citizen. */
  onAskCitizen?: () => void;
}) {
  const units = useUnits();
  const all = useIncidents();
  const evidence = useIncidentEvidence(incident.id);
  const lookup = useCategoryLookup();
  const titleId = useId();
  const [active, setActive] = useState<Helper | null>(null);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const run = (helper: Helper) => {
    if (timer.current) clearTimeout(timer.current);
    setActive(helper);
    setReady(false);
    timer.current = setTimeout(() => setReady(true), 480);
  };

  const category = lookup(incident.categoryId)?.label ?? incident.title;
  const summary = useMemo(
    () => buildSummary(incident, units, category, evidence.length),
    [incident, units, category, evidence.length],
  );
  const draft = useMemo(
    () => buildReportDraft(incident, units, category),
    [incident, units, category],
  );
  const duplicates = useMemo(
    () => likelyDuplicates(incident, all),
    [incident, all],
  );
  const missing = incident.ai?.missingInfo ?? [];

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border border-border/70 bg-inset"
    >
      <header className="border-b border-border/70 px-3.5 py-2.5">
        <h3
          id={titleId}
          className="flex items-center gap-1.5 text-sm font-semibold"
        >
          <Sparkles aria-hidden className="size-4 text-primary" />
          Assistant
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Works from this incident&apos;s record. Review anything it writes
          before you use it.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-1.5 px-3.5 pt-3 @sm:grid-cols-2">
        {HELPERS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant="outline"
            aria-pressed={active === key}
            onClick={() => run(key)}
            className={cn(
              "justify-start bg-card",
              active === key && "border-primary/60 bg-accent/60",
            )}
          >
            <Icon aria-hidden />
            <span className="truncate">{label}</span>
          </Button>
        ))}
      </div>

      <div className="px-3.5 py-3" aria-live="polite">
        {!active ? (
          <p className="text-[13px] text-muted-foreground">
            Choose a helper. Nothing is changed on the incident.
          </p>
        ) : !ready ? (
          <div className="space-y-2" aria-busy="true" aria-label="Working">
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
          </div>
        ) : active === "summary" ? (
          <div className="space-y-1.5 text-sm leading-relaxed">
            {summary.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : active === "report" ? (
          <div className="space-y-2.5">
            <p className="rounded-lg border border-border/70 bg-card px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
              {draft}
              <span className="text-muted-foreground">
                [add what was found and how it was left]
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={FilePen}
                label="Use as resolution note"
                reason={resolveReason}
                onClick={() => onUseAsResolution(draft)}
              />
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(draft);
                    toast.success("Draft copied");
                  } catch {
                    toast.error("Copy is not available in this browser.");
                  }
                }}
              >
                <CopyCheck aria-hidden /> Copy draft
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A draft from the recorded times. The outcome is left for you to
              write, and nothing is filed until you resolve the incident.
            </p>
          </div>
        ) : active === "duplicates" ? (
          duplicates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No likely duplicates. Nothing else of this category was reported
              close to this place and time.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-[13px] text-muted-foreground">
                {duplicates.length === 1
                  ? "One report may describe the same event."
                  : `${duplicates.length} reports may describe the same event.`}{" "}
                Compare them before treating them as one.
              </p>
              <ul className="space-y-1.5">
                {duplicates.map((other) => (
                  <li key={other.id}>
                    <Link
                      href={`/control/incidents?id=${other.id}`}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm hover:border-input hover:bg-muted/50"
                    >
                      <PriorityBadge priority={other.priority} variant="soft" />
                      <span className="tnum font-mono text-xs">{other.id}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {other.title} · {other.location.area}
                      </span>
                      <StatusChip status={other.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : missing.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing is flagged as missing on this incident.
          </p>
        ) : (
          <div className="space-y-2.5">
            <ul className="list-disc space-y-1 pl-4 text-sm marker:text-subtle">
              {missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {onAskCitizen && (
              <Button variant="outline" onClick={onAskCitizen}>
                Ask the citizen in chat
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
