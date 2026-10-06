"use client";

import {
  Archive,
  ArrowRightLeft,
  ArrowUpRight,
  CircleCheckBig,
  Clock,
  Copy,
  FileSearch,
  Headset,
  MapPin,
  Navigation,
  PhoneCall,
  ShieldPlus,
  Tag,
  TriangleAlert,
  User,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/shared/category-icon";
import { BlankState } from "@/components/shared/states";
import {
  PriorityBadge,
  SensitiveBadge,
  StatusChip,
  ToneChip,
} from "@/components/shared/status-chips";
import { Timeline } from "@/components/shared/timeline";
import {
  ClockStamp,
  RelativeTime,
  ResponseTimer,
} from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ESCALATION_LEVEL_LABEL, SOURCE_LABEL } from "@/config/incident";
import {
  AssignUnitDialog,
  DispatchUnitDialog,
} from "@/features/dispatch/assign-unit-dialog";
import { useAction } from "@/hooks/use-action";
import { useCategoryLookup, useIncident } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { formatCoords, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { Incident, SessionType } from "@/types";
import { ActionButton } from "./action-button";
import {
  CloseIncidentDialog,
  EscalateIncidentDialog,
  RequestBackupDialog,
  ResolveIncidentDialog,
  SessionDialog,
  TransferIncidentDialog,
} from "./incident-dialogs";
import {
  actionReasons,
  frozenAt,
  isActive,
  liveAssignments,
} from "./incident-rules";
import { OverviewTab } from "./inspector-overview";
import {
  AuditTab,
  CommunicationTab,
  EvidenceTab,
  NotesTab,
  RespondersTab,
} from "./inspector-tabs";

export type InspectorTab =
  | "overview"
  | "timeline"
  | "communication"
  | "evidence"
  | "responders"
  | "notes"
  | "audit";

const TABS: { value: InspectorTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "timeline", label: "Timeline" },
  { value: "communication", label: "Communication" },
  { value: "evidence", label: "Evidence" },
  { value: "responders", label: "Responders" },
  { value: "notes", label: "Notes" },
  { value: "audit", label: "Audit" },
];

type DialogKey =
  | "assign"
  | "dispatch"
  | "backup"
  | "escalate"
  | "transfer"
  | "resolve"
  | "close";

const PANE = "min-h-56";

function closedSummary(incident: Incident): string {
  if (incident.status === "resolved")
    return `Resolved at ${formatTime(incident.resolvedAt ?? incident.createdAt)}. Response actions are closed. Close the incident once the response report has been reviewed.`;
  if (incident.status === "closed")
    return "Closed after review. This incident is now read-only.";
  return "Cancelled by the citizen. This incident is read-only.";
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <dt className="mt-0.5 shrink-0 text-subtle">
        <Icon aria-hidden className="size-3.5" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 flex-1 text-[13px] leading-snug">{children}</dd>
    </div>
  );
}

function InspectorBody({
  incident,
  onClose,
  className,
}: {
  incident: Incident;
  onClose?: () => void;
  className?: string;
}) {
  const { actor, can } = useSession();
  const pathname = usePathname();
  const lookup = useCategoryLookup();
  const [tab, setTab] = useState<InspectorTab>("overview");
  const rootRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<DialogKey | null>(null);
  const [sessionType, setSessionType] = useState<SessionType | null>(null);
  const [resolveNote, setResolveNote] = useState<string | undefined>();
  const acknowledge = useAction(services.incidents.acknowledge, {
    success: "Incident acknowledged",
  });

  const reasons = useMemo(() => actionReasons(incident, can), [incident, can]);
  const active = isActive(incident);
  const until = frozenAt(incident);
  const live = liveAssignments(incident);
  const category = lookup(incident.categoryId);
  const counts: Partial<Record<InspectorTab, number>> = {
    evidence: incident.evidenceIds.length,
    responders: live.length,
    notes: incident.notes.length,
  };

  /**
   * The whole inspector is one scroll area with the tab strip pinned. Switching tabs returns the
   * reader to the top of the new content; the conversation fills the panel, so it is brought fully
   * into view.
   */
  const changeTab = (next: InspectorTab) => {
    setTab(next);
    requestAnimationFrame(() => {
      const root = rootRef.current;
      const tabs = tabsRef.current;
      if (!root || !tabs) return;
      const top = tabs.offsetTop;
      if (next === "communication" || root.scrollTop > top)
        root.scrollTo({ top });
    });
  };

  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };
  const openResolve = (note?: string) => {
    setResolveNote(note);
    setDialog("resolve");
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(incident.id);
      toast.success("Incident ID copied");
    } catch {
      toast.error("Copy is not available in this browser.");
    }
  };

  return (
    <section
      ref={rootRef}
      aria-label={`Incident ${incident.id}`}
      // A size container: children respond to the panel's width, and the conversation tab can be
      // exactly as tall as the panel (`cqh`).
      className={cn(
        "scroll-thin relative h-full min-h-0 flex-1 overflow-y-auto bg-card [container-type:size]",
        className,
      )}
    >
      <header className="border-b border-border/70 px-4 pt-3 pb-3.5">
        <div className="flex items-center gap-1">
          <h2 className="tnum min-w-0 truncate font-mono text-[13px] font-medium">
            {incident.id}
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={copyId}
                aria-label="Copy incident ID"
                className="text-muted-foreground"
              >
                <Copy aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy incident ID</TooltipContent>
          </Tooltip>
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            {pathname !== "/control/incidents" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" asChild>
                    <Link
                      href={`/control/incidents?id=${incident.id}`}
                      aria-label="Open in the incident queue"
                    >
                      <ArrowUpRight aria-hidden />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open in the incident queue</TooltipContent>
              </Tooltip>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close incident details"
              >
                <X aria-hidden />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-start gap-2 text-lg leading-tight font-semibold tracking-tight">
              <CategoryIcon
                categoryId={incident.categoryId}
                className="mt-0.5 size-5 text-muted-foreground"
              />
              <span className="min-w-0 break-words">{incident.title}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={incident.priority} />
              <StatusChip status={incident.status} />
              {incident.escalationLevel > 0 && (
                <ToneChip tone="high" variant="outline">
                  <TriangleAlert aria-hidden className="size-3" />
                  Escalated ·{" "}
                  {
                    ESCALATION_LEVEL_LABEL[
                      incident.escalationLevel as 1 | 2 | 3
                    ]
                  }
                </ToneChip>
              )}
            </div>
          </div>
          <div
            className={cn(
              "shrink-0 rounded-lg border px-2.5 py-1.5 text-right",
              active && incident.priority === "P1"
                ? "border-critical/35 bg-critical-soft"
                : active && incident.priority === "P2"
                  ? "border-high/35 bg-high-soft"
                  : "border-border/70 bg-inset",
            )}
          >
            <ResponseTimer
              since={incident.createdAt}
              until={until}
              priority={incident.priority}
              size="lg"
              className="block leading-none"
              label={
                until
                  ? "Total time from creation to the end of the response"
                  : "Elapsed since the incident was created"
              }
            />
            <p className="mt-1 text-[11px] leading-none text-muted-foreground">
              {until ? "Total response time" : "Since created"}
            </p>
          </div>
        </div>

        <dl className="mt-3 space-y-1.5">
          <MetaRow icon={Tag} label="Category and source">
            {category?.label ?? incident.title}
            <span className="text-muted-foreground">
              {" "}
              · {SOURCE_LABEL[incident.source]}
            </span>
          </MetaRow>
          <MetaRow icon={MapPin} label="Location">
            {incident.location.address}
            <span className="tnum mt-0.5 block font-mono text-xs text-muted-foreground">
              {formatCoords(incident.location)}
            </span>
          </MetaRow>
          <MetaRow icon={User} label="Citizen">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{incident.reporterName}</span>
              {incident.anonymous ? (
                <ToneChip tone="neutral" variant="outline">
                  Anonymous
                </ToneChip>
              ) : (
                <span className="tnum font-mono text-xs text-muted-foreground">
                  {incident.reporterPhoneMasked ?? "No phone on record"}
                </span>
              )}
              <SensitiveBadge />
            </span>
          </MetaRow>
          <MetaRow icon={Clock} label="Created">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span>Created</span>
              <ClockStamp at={incident.createdAt} />
              <RelativeTime
                at={incident.createdAt}
                className="text-xs text-muted-foreground"
              />
            </span>
          </MetaRow>
        </dl>
      </header>

      <div
        role="group"
        aria-label="Incident actions"
        className="border-b border-border/70 px-4 py-3"
      >
        {active ? (
          // Columns size to their longest label, so nothing truncates in a narrow panel.
          <div className="grid grid-cols-2 gap-1.5 @[27rem]:grid-cols-[repeat(3,auto)] @[38rem]:grid-cols-[repeat(4,auto)] [&_button]:px-2 [&_button]:text-[13px]">
            {incident.status === "new" && (
              <ActionButton
                icon={Headset}
                label="Acknowledge"
                variant="default"
                reason={reasons.acknowledge}
                pending={acknowledge.pending}
                onClick={() => acknowledge.run(incident.id, actor)}
              />
            )}
            <ActionButton
              icon={PhoneCall}
              label="Call citizen"
              reason={reasons.call}
              onClick={() => setSessionType("voice")}
            />
            <ActionButton
              icon={Video}
              label="Video connect"
              reason={reasons.video}
              onClick={() => setSessionType("video")}
            />
            <ActionButton
              icon={UserPlus}
              label="Assign unit"
              reason={reasons.assign}
              onClick={() => setDialog("assign")}
            />
            <ActionButton
              icon={Navigation}
              label="Dispatch"
              variant={
                incident.status === "acknowledged" && live.length === 0
                  ? "default"
                  : "outline"
              }
              reason={reasons.dispatch}
              onClick={() => setDialog("dispatch")}
            />
            <ActionButton
              icon={ShieldPlus}
              label="Request backup"
              reason={reasons.backup}
              onClick={() => setDialog("backup")}
            />
            <ActionButton
              icon={TriangleAlert}
              label="Escalate"
              reason={reasons.escalate}
              onClick={() => setDialog("escalate")}
            />
            <ActionButton
              icon={ArrowRightLeft}
              label="Transfer"
              reason={reasons.transfer}
              onClick={() => setDialog("transfer")}
            />
            <ActionButton
              icon={CircleCheckBig}
              label="Resolve"
              variant={incident.status === "on_scene" ? "success" : "outline"}
              reason={reasons.resolve}
              onClick={() => openResolve()}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="min-w-0 flex-1 basis-56 text-[13px] leading-snug text-muted-foreground">
              {closedSummary(incident)}
            </p>
            {incident.status === "resolved" && (
              <ActionButton
                icon={Archive}
                label="Close incident"
                variant="default"
                reason={reasons.close}
                onClick={() => setDialog("close")}
              />
            )}
          </div>
        )}
      </div>

      <div ref={tabsRef}>
        <Tabs
          value={tab}
          onValueChange={(value) => changeTab(value as InspectorTab)}
          className="gap-0"
        >
          <div className="sticky top-0 z-10 border-b border-border/70 bg-card">
            {/* The strip scrolls sideways in a narrow panel; the fade on the right says so. */}
            <div className="no-scrollbar overflow-x-auto px-2 pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]">
              <TabsList variant="line" className="w-max pr-8">
                {TABS.map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="flex-none px-2"
                  >
                    {label}
                    {counts[value] ? (
                      <span className="tnum rounded-full bg-muted px-1.5 text-[11px] leading-4 text-muted-foreground">
                        {counts[value]}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview" className={PANE}>
            <OverviewTab
              incident={incident}
              resolveReason={reasons.resolve}
              onUseAsResolution={openResolve}
              onOpenCommunication={() => changeTab("communication")}
            />
          </TabsContent>
          <TabsContent value="timeline" className={PANE}>
            <div className="p-4">
              <Timeline events={incident.timeline} />
            </div>
          </TabsContent>
          <TabsContent
            value="communication"
            // `flex-none` so the height below wins over the primitive's `flex-1`.
            className="flex h-[calc(100cqh-2.5rem)] min-h-80 flex-none flex-col"
          >
            <CommunicationTab
              incident={incident}
              callReason={reasons.call}
              videoReason={reasons.video}
              onStartSession={setSessionType}
            />
          </TabsContent>
          <TabsContent value="evidence" className={PANE}>
            <EvidenceTab incident={incident} />
          </TabsContent>
          <TabsContent value="responders" className={PANE}>
            <RespondersTab
              incident={incident}
              assignReason={reasons.assign}
              onAssign={() => setDialog("assign")}
            />
          </TabsContent>
          <TabsContent value="notes" className={PANE}>
            <NotesTab incident={incident} />
          </TabsContent>
          <TabsContent value="audit" className={PANE}>
            <AuditTab incident={incident} />
          </TabsContent>
        </Tabs>
      </div>

      <AssignUnitDialog
        incidentId={incident.id}
        open={dialog === "assign"}
        onOpenChange={closeDialog}
      />
      <DispatchUnitDialog
        incidentId={incident.id}
        open={dialog === "dispatch"}
        onOpenChange={closeDialog}
        onChooseOther={() => setDialog("assign")}
      />
      <RequestBackupDialog
        incidentId={incident.id}
        open={dialog === "backup"}
        onOpenChange={closeDialog}
      />
      <EscalateIncidentDialog
        incidentId={incident.id}
        open={dialog === "escalate"}
        onOpenChange={closeDialog}
      />
      <TransferIncidentDialog
        incidentId={incident.id}
        open={dialog === "transfer"}
        onOpenChange={closeDialog}
      />
      <ResolveIncidentDialog
        incidentId={incident.id}
        open={dialog === "resolve"}
        onOpenChange={closeDialog}
        initialNote={resolveNote}
      />
      <CloseIncidentDialog
        incidentId={incident.id}
        open={dialog === "close"}
        onOpenChange={closeDialog}
      />
      <SessionDialog
        incident={incident}
        type={sessionType}
        onClose={() => setSessionType(null)}
        onEscalate={reasons.escalate ? undefined : () => setDialog("escalate")}
      />
    </section>
  );
}

/**
 * Everything the control room knows and can do about one incident: header, actions and the seven
 * record tabs. Fills its parent's height, so place it in a side panel or a sheet.
 *
 * It reads live from the store, so the same incident open in two places stays in step, and each
 * action explains itself when it is unavailable instead of disappearing.
 */
export function IncidentInspector({
  incidentId,
  onClose,
  className,
}: {
  incidentId: string | null | undefined;
  onClose?: () => void;
  className?: string;
}) {
  const incident = useIncident(incidentId);

  if (!incident || incident.sync !== "synced") {
    return (
      <section
        aria-label="Incident details"
        className={cn(
          "relative flex h-full min-h-0 flex-col bg-card",
          className,
        )}
      >
        {onClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close incident details"
            className="absolute top-3 right-3"
          >
            <X aria-hidden />
          </Button>
        )}
        <BlankState
          className="flex-1"
          icon={FileSearch}
          title={incidentId ? "Incident not found" : "No incident selected"}
          description={
            incidentId
              ? "It is not in the current demo data. It may have gone when the demo was reset."
              : "Choose an incident from the queue or the map to see its details and act on it."
          }
        />
      </section>
    );
  }

  // Keyed so tabs and open dialogs start fresh when another incident is selected.
  return (
    <InspectorBody
      key={incident.id}
      incident={incident}
      onClose={onClose}
      className={className}
    />
  );
}
