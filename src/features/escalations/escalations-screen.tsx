"use client";

import {
  ArrowRight,
  Check,
  CheckCheck,
  Lock,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/shared/page";
import { BlankState, EmptyState } from "@/components/shared/states";
import { PriorityBadge, ToneChip } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { ESCALATION_LEVEL_LABEL, PRIORITIES } from "@/config/incident";
import { Segmented } from "@/features/evidence/filters";
import { IncidentLink } from "@/features/evidence/incident-link";
import { useAction } from "@/hooks/use-action";
import { useIncidents } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { formatDateTime, formatSeconds } from "@/lib/format";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type { Escalation, EscalationRule, Incident } from "@/types";
import {
  ACTION_PHRASE,
  ESCALATION_STATUS_META,
  LEVEL_TONE,
  TRIGGER_SHORT,
  ruleSentence,
} from "./escalation-meta";

type StatusFilter = Escalation["status"];

function EscalationCard({
  escalation,
  incident,
  rule,
  canAct,
}: {
  escalation: Escalation;
  incident: Incident | undefined;
  /** `null` when the escalation names a rule that no longer exists. */
  rule: EscalationRule | null | undefined;
  canAct: boolean;
}) {
  const { actor } = useSession();
  const acknowledge = useAction(services.incidents.setEscalationStatus, {
    success: "Escalation acknowledged",
  });
  const resolve = useAction(services.incidents.setEscalationStatus, {
    success: "Escalation resolved",
  });
  const status = ESCALATION_STATUS_META[escalation.status];
  const busy = acknowledge.pending || resolve.pending;

  return (
    <Panel as="article" aria-label={`Escalation on ${escalation.incidentId}`}>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3.5">
        <ToneChip tone={LEVEL_TONE[escalation.level]} variant="outline">
          <span className="tnum opacity-80">Level {escalation.level}</span>
          {ESCALATION_LEVEL_LABEL[escalation.level]}
        </ToneChip>
        <ToneChip tone={status.tone} dot>
          {status.label}
        </ToneChip>
        <p className="ml-auto text-xs text-muted-foreground">
          Raised <RelativeTime at={escalation.raisedAt} friendly />
        </p>
      </div>

      <div className="grid gap-4 px-4 py-3.5 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="min-w-0">
          {incident ? (
            <IncidentLink incident={incident} showTimer />
          ) : (
            <p className="rounded-xl border border-border bg-inset p-3 text-sm text-muted-foreground">
              Incident{" "}
              <Link
                href={`/control/incidents?id=${escalation.incidentId}`}
                className="tnum rounded font-mono text-primary hover:underline"
              >
                {escalation.incidentId}
              </Link>{" "}
              is not in the current view.
            </p>
          )}
        </div>
        <dl className="min-w-0 space-y-2.5">
          <div>
            <dt className="text-xs text-muted-foreground">Reason</dt>
            <dd className="mt-0.5 text-sm leading-relaxed font-medium break-words">
              {escalation.reason}
            </dd>
          </div>
          {escalation.ruleId && (
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Workflow aria-hidden className="size-3.5" /> Raised by policy
                rule
              </dt>
              <dd className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                {rule ? (
                  <>
                    {ruleSentence(rule)}
                    {!rule.enabled && " This rule is now switched off."}
                  </>
                ) : (
                  "The rule that raised this has since been removed from the policy."
                )}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Raised by</dt>
            <dd className="mt-0.5 text-[13px]">
              <span className="font-medium">{escalation.raisedBy}</span>
              <span className="tnum text-muted-foreground">
                {" "}
                · {formatDateTime(escalation.raisedAt)}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-border/70 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {escalation.status === "open" &&
            `Waiting on the ${ESCALATION_LEVEL_LABEL[escalation.level].toLowerCase()}.`}
          {escalation.status === "acknowledged" &&
            `Acknowledged by ${escalation.acknowledgedBy ?? "staff"}. Resolve it once the incident is under control.`}
          {escalation.status === "resolved" &&
            (escalation.acknowledgedBy
              ? `Handled by ${escalation.acknowledgedBy}.`
              : "Closed with the incident.")}
        </p>
        {escalation.status !== "resolved" && (
          <div className="flex flex-wrap gap-2">
            {escalation.status === "open" && (
              <Button
                variant="outline"
                size="lg"
                disabled={!canAct || busy}
                onClick={() =>
                  acknowledge.run(escalation.id, "acknowledged", actor)
                }
              >
                <Check aria-hidden /> Acknowledge
              </Button>
            )}
            <Button
              size="lg"
              disabled={!canAct || busy}
              onClick={() => resolve.run(escalation.id, "resolved", actor)}
            >
              <CheckCheck aria-hidden /> Resolve
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}

function PolicySummary({
  rules,
  openByRule,
}: {
  rules: EscalationRule[];
  openByRule: Map<string, number>;
}) {
  const active = rules.filter((r) => r.enabled);
  const off = rules.length - active.length;
  return (
    <Panel
      as="aside"
      aria-label="Active escalation policy"
      className="overflow-hidden"
    >
      <PanelHeader
        title="Active escalation policy"
        description={`${active.length} ${active.length === 1 ? "rule" : "rules"} in force · read-only`}
      />
      {active.length === 0 ? (
        <BlankState
          compact
          icon={Workflow}
          title="No rule is switched on"
          description="Incidents are escalated only by hand until a rule is enabled."
        />
      ) : (
        <div className="divide-y divide-border/70">
          {PRIORITIES.map((priority) => {
            const group = active
              .filter((r) => r.priority === priority)
              .sort((a, b) => a.thresholdSec - b.thresholdSec);
            if (group.length === 0) return null;
            return (
              <section key={priority} className="px-4 py-3">
                <h3 className="flex items-center gap-2 text-xs text-muted-foreground">
                  <PriorityBadge priority={priority} variant="outline" />
                  incident
                </h3>
                <ul className="mt-2 space-y-2">
                  {group.map((rule) => {
                    const open = openByRule.get(rule.id) ?? 0;
                    return (
                      <li key={rule.id} className="text-[13px] leading-snug">
                        <span className="font-medium">
                          {TRIGGER_SHORT[rule.trigger]} within{" "}
                          <span className="tnum">
                            {formatSeconds(rule.thresholdSec)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-start gap-1.5 text-muted-foreground">
                          <ArrowRight
                            aria-hidden
                            className="mt-0.5 size-3.5 shrink-0"
                          />
                          <span>
                            {ACTION_PHRASE[rule.action]}
                            {open > 0 && (
                              <span className="tnum ml-1.5 text-high-fg">
                                · {open} open now
                              </span>
                            )}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <div className="space-y-1.5 border-t border-border/70 bg-inset px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">
          These are demonstration policies, not official police rules.
        </p>
        <p>
          {off > 0 &&
            `${off} more ${off === 1 ? "rule is" : "rules are"} switched off. `}
          Rules are changed by an administrator; every change is written to the
          audit log.
        </p>
      </div>
    </Panel>
  );
}

export function EscalationsScreen() {
  const { can } = useSession();
  const escalations = useDemoStore((s) => s.escalations);
  const rules = useDemoStore((s) => s.escalationRules);
  const incidents = useIncidents();
  const [filter, setFilter] = useState<StatusFilter>("open");
  const canAct = can("incident.escalate");

  const incidentById = useMemo(
    () => new Map(incidents.map((i) => [i.id, i])),
    [incidents],
  );
  const ruleById = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules]);

  const counts = useMemo(
    () => ({
      open: escalations.filter((e) => e.status === "open").length,
      acknowledged: escalations.filter((e) => e.status === "acknowledged")
        .length,
      resolved: escalations.filter((e) => e.status === "resolved").length,
    }),
    [escalations],
  );

  const openByRule = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of escalations)
      if (e.ruleId && e.status !== "resolved")
        map.set(e.ruleId, (map.get(e.ruleId) ?? 0) + 1);
    return map;
  }, [escalations]);

  // Highest level first, then the most recent.
  const rows = useMemo(
    () =>
      escalations
        .filter((e) => e.status === filter)
        .sort((a, b) => b.level - a.level || b.raisedAt - a.raisedAt),
    [escalations, filter],
  );

  return (
    <PageContainer width="full">
      <PageHeader
        title="Escalations"
        description="Incidents raised to a station supervisor, district command or state command, by an operator or by the escalation policy."
        actions={
          <Segmented
            label="Status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "open", label: "Open", count: counts.open },
              {
                value: "acknowledged",
                label: "Acknowledged",
                count: counts.acknowledged,
              },
              { value: "resolved", label: "Resolved", count: counts.resolved },
            ]}
          />
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="@container min-w-0 space-y-3">
          {!canAct && (
            <p className="flex items-start gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Your role can read escalations but cannot acknowledge or resolve
              them.
            </p>
          )}
          {rows.length === 0 ? (
            <Panel>
              {filter === "open" ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="No open escalations"
                  description="Nothing is waiting on a supervisor or on command right now."
                  action={
                    counts.acknowledged > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setFilter("acknowledged")}
                      >
                        View {counts.acknowledged} acknowledged
                      </Button>
                    )
                  }
                />
              ) : (
                <BlankState
                  icon={Workflow}
                  title={
                    filter === "acknowledged"
                      ? "No acknowledged escalations"
                      : "No resolved escalations"
                  }
                  description={
                    filter === "acknowledged"
                      ? "Escalations someone has picked up but not yet resolved are listed here."
                      : "Escalations are listed here once they are resolved or their incident is."
                  }
                />
              )}
            </Panel>
          ) : (
            <ul className="space-y-3">
              {rows.map((escalation) => (
                <li key={escalation.id}>
                  <EscalationCard
                    escalation={escalation}
                    incident={incidentById.get(escalation.incidentId)}
                    rule={
                      escalation.ruleId
                        ? (ruleById.get(escalation.ruleId) ?? null)
                        : undefined
                    }
                    canAct={canAct}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <PolicySummary rules={rules} openByRule={openByRule} />
      </div>
    </PageContainer>
  );
}
