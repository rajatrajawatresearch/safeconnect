"use client";

import { useMemo } from "react";
import { Panel, PanelHeader } from "@/components/shared/page";
import { PRIORITIES, TONE, type Tone } from "@/config/incident";
import { formatDuration, formatSeconds } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Incident, SlaPolicy } from "@/types";

interface StageResult {
  key: "acknowledge" | "dispatch" | "arrival";
  label: string;
  /** What the clock runs to. */
  until: string;
  measured: number;
  within: number;
  avgSec: number;
  /** Target per priority, already formatted. */
  targets: { priority: string; value: string }[];
}

const STAGES: {
  key: StageResult["key"];
  label: string;
  until: string;
  at: (incident: Incident) => number | undefined;
  targetSec: (policy: SlaPolicy) => number;
}[] = [
  {
    key: "acknowledge",
    label: "Acknowledgement",
    until: "Created to acknowledged by the control room",
    at: (i) => i.acknowledgedAt,
    targetSec: (p) => p.acknowledgeSec,
  },
  {
    key: "dispatch",
    label: "Dispatch",
    until: "Created to first unit assigned",
    at: (i) => i.assignedAt,
    targetSec: (p) => p.dispatchSec,
  },
  {
    key: "arrival",
    label: "Arrival",
    until: "Created to first unit on scene",
    at: (i) => i.arrivedAt,
    targetSec: (p) => p.arrivalMin * 60,
  },
];

/** Each stage measured from the incident's own timestamps against the target for its priority. */
export function measureResponse(
  incidents: Incident[],
  policies: SlaPolicy[],
): StageResult[] {
  const policyOf = new Map(policies.map((p) => [p.priority, p]));
  return STAGES.map((stage) => {
    let measured = 0;
    let within = 0;
    let total = 0;
    for (const incident of incidents) {
      const at = stage.at(incident);
      const policy = policyOf.get(incident.priority);
      if (!at || !policy) continue;
      const seconds = Math.max(0, (at - incident.createdAt) / 1000);
      measured += 1;
      total += seconds;
      if (seconds <= stage.targetSec(policy)) within += 1;
    }
    return {
      key: stage.key,
      label: stage.label,
      until: stage.until,
      measured,
      within,
      avgSec: measured ? total / measured : 0,
      targets: PRIORITIES.flatMap((priority) => {
        const policy = policyOf.get(priority);
        return policy
          ? [{ priority, value: formatSeconds(stage.targetSec(policy)) }]
          : [];
      }),
    };
  });
}

const toneFor = (pct: number): Tone =>
  pct >= 90 ? "resolved" : pct >= 70 ? "medium" : "high";

export function ResponseTargets({
  incidents,
  policies,
}: {
  incidents: Incident[];
  policies: SlaPolicy[];
}) {
  const stages = useMemo(
    () => measureResponse(incidents, policies),
    [incidents, policies],
  );
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Response against demo targets"
        description="This station's incidents, measured from their own timestamps. Targets are demonstration values, not official service levels."
      />
      <div className="grid gap-px bg-border/70 sm:grid-cols-3">
        {stages.map((stage) => {
          const pct = stage.measured
            ? Math.round((stage.within / stage.measured) * 100)
            : 0;
          const tone = toneFor(pct);
          return (
            <div key={stage.key} className="min-w-0 bg-card p-4">
              <p className="text-[13px] text-muted-foreground">{stage.label}</p>
              {stage.measured === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No incident has reached this stage yet.
                </p>
              ) : (
                <>
                  <p className="mt-2 flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        "tnum text-[28px] leading-none font-semibold tracking-tight",
                        TONE[tone].text,
                      )}
                    >
                      {pct}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      within target
                    </span>
                  </p>
                  <div
                    role="progressbar"
                    aria-label={`${stage.label} within target`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className={cn("h-full rounded-full", TONE[tone].dot)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="tnum mt-2.5 text-xs text-muted-foreground">
                    {stage.within} of {stage.measured}{" "}
                    {stage.measured === 1 ? "incident" : "incidents"} · average{" "}
                    <span className="font-mono text-foreground">
                      {formatDuration(stage.avgSec)}
                    </span>
                  </p>
                </>
              )}
              <p className="mt-3 text-xs leading-relaxed text-subtle">
                {stage.until}
              </p>
              <dl className="tnum mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {stage.targets.map((target) => (
                  <div key={target.priority} className="flex gap-1">
                    <dt className="font-medium">{target.priority}</dt>
                    <dd>{target.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
