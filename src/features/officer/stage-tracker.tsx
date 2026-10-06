"use client";

import { Check, ChevronDown, ShieldPlus } from "lucide-react";
import { useState } from "react";
import { OFFICER_STAGE_ORDER } from "@/config/incident";
import { useIsMd } from "@/hooks/use-mounted";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import type { Assignment, Incident, Unit } from "@/types";
import { OfficerCard } from "./officer-ui";
import { STAGE_LABEL_KEY, mainlineStage } from "./use-officer";

/**
 * Where this response stands: Assigned → Accepted → En route → On scene → Situation controlled →
 * Report pending → Completed. "Assistance requested" is drawn as a branch because it can happen on
 * the way or on scene and does not move the response forward by itself.
 */
export function StageTracker({
  incident,
  assignment,
  unit,
  className,
}: {
  incident: Incident;
  assignment: Assignment;
  unit: Unit | undefined;
  className?: string;
}) {
  const t = useT();
  const isMd = useIsMd();
  const [expanded, setExpanded] = useState<boolean | null>(null);
  // Phones start compact; larger screens have room for the full list.
  const open = expanded ?? isMd;

  const current = mainlineStage(assignment, unit);
  const index = OFFICER_STAGE_ORDER.indexOf(current);
  const next = OFFICER_STAGE_ORDER[index + 1];
  const assistance =
    assignment.stage === "assistance_requested" || incident.backupRequested;
  const listId = `stages-${assignment.id}`;

  return (
    <OfficerCard
      className={cn("p-4", className)}
      aria-labelledby={`stage-title-${assignment.id}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id={`stage-title-${assignment.id}`}
          className="text-xs text-muted-foreground"
        >
          {t("officer.status")}
        </h2>
        <p className="tnum text-xs text-muted-foreground">
          Step {index + 1} of {OFFICER_STAGE_ORDER.length}
        </p>
      </div>
      <p
        role="status"
        className="mt-0.5 text-lg leading-tight font-semibold tracking-tight"
      >
        {t(STAGE_LABEL_KEY[current])}
      </p>

      <div aria-hidden className="mt-3 flex gap-1">
        {OFFICER_STAGE_ORDER.map((stage, i) => (
          <span
            key={stage}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < index && "bg-resolved",
              i === index && "bg-primary",
              i > index && "bg-border",
            )}
          />
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-[13px] text-muted-foreground">
          {next ? (
            <>
              Next:{" "}
              <span className="font-medium text-foreground">
                {t(STAGE_LABEL_KEY[next])}
              </span>
            </>
          ) : (
            "Response closed"
          )}
        </p>
        <button
          type="button"
          onClick={() => setExpanded(!open)}
          aria-expanded={open}
          aria-controls={listId}
          className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-primary hover:bg-muted"
        >
          All stages
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {assistance && (
        <p className="mt-2.5 flex items-center gap-2 rounded-xl bg-high-soft px-3 py-2.5 text-[13px] font-medium text-high-fg">
          <ShieldPlus aria-hidden className="size-4 shrink-0" />
          {t("officer.stage.assistance_requested")} · control room alerted
        </p>
      )}

      {open && (
        <ol id={listId} className="mt-3 border-t border-border/70 pt-3">
          {OFFICER_STAGE_ORDER.map((stage, i) => {
            const done = i < index;
            const isCurrent = i === index;
            const last = i === OFFICER_STAGE_ORDER.length - 1;
            return (
              <li
                key={stage}
                aria-current={isCurrent ? "step" : undefined}
                className="relative pb-2.5 last:pb-0"
              >
                {!last && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-6 bottom-0 left-[11px] w-px",
                      done ? "bg-resolved/60" : "bg-border",
                    )}
                  />
                )}
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "relative z-10 grid size-6 shrink-0 place-items-center rounded-full border",
                      done && "border-resolved bg-resolved text-resolved-on",
                      isCurrent && "border-primary bg-primary",
                      !done && !isCurrent && "border-input bg-card",
                    )}
                  >
                    {done && <Check className="size-3.5" strokeWidth={3} />}
                    {isCurrent && (
                      <span className="size-2 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      isCurrent
                        ? "font-semibold"
                        : done
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {t(STAGE_LABEL_KEY[stage])}
                    <span className="sr-only">
                      {done
                        ? ", done"
                        : isCurrent
                          ? ", current stage"
                          : ", not yet"}
                    </span>
                  </span>
                </div>
                {stage === "on_scene" && (
                  <p
                    className={cn(
                      "mt-1.5 ml-9 flex items-center gap-1.5 text-xs",
                      assistance
                        ? "font-medium text-high-fg"
                        : "text-muted-foreground",
                    )}
                  >
                    <ShieldPlus aria-hidden className="size-3.5 shrink-0" />
                    {t("officer.stage.assistance_requested")}
                    {assistance ? " · requested" : " · a branch, if needed"}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </OfficerCard>
  );
}
