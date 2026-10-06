"use client";

import { ClipboardList, Home, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageContainer } from "@/components/shared/page";
import { BlankState, EmptyState } from "@/components/shared/states";
import { OfficerStageChip, StatusChip } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/use-t";
import type { Incident } from "@/types";
import { ActiveResponse } from "./active-response";
import { NoUnitState, OfficerCard } from "./officer-ui";
import { PendingAssignment } from "./pending-assignment";
import { assignmentOf, isOpenIncident, useOfficer } from "./use-officer";

/** Nothing to respond to. Points at the report that became due, or back to the home screen. */
function NoAssignment({
  reportsDue,
  justCompleted,
  last,
  unitId,
}: {
  reportsDue: Incident[];
  justCompleted: string | null;
  /** The most recent assignment that has ended, for context. */
  last: Incident | undefined;
  unitId: string;
}) {
  const t = useT();
  const completed = reportsDue.find((i) => i.id === justCompleted);
  const due = completed ?? reportsDue[0];
  const lastAssignment = last ? assignmentOf(last, unitId) : undefined;

  const homeButton = (
    <Button asChild size="xl" variant="outline">
      <Link href="/officer">
        <Home aria-hidden /> Back to home
      </Link>
    </Button>
  );

  return (
    <PageContainer width="narrow" className="space-y-4">
      <h1 className="sr-only">{t("nav.assignment")}</h1>
      <OfficerCard>
        {completed ? (
          <EmptyState
            title="Response complete"
            description={
              <>
                <span className="tnum font-mono text-[13px]">
                  {completed.id}
                </span>{" "}
                is resolved and your unit is available again. Your preliminary
                response report is now due.
              </>
            }
            action={
              <>
                <Button asChild size="xl">
                  <Link href={`/officer/reports?id=${completed.id}`}>
                    <ClipboardList aria-hidden /> {t("officer.writeReport")}
                  </Link>
                </Button>
                {homeButton}
              </>
            }
          />
        ) : (
          <BlankState
            icon={ShieldCheck}
            title={t("officer.noAssignment")}
            description={t("officer.noAssignmentBody")}
            action={homeButton}
          />
        )}
      </OfficerCard>

      {due && !completed && (
        <OfficerCard className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">
              {reportsDue.length === 1
                ? "1 report is due"
                : `${reportsDue.length} reports are due`}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {due.title} ·{" "}
              <span className="tnum font-mono text-xs">{due.id}</span>
            </p>
          </div>
          <Button asChild size="xl" variant="secondary">
            <Link href={`/officer/reports?id=${due.id}`}>
              <ClipboardList aria-hidden /> {t("officer.writeReport")}
            </Link>
          </Button>
        </OfficerCard>
      )}

      {last && last.id !== completed?.id && (
        <OfficerCard className="p-4" aria-labelledby="last-assignment">
          <h2 id="last-assignment" className="text-xs text-muted-foreground">
            Your last assignment
          </h2>
          <p className="mt-1 text-[15px] font-semibold">{last.title}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {last.location.area} ·{" "}
            <span className="tnum font-mono text-xs">{last.id}</span>
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <StatusChip status={last.status} />
            {lastAssignment && (
              <OfficerStageChip stage={lastAssignment.stage} />
            )}
            <span className="text-xs text-muted-foreground">
              <RelativeTime at={last.resolvedAt ?? last.createdAt} />
            </span>
          </div>
          {(last.resolution ?? last.cancelReason) && (
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              {last.resolution ?? last.cancelReason}
            </p>
          )}
          <Button
            asChild
            variant="ghost"
            size="xl"
            className="mt-2 -ml-3 text-primary"
          >
            <Link href={`/officer/incidents?filter=completed&id=${last.id}`}>
              View incident record
            </Link>
          </Button>
        </OfficerCard>
      )}
    </PageContainer>
  );
}

/** `/officer/assignment` — the pending assignment, the response in progress, or neither. */
export function AssignmentScreen() {
  const { unit, unitId, work } = useOfficer();
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [reviewingWaiting, setReviewingWaiting] = useState(false);

  if (!unit || !unitId) return <NoUnitState />;
  const { pending, active, reportsDue, history } = work;

  if (pending && (!active || reviewingWaiting))
    return (
      <PendingAssignment
        key={pending.incident.id}
        incident={pending.incident}
        assignment={pending.assignment}
        unit={unit}
        onBack={active ? () => setReviewingWaiting(false) : undefined}
        onAnswered={() => setReviewingWaiting(false)}
      />
    );

  if (active)
    return (
      <ActiveResponse
        key={active.incident.id}
        incident={active.incident}
        assignment={active.assignment}
        unit={unit}
        waiting={pending}
        onReviewWaiting={() => setReviewingWaiting(true)}
        onCompleted={setJustCompleted}
      />
    );

  return (
    <NoAssignment
      reportsDue={reportsDue}
      justCompleted={justCompleted}
      last={history.find((i) => !isOpenIncident(i))}
      unitId={unitId}
    />
  );
}
