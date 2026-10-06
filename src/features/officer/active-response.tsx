"use client";

import {
  BellRing,
  ChevronRight,
  CircleCheckBig,
  Headset,
  MapPin,
  MapPinCheck,
  MessageCircle,
  Navigation,
  ShieldCheck,
  ShieldPlus,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import {
  OfficerStageChip,
  PriorityBadge,
  ToneChip,
} from "@/components/shared/status-chips";
import {
  EtaCountdown,
  RelativeTime,
  ResponseTimer,
} from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useIncidentMessages, useLiveSession } from "@/hooks/use-demo-data";
import { useIsMd } from "@/hooks/use-mounted";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { formatKm } from "@/lib/format";
import { services } from "@/services";
import type { Assignment, Incident, SessionType, Unit } from "@/types";
import {
  BackupDialog,
  CompleteDialog,
  ContactSheet,
  ControlRoomSheet,
  NavigationDialog,
  SessionDialog,
} from "./assignment-dialogs";
import { CitizenCommsCard, IncidentIntel } from "./incident-intel";
import { NavPreviewCard } from "./nav-preview";
import { Metric, OfficerCard, StickyActionBar } from "./officer-ui";
import { ResponseLayout } from "./response-layout";
import { useRouteProgress } from "./route-map";
import { StageTracker } from "./stage-tracker";
import { UpdateIncident } from "./update-incident";
import { hasArrived } from "./use-officer";

type Overlay = "navigate" | "contact" | "control" | "backup" | "complete";

function ActionTile({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint?: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="h-auto min-h-20 flex-col gap-1 rounded-2xl px-2 py-3 text-center text-sm leading-tight font-medium whitespace-normal"
    >
      <Icon aria-hidden className="mb-0.5 size-5 text-primary" />
      {label}
      {hint && (
        <span className="tnum text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      )}
    </Button>
  );
}

/**
 * The response in progress. One primary action moves the response forward (Arrived → Situation
 * controlled → Complete response); everything else is a tile away. Controls only exist while they
 * are valid for the current stage.
 */
export function ActiveResponse({
  incident,
  assignment,
  unit,
  waiting,
  onReviewWaiting,
  onCompleted,
}: {
  incident: Incident;
  assignment: Assignment;
  unit: Unit;
  /** Another assignment that arrived while this one is in progress. */
  waiting?: { incident: Incident; assignment: Assignment } | null;
  onReviewWaiting?: () => void;
  onCompleted?: (incidentId: string) => void;
}) {
  const t = useT();
  const { actor, can } = useSession();
  const isMd = useIsMd();
  const { km } = useRouteProgress(unit, incident);
  const live = useLiveSession(incident.id);
  const citizenThread = useIncidentMessages(incident.id, "citizen");
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [session, setSession] = useState<SessionType | null>(null);

  const arrived = hasArrived(assignment, unit);
  const controlled = assignment.stage === "situation_controlled";
  const backupRequested =
    incident.backupRequested || assignment.stage === "assistance_requested";
  const mayUpdate = can("unit.status.update");
  const lastFromCitizen = [...citizenThread]
    .reverse()
    .find((m) => m.senderRole === "citizen");
  const { landmark, area } = incident.location;

  const arrive = useAction(services.units.markArrived, {
    success: "Marked on scene",
    onSuccess: () => setOverlay((o) => (o === "navigate" ? null : o)),
  });
  const control = useAction(services.units.updateStage, {
    success: "Situation marked controlled",
  });
  const markArrived = () => void arrive.run(incident.id, unit.id, actor);

  const overlayToggle = (name: Overlay) => (open: boolean) =>
    setOverlay(open ? name : null);

  const primary = !arrived ? (
    <Button
      variant="success"
      size="2xl"
      className="w-full"
      disabled={!mayUpdate || arrive.pending}
      onClick={markArrived}
    >
      <MapPinCheck aria-hidden />
      {arrive.pending ? "Marking…" : t("officer.arrived")}
    </Button>
  ) : !controlled ? (
    <Button
      size="2xl"
      className="w-full"
      disabled={!mayUpdate || control.pending}
      onClick={() =>
        void control.run(incident.id, unit.id, "situation_controlled", actor)
      }
    >
      <ShieldCheck aria-hidden />
      {control.pending ? "Updating…" : t("officer.situationControlled")}
    </Button>
  ) : (
    <Button
      variant="success"
      size="2xl"
      className="w-full"
      disabled={!mayUpdate}
      onClick={() => setOverlay("complete")}
    >
      <CircleCheckBig aria-hidden />
      {t("officer.completeResponse")}
    </Button>
  );

  const map = (
    <NavPreviewCard
      unit={unit}
      incident={incident}
      assignment={assignment}
      phase={arrived ? "on_scene" : "en_route"}
      interactive={isMd}
    />
  );

  return (
    <>
      <ResponseLayout
        left={
          <>
            {waiting && onReviewWaiting && (
              <button
                type="button"
                onClick={onReviewWaiting}
                className="flex w-full items-center gap-3 rounded-2xl border border-high/35 bg-high-soft px-4 py-3 text-left text-high-fg"
              >
                <BellRing aria-hidden className="size-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {t("officer.newAssignment")} waiting
                  </span>
                  <span className="block truncate text-[13px]">
                    {waiting.incident.title} ·{" "}
                    {formatKm(waiting.assignment.distanceKm)}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0" />
              </button>
            )}

            <OfficerCard
              className="p-4 sm:p-5 md:p-4"
              aria-labelledby="response-title"
            >
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={incident.priority} size="md" />
                <OfficerStageChip stage={assignment.stage} size="md" />
                {assignment.role === "backup" && (
                  <ToneChip tone="neutral" variant="outline" size="md">
                    Backup unit
                  </ToneChip>
                )}
              </div>
              <h1
                id="response-title"
                className="mt-3 flex items-start gap-2.5 text-2xl leading-tight font-semibold tracking-tight"
              >
                <CategoryIcon
                  categoryId={incident.categoryId}
                  className="mt-1.5 size-5 text-muted-foreground"
                />
                {incident.title}
              </h1>
              <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  {area}
                  {landmark && ` · near ${landmark}`}
                </span>
              </p>
              <p className="tnum mt-1 truncate font-mono text-xs text-muted-foreground">
                {incident.id}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-border/70 pt-3 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-3">
                {arrived ? (
                  <Metric label="On scene for">
                    <ResponseTimer
                      since={incident.arrivedAt ?? incident.createdAt}
                      label="Time on scene"
                      className="text-xl font-semibold"
                    />
                  </Metric>
                ) : (
                  <>
                    <Metric label={t("officer.distance")}>
                      {formatKm(km)}
                    </Metric>
                    <Metric label={t("officer.eta")}>
                      <EtaCountdown at={incident.etaAt} />
                    </Metric>
                  </>
                )}
                <Metric label={t("officer.elapsed")}>
                  <ResponseTimer
                    since={incident.createdAt}
                    priority={incident.priority}
                    className="text-xl font-semibold"
                  />
                </Metric>
              </dl>
            </OfficerCard>

            <StageTracker
              incident={incident}
              assignment={assignment}
              unit={unit}
            />

            {!isMd && map}

            <OfficerCard className="p-4" aria-labelledby="actions-title">
              <h2 id="actions-title" className="sr-only">
                Actions
              </h2>
              {isMd && <div className="mb-3">{primary}</div>}
              {!mayUpdate && (
                <p className="mb-3 text-[13px] text-muted-foreground">
                  Your role does not include updating unit status.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2.5 [&>*:last-child:nth-child(odd)]:col-span-2">
                {!arrived && (
                  <ActionTile
                    icon={Navigation}
                    label={t("officer.navigate")}
                    hint={`${formatKm(km)} to go`}
                    onClick={() => setOverlay("navigate")}
                  />
                )}
                <ActionTile
                  icon={MessageCircle}
                  label={t("officer.contact")}
                  hint={
                    incident.silent ? (
                      "Chat only"
                    ) : live ? (
                      "Session live"
                    ) : lastFromCitizen ? (
                      <>
                        Citizen wrote <RelativeTime at={lastFromCitizen.at} />
                      </>
                    ) : (
                      "No messages yet"
                    )
                  }
                  onClick={() => setOverlay("contact")}
                />
                <ActionTile
                  icon={Headset}
                  label={t("officer.controlRoom")}
                  hint={incident.operatorName ?? "Internal thread"}
                  onClick={() => setOverlay("control")}
                />
                {backupRequested ? (
                  <div
                    role="status"
                    className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-high/35 bg-high-soft px-2 py-3 text-center text-sm leading-tight font-medium text-high-fg"
                  >
                    <ShieldPlus aria-hidden className="mb-0.5 size-5" />
                    {t("officer.backupRequested")}
                    <span className="text-xs font-normal">
                      Control room alerted
                    </span>
                  </div>
                ) : (
                  !controlled && (
                    <ActionTile
                      icon={ShieldPlus}
                      label={t("officer.requestBackup")}
                      hint="Alerts the control room"
                      onClick={() => setOverlay("backup")}
                    />
                  )
                )}
              </div>
            </OfficerCard>

            <UpdateIncident incident={incident} unit={unit} arrived={arrived}>
              {arrived && !controlled && mayUpdate && (
                <>
                  <Button
                    variant="outline"
                    size="xl"
                    className="w-full"
                    onClick={() => setOverlay("complete")}
                  >
                    <CircleCheckBig aria-hidden />
                    {t("officer.completeResponse")}
                  </Button>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Use this to close directly when nothing needs controlling,
                    for example a confirmed false alarm.
                  </p>
                </>
              )}
            </UpdateIncident>
          </>
        }
        right={
          <>
            {isMd && map}
            <CitizenCommsCard incident={incident} />
            <IncidentIntel
              incident={incident}
              omit={["comms"]}
              className="2xl:grid-cols-2"
            />
          </>
        }
        bar={
          isMd ? undefined : (
            <StickyActionBar label="Next step">{primary}</StickyActionBar>
          )
        }
      />

      <NavigationDialog
        open={overlay === "navigate" && !arrived}
        onOpenChange={overlayToggle("navigate")}
        incident={incident}
        unit={unit}
        onArrived={mayUpdate ? markArrived : undefined}
        arriving={arrive.pending}
      />
      <ContactSheet
        open={overlay === "contact"}
        onOpenChange={overlayToggle("contact")}
        incident={incident}
        onStartSession={(type) => {
          setOverlay(null);
          setSession(type);
        }}
      />
      <ControlRoomSheet
        open={overlay === "control"}
        onOpenChange={overlayToggle("control")}
        incident={incident}
      />
      <BackupDialog
        open={overlay === "backup"}
        onOpenChange={overlayToggle("backup")}
        incident={incident}
        unit={unit}
      />
      <CompleteDialog
        open={overlay === "complete"}
        onOpenChange={overlayToggle("complete")}
        incident={incident}
        unitId={unit.id}
        onCompleted={onCompleted}
      />
      <SessionDialog
        incident={incident}
        type={session}
        onClose={() => setSession(null)}
      />
    </>
  );
}
