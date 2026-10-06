"use client";

import { EtaCountdown } from "@/components/shared/timers";
import { useT } from "@/hooks/use-t";
import { formatKm } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Assignment, Incident, Unit } from "@/types";
import { OfficerCard } from "./officer-ui";
import { OpenInMapsLink, RouteMap, useRouteProgress } from "./route-map";

/**
 * Map of the run with the essentials under it: where, how far, how long, and a way out to full
 * directions. `pending` shows the planned run; `en_route` counts down; `on_scene` drops the line.
 */
export function NavPreviewCard({
  unit,
  incident,
  assignment,
  phase,
  interactive,
  className,
}: {
  unit: Unit;
  incident: Incident;
  assignment: Assignment;
  phase: "pending" | "en_route" | "on_scene";
  interactive?: boolean;
  className?: string;
}) {
  const t = useT();
  const { position, km } = useRouteProgress(unit, incident);
  return (
    <OfficerCard
      className={cn("overflow-hidden", className)}
      aria-label="Navigation preview"
    >
      <RouteMap
        unit={unit}
        incident={incident}
        interactive={interactive}
        showRoute={phase !== "on_scene"}
        className="h-52 sm:h-60 md:h-72 2xl:h-96"
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3">
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-sm leading-snug font-medium">
            {incident.location.address}
          </p>
          <p className="tnum mt-0.5 text-[13px] text-muted-foreground">
            {phase === "on_scene" ? (
              "You are on scene."
            ) : phase === "pending" ? (
              <>
                {formatKm(assignment.distanceKm)} by road · about{" "}
                {assignment.etaMin} min
              </>
            ) : (
              <>
                {formatKm(km)} to go · {t("officer.eta")}{" "}
                <EtaCountdown at={incident.etaAt} className="text-[13px]" />
              </>
            )}
          </p>
        </div>
        {phase !== "on_scene" && (
          <OpenInMapsLink from={position} to={incident.location} />
        )}
      </div>
    </OfficerCard>
  );
}
