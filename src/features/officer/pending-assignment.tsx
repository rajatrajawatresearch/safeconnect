"use client";

import { ArrowLeft, Check, MapPin, PhoneOff } from "lucide-react";
import { useState } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { RelativeTime, ResponseTimer } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { PRIORITY_META, TONE } from "@/config/incident";
import { useAction } from "@/hooks/use-action";
import { useIsMd } from "@/hooks/use-mounted";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { formatKm } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { Assignment, Incident, Unit } from "@/types";
import { DeclineDialog } from "./assignment-dialogs";
import {
  AssistantSummary,
  CitizenCommsCard,
  DescriptionCard,
  IncidentIntel,
} from "./incident-intel";
import { NavPreviewCard } from "./nav-preview";
import { Metric, OfficerCard, StickyActionBar } from "./officer-ui";
import { ResponseLayout } from "./response-layout";

/**
 * An assignment waiting for an answer. Priority leads, then what and how far; accepting starts the
 * run, declining needs a reason so the control room can reassign without a call.
 */
export function PendingAssignment({
  incident,
  assignment,
  unit,
  onBack,
  onAnswered,
}: {
  incident: Incident;
  assignment: Assignment;
  unit: Unit;
  /** Present when the officer opened this from an active response and can go back to it. */
  onBack?: () => void;
  onAnswered?: () => void;
}) {
  const t = useT();
  const { actor } = useSession();
  const isMd = useIsMd();
  const [declineOpen, setDeclineOpen] = useState(false);
  const accept = useAction(services.units.acceptAssignment, {
    success: "Assignment accepted. You are en route.",
    onSuccess: onAnswered,
  });
  const meta = PRIORITY_META[incident.priority];
  const tone = TONE[meta.tone];
  const { landmark, area } = incident.location;

  const acceptButton = (
    <Button
      size="2xl"
      className="flex-1"
      disabled={accept.pending}
      onClick={() => void accept.run(incident.id, unit.id, actor)}
    >
      <Check aria-hidden />
      {accept.pending ? "Accepting…" : t("officer.accept")}
    </Button>
  );
  const declineButton = (
    <Button
      size="2xl"
      variant="outline"
      className="px-5 font-medium"
      disabled={accept.pending}
      onClick={() => setDeclineOpen(true)}
    >
      {t("officer.decline")}
    </Button>
  );

  const map = (
    <NavPreviewCard
      unit={unit}
      incident={incident}
      assignment={assignment}
      phase="pending"
    />
  );

  return (
    <>
      <ResponseLayout
        left={
          <>
            {onBack && (
              <Button
                variant="ghost"
                size="xl"
                className="-ml-3 text-muted-foreground"
                onClick={onBack}
              >
                <ArrowLeft aria-hidden /> Back to active response
              </Button>
            )}

            <OfficerCard
              className={cn("overflow-hidden", tone.border)}
              aria-labelledby="assignment-title"
            >
              <div className={cn("px-4 py-4 sm:px-5", tone.soft)}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px] font-medium">
                  <span>
                    {t("officer.newAssignment")}
                    {assignment.role === "backup" && " · backup unit"}
                  </span>
                  <span className="opacity-80">
                    <RelativeTime at={assignment.assignedAt} />
                  </span>
                </div>
                <p className="mt-2 text-5xl leading-none font-semibold tracking-tight sm:text-6xl">
                  <span className="sr-only">{t("officer.priority")}: </span>
                  {meta.label}
                </p>
                <p className="mt-2 text-sm">{meta.definition}</p>
              </div>

              <div className="px-4 py-4 sm:px-5">
                <h1
                  id="assignment-title"
                  className="flex items-start gap-2.5 text-xl leading-snug font-semibold tracking-tight"
                >
                  <CategoryIcon
                    categoryId={incident.categoryId}
                    className="mt-1 size-5 text-muted-foreground"
                  />
                  {incident.title}
                </h1>
                <p className="tnum mt-1 truncate font-mono text-xs text-muted-foreground">
                  {incident.id}
                </p>

                <p className="tnum mt-4 text-3xl leading-none font-semibold tracking-tight">
                  {t("officer.away", {
                    distance: formatKm(assignment.distanceKm),
                  })}
                </p>
                <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {area}
                    {landmark && ` · near ${landmark}`}
                  </span>
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
                  <Metric label={t("officer.eta")}>
                    {assignment.etaMin} min
                  </Metric>
                  <Metric label={t("officer.elapsed")}>
                    <ResponseTimer
                      since={incident.createdAt}
                      priority={incident.priority}
                      className="text-xl font-semibold"
                    />
                  </Metric>
                </dl>

                {incident.silent && (
                  <p
                    role="note"
                    className="mt-3 flex items-center gap-2 rounded-xl bg-high-soft px-3 py-2.5 text-sm font-medium text-high-fg"
                  >
                    <PhoneOff aria-hidden className="size-4 shrink-0" />
                    <span>Silent SOS. {t("officer.chatOnly")}</span>
                  </p>
                )}
              </div>

              {isMd && (
                <div className="flex gap-2.5 border-t border-border/70 p-4">
                  {declineButton}
                  {acceptButton}
                </div>
              )}
            </OfficerCard>

            {!isMd && map}
            <DescriptionCard incident={incident} />
            <AssistantSummary incident={incident} />
          </>
        }
        right={
          <>
            {isMd && map}
            <CitizenCommsCard incident={incident} />
            <IncidentIntel
              incident={incident}
              omit={["description", "summary", "comms"]}
              className="2xl:grid-cols-2"
            />
          </>
        }
        bar={
          isMd ? undefined : (
            <StickyActionBar label="Answer this assignment">
              <div className="flex gap-2.5">
                {declineButton}
                {acceptButton}
              </div>
            </StickyActionBar>
          )
        }
      />

      <DeclineDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        incident={incident}
        unitId={unit.id}
        onDeclined={onAnswered}
      />
    </>
  );
}
