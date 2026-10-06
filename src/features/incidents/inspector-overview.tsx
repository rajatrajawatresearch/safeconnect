"use client";

import {
  CircleCheckBig,
  EyeOff,
  ShieldPlus,
  TriangleAlert,
  Users,
} from "lucide-react";
import { ToneChip } from "@/components/shared/status-chips";
import { ClockStamp, EtaCountdown } from "@/components/shared/timers";
import { ESCALATION_LEVEL_LABEL } from "@/config/incident";
import { formatDuration } from "@/lib/format";
import type { Incident } from "@/types";
import { AssistantPanel } from "./assistant-panel";
import { HandoffChain } from "./handoff-chain";
import {
  LOCATION_SOURCE_LABEL,
  chatBlockedReason,
  stationName,
} from "./incident-rules";
import { TriageCard } from "./triage-card";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium text-muted-foreground">{children}</h3>
  );
}

function TimeField({
  label,
  at,
  since,
  pending = "—",
}: {
  label: string;
  at: number | undefined;
  /** Incident creation, to show how long each step took. */
  since: number;
  pending?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
        {at ? (
          <>
            <ClockStamp at={at} className="text-sm text-foreground" />
            {at > since && (
              <span className="tnum font-mono text-xs text-muted-foreground">
                +{formatDuration((at - since) / 1000)}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-subtle">{pending}</span>
        )}
      </dd>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-3 gap-y-0.5 @sm:grid-cols-[8.5rem_1fr]">
      <dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm leading-5 break-words">{children}</dd>
    </div>
  );
}

export function OverviewTab({
  incident,
  resolveReason,
  onUseAsResolution,
  onOpenCommunication,
}: {
  incident: Incident;
  resolveReason: string | null;
  onUseAsResolution: (note: string) => void;
  onOpenCommunication: () => void;
}) {
  const finished = Boolean(incident.resolvedAt);
  const { location } = incident;

  const triage = <TriageCard incident={incident} />;

  return (
    <div className="space-y-4 p-4">
      <section>
        <SectionTitle>Description</SectionTitle>
        <p className="mt-1 text-sm leading-relaxed">{incident.description}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {incident.peopleInDanger === true ? (
            <ToneChip tone="critical">
              <TriangleAlert aria-hidden className="size-3" />
              People reported in danger
            </ToneChip>
          ) : incident.peopleInDanger === false ? (
            <ToneChip tone="neutral">
              <Users aria-hidden className="size-3" />
              No one reported in danger
            </ToneChip>
          ) : (
            <ToneChip tone="neutral" variant="outline">
              <Users aria-hidden className="size-3" />
              Danger to people not stated
            </ToneChip>
          )}
          {incident.silent && (
            <ToneChip tone="high">
              <EyeOff aria-hidden className="size-3" />
              Silent SOS, chat only
            </ToneChip>
          )}
          {incident.backupRequested && (
            <ToneChip tone="high" variant="outline">
              <ShieldPlus aria-hidden className="size-3" />
              Backup requested
            </ToneChip>
          )}
        </div>
      </section>

      {(incident.resolution || incident.cancelReason) && (
        <section className="rounded-xl border border-border/70 bg-inset px-3.5 py-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <CircleCheckBig
              aria-hidden
              className="size-4 text-muted-foreground"
            />
            {incident.resolution ? "Resolution" : "Cancelled by the citizen"}
          </h3>
          <p className="mt-1 text-sm leading-relaxed">
            {incident.resolution ?? incident.cancelReason}
          </p>
        </section>
      )}

      {finished && <HandoffChain incident={incident} />}
      {!finished && triage}

      <section>
        <SectionTitle>Key times</SectionTitle>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 @md:grid-cols-3">
          <TimeField
            label="Created"
            at={incident.createdAt}
            since={incident.createdAt}
          />
          <TimeField
            label="Acknowledged"
            at={incident.acknowledgedAt}
            since={incident.createdAt}
            pending="Waiting"
          />
          <TimeField
            label="Unit assigned"
            at={incident.assignedAt}
            since={incident.createdAt}
          />
          <TimeField
            label="En route"
            at={incident.enRouteAt}
            since={incident.createdAt}
          />
          <TimeField
            label="Arrived"
            at={incident.arrivedAt}
            since={incident.createdAt}
          />
          <TimeField
            label="Resolved"
            at={incident.resolvedAt}
            since={incident.createdAt}
          />
          {incident.status === "en_route" && (
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">
                Expected arrival in
              </dt>
              <dd className="mt-0.5">
                <EtaCountdown
                  at={incident.etaAt}
                  className="text-sm font-medium"
                />
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section>
        <SectionTitle>Handling</SectionTitle>
        <dl className="mt-2 space-y-2">
          <DetailRow label="Station">
            {stationName(location.stationId)}
          </DetailRow>
          <DetailRow label="Operator">
            {incident.operatorName ?? (
              <span className="text-muted-foreground">
                Not yet acknowledged
              </span>
            )}
          </DetailRow>
          <DetailRow label="Escalation">
            {incident.escalationLevel > 0 ? (
              ESCALATION_LEVEL_LABEL[incident.escalationLevel as 1 | 2 | 3]
            ) : (
              <span className="text-muted-foreground">Not escalated</span>
            )}
          </DetailRow>
          <DetailRow label="Location source">
            {LOCATION_SOURCE_LABEL[location.source]}
            {location.accuracyM && (
              <span className="tnum text-muted-foreground">
                {" "}
                · accurate to about {location.accuracyM} m
              </span>
            )}
          </DetailRow>
          {location.landmark && (
            <DetailRow label="Landmark">{location.landmark}</DetailRow>
          )}
        </dl>
      </section>

      {finished && triage}

      <AssistantPanel
        incident={incident}
        resolveReason={resolveReason}
        onUseAsResolution={onUseAsResolution}
        onAskCitizen={
          chatBlockedReason(incident) ? undefined : onOpenCommunication
        }
      />
    </div>
  );
}
