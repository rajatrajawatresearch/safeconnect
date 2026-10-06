"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { EtaCountdown } from "@/components/shared/timers";
import { useT } from "@/hooks/use-t";
import { formatKm, formatTime } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Assignment, Incident, Unit } from "@/types";

export interface SosStep {
  key: "sent" | "connected" | "operator" | "unit" | "enRoute" | "arrived";
  labelKey: TKey;
  /** When the step completed. Absent means it has not happened yet. */
  at?: number;
}

/** The primary assignment the citizen is waiting on, ignoring any unit that declined. */
export function primaryAssignment(incident: Incident): Assignment | undefined {
  return (
    incident.assignments.find(
      (a) => a.role === "primary" && a.response !== "rejected",
    ) ?? incident.assignments.find((a) => a.response !== "rejected")
  );
}

/** The six stages a citizen is told about, each read straight off the incident record. */
export function deriveSteps(incident: Incident): SosStep[] {
  return [
    {
      key: "sent",
      labelKey: "citizen.sos.step.sent",
      at: incident.createdAt,
    },
    {
      key: "connected",
      labelKey: "citizen.sos.step.connected",
      at: incident.acknowledgedAt,
    },
    {
      key: "operator",
      labelKey: "citizen.sos.step.operator",
      at: incident.operatorName ? incident.acknowledgedAt : undefined,
    },
    {
      key: "unit",
      labelKey: "citizen.sos.step.unit",
      at: incident.assignedAt,
    },
    {
      key: "enRoute",
      labelKey: "citizen.sos.step.enRoute",
      at: incident.enRouteAt,
    },
    {
      key: "arrived",
      labelKey: "citizen.sos.step.arrived",
      at: incident.arrivedAt,
    },
  ];
}

/** Index of the stage in progress, or `steps.length` once the responder has arrived. */
export function currentStepIndex(steps: SosStep[]): number {
  const index = steps.findIndex((s) => s.at === undefined);
  return index === -1 ? steps.length : index;
}

/**
 * Live status for the citizen: finished stages are ticked with their time, the stage in progress
 * is marked, and each change is announced to assistive technology.
 */
export function StatusStepper({
  incident,
  unit,
  className,
}: {
  incident: Incident;
  unit: Unit | undefined;
  className?: string;
}) {
  const t = useT();
  const steps = deriveSteps(incident);
  const current = currentStepIndex(steps);
  const assignment = primaryAssignment(incident);
  const operator = incident.operatorName?.split(" ")[0];

  const detail = (step: SosStep, state: "done" | "current" | "waiting") => {
    if (state === "waiting") return null;
    const done = state === "done";
    const lines: Record<SosStep["key"], ReactNode> = {
      sent: t(
        incident.location.source === "device_emergency"
          ? "citizen.sos.detail.sent"
          : "citizen.sos.detail.sentArea",
        { area: incident.location.area },
      ),
      connected: t(
        done ? "citizen.sos.detail.connected" : "citizen.sos.detail.connecting",
      ),
      operator:
        done && operator
          ? t("citizen.sos.detail.operator", { name: operator })
          : t("citizen.sos.detail.operatorPending"),
      unit:
        done && unit
          ? t("citizen.sos.detail.unit", {
              callSign: unit.callSign,
              distance: assignment ? formatKm(assignment.distanceKm) : "",
            })
          : t("citizen.sos.findingUnit"),
      enRoute: done
        ? t("citizen.sos.detail.enRoute")
        : t("citizen.sos.detail.enRoutePending"),
      arrived: done ? (
        t("citizen.sos.detail.arrived")
      ) : (
        <>
          {t("citizen.sos.eta")}{" "}
          <EtaCountdown
            at={incident.etaAt}
            arrivingLabel={t("citizen.sos.arriving")}
            className="font-medium text-foreground"
          />
        </>
      ),
    };
    return lines[step.key];
  };

  const latest = current > 0 ? steps[current - 1] : undefined;

  return (
    <div className={className}>
      <ol>
        {steps.map((step, index) => {
          const state =
            index < current
              ? "done"
              : index === current
                ? "current"
                : "waiting";
          const last = index === steps.length - 1;
          const line = detail(step, state);
          return (
            <li
              key={step.key}
              aria-current={state === "current" ? "step" : undefined}
              className={cn("relative flex gap-3.5", !last && "pb-5")}
            >
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-8 bottom-0 left-[15px] w-0.5 rounded-full",
                    state === "done" ? "bg-resolved" : "bg-border",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2",
                  state === "done" && "border-resolved bg-resolved text-resolved-on",
                  state === "current" && "border-primary bg-card",
                  state === "waiting" && "border-border bg-card",
                )}
              >
                {state === "done" && (
                  <Check className="size-4 animate-rise" strokeWidth={3} />
                )}
                {state === "current" && (
                  <span className="size-2.5 rounded-full bg-primary" />
                )}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={cn(
                      "text-base leading-snug",
                      state === "waiting"
                        ? "text-muted-foreground"
                        : "font-medium",
                    )}
                  >
                    {t(step.labelKey)}
                  </p>
                  {state === "done" && step.at !== undefined && (
                    <time
                      dateTime={new Date(step.at).toISOString()}
                      className="tnum shrink-0 font-mono text-sm text-muted-foreground"
                    >
                      {formatTime(step.at)}
                    </time>
                  )}
                  {state === "current" && (
                    <span className="shrink-0 text-sm font-medium text-primary">
                      {t("citizen.sos.stepNow")}
                    </span>
                  )}
                </div>
                {line && (
                  <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                    {line}
                  </p>
                )}
                <span className="sr-only">
                  {state === "done"
                    ? t("citizen.sos.stepDone")
                    : state === "waiting"
                      ? t("citizen.sos.stepWaiting")
                      : ""}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" role="status" aria-live="polite">
        {latest ? t(latest.labelKey) : ""}
      </p>
    </div>
  );
}
