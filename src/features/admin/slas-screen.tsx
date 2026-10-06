"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  FlaskConical,
  Pause,
  Pencil,
  Plus,
  Trash2,
  WifiOff,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/shared/page";
import { BlankState } from "@/components/shared/states";
import { PriorityBadge, ToneChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ESCALATION_LEVEL_LABEL,
  PRIORITIES,
  PRIORITY_META,
} from "@/config/incident";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { formatSeconds } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import type { EscalationRule, IncidentPriority, SlaPolicy } from "@/types";
import { ACTION_META, plural } from "./admin-meta";
import { ConfirmDialog, Notice, Spinner, useKeyedAction } from "./admin-ui";
import {
  EscalationRuleDialog,
  RuleSentence,
  ruleSentence,
} from "./escalation-rule-dialog";

/* ───────────────────────── Response targets ───────────────────────── */

const whole = (max: number, maxLabel: string) =>
  z
    .number({ error: "Enter a whole number." })
    .int("Enter a whole number.")
    .min(1, "Must be at least 1.")
    .max(max, `Must be ${maxLabel} or less.`);

const slaSchema = z
  .object({
    acknowledgeSec: whole(3_600, "3,600 sec (1 hour)"),
    dispatchSec: whole(86_400, "86,400 sec (24 hours)"),
    arrivalMin: whole(1_440, "1,440 min (24 hours)"),
    resolutionMin: whole(43_200, "43,200 min (30 days)"),
  })
  .superRefine((value, ctx) => {
    if (value.dispatchSec < value.acknowledgeSec)
      ctx.addIssue({
        code: "custom",
        path: ["dispatchSec"],
        message: "Dispatch cannot be sooner than acknowledgement.",
      });
    if (value.arrivalMin * 60 < value.dispatchSec)
      ctx.addIssue({
        code: "custom",
        path: ["arrivalMin"],
        message: "Arrival cannot be sooner than dispatch.",
      });
    if (value.resolutionMin < value.arrivalMin)
      ctx.addIssue({
        code: "custom",
        path: ["resolutionMin"],
        message: "Resolution cannot be sooner than arrival.",
      });
  });

type SlaValues = z.infer<typeof slaSchema>;

const SLA_FIELDS: {
  name: keyof SlaValues;
  label: string;
  unit: "sec" | "min";
}[] = [
  { name: "acknowledgeSec", label: "Acknowledgement", unit: "sec" },
  { name: "dispatchSec", label: "Dispatch", unit: "sec" },
  { name: "arrivalMin", label: "Arrival", unit: "min" },
  { name: "resolutionMin", label: "Resolution", unit: "min" },
];

/** "10 min" under 600 sec, "2 h" under 120 min — only when it says more than the number itself. */
function plainDuration(value: unknown, unit: "sec" | "min"): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 60)
    return null;
  if (unit === "sec") return formatSeconds(value);
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

function SlaRow({ policy }: { policy: SlaPolicy }) {
  const { actor } = useSession();
  const { acknowledgeSec, dispatchSec, arrivalMin, resolutionMin } = policy;
  const values = useMemo<SlaValues>(
    () => ({ acknowledgeSec, dispatchSec, arrivalMin, resolutionMin }),
    [acknowledgeSec, dispatchSec, arrivalMin, resolutionMin],
  );
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SlaValues>({
    resolver: zodResolver(slaSchema),
    values,
    mode: "onBlur",
  });
  const draft = useWatch({ control });

  const save = useAction(
    async (next: SlaValues) => {
      const patch: Partial<SlaPolicy> = {};
      for (const { name } of SLA_FIELDS)
        if (next[name] !== values[name]) patch[name] = next[name];
      await services.admin.updateSla(policy.priority, patch, actor);
    },
    { success: `${policy.priority} response targets saved` },
  );

  const messages = SLA_FIELDS.flatMap(({ name, label }) =>
    errors[name]?.message ? [`${label}: ${errors[name]?.message}`] : [],
  );
  const errorId = `sla-${policy.priority}-errors`;

  return (
    <li>
      <form
        noValidate
        onSubmit={handleSubmit((next) => void save.run(next))}
        aria-label={`${policy.priority} response targets`}
        className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 xl:grid-cols-[12rem_minmax(0,1fr)_auto] xl:items-start"
      >
        <div className="min-w-0">
          <PriorityBadge priority={policy.priority} size="md" />
          <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
            {policy.definition}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SLA_FIELDS.map(({ name, label, unit }) => {
            const id = `sla-${policy.priority}-${name}`;
            const plain = plainDuration(draft[name], unit);
            return (
              <div key={name} className="min-w-0">
                <Label htmlFor={id} className="text-xs text-muted-foreground">
                  {label}
                </Label>
                <InputGroup className="mt-1.5 h-9">
                  <InputGroupInput
                    id={id}
                    inputMode="numeric"
                    autoComplete="off"
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={errors[name] ? errorId : undefined}
                    className="tnum"
                    {...register(name, { valueAsNumber: true })}
                  />
                  <InputGroupAddon align="inline-end">{unit}</InputGroupAddon>
                </InputGroup>
                <p className="mt-1 min-h-4 text-xs text-subtle">
                  {plain && `= ${plain}`}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 xl:pt-[22px]">
          <Button type="submit" size="lg" disabled={!isDirty || save.pending}>
            {save.pending && <Spinner />}
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={!isDirty || save.pending}
            onClick={() => reset()}
          >
            Discard
          </Button>
        </div>

        {messages.length > 0 && (
          <ul
            id={errorId}
            role="alert"
            className="grid gap-0.5 text-xs text-destructive xl:col-span-2 xl:col-start-2"
          >
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </form>
    </li>
  );
}

/* ───────────────────────── Escalation engine ───────────────────────── */

function SimulatorStatus() {
  const paused = usePrefsStore((s) => s.simulationPaused);
  const connectivity = usePrefsStore((s) => s.connectivity);
  if (paused)
    return (
      <Notice
        icon={Pause}
        tone="caution"
        title="The demo simulator is paused"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/settings#demo">Open demo settings</Link>
          </Button>
        }
      >
        Rules are saved but nothing is evaluating them. Resume the simulator to
        see them act on open incidents.
      </Notice>
    );
  if (connectivity === "offline")
    return (
      <Notice
        icon={WifiOff}
        tone="caution"
        title="The demo connection is set to offline"
      >
        Rules are not evaluated until the connection returns.
      </Notice>
    );
  return (
    <Notice
      icon={Activity}
      tone="info"
      title="Enabled rules are being evaluated live"
    >
      Once a second the demo simulator checks every open incident against the
      rules that are switched on. When a threshold passes, it raises the
      escalation, which appears in the control room.
    </Notice>
  );
}

function EscalationEngine() {
  const rules = useDemoStore((s) => s.escalationRules);
  const escalations = useDemoStore((s) => s.escalations);
  const { actor } = useSession();
  const [editing, setEditing] = useState<
    EscalationRule | { addFor: IncidentPriority } | null
  >(null);
  const [removing, setRemoving] = useState<EscalationRule | null>(null);

  const fired = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of escalations)
      if (e.ruleId) counts.set(e.ruleId, (counts.get(e.ruleId) ?? 0) + 1);
    return counts;
  }, [escalations]);

  const groups = useMemo(
    () =>
      PRIORITIES.map((priority) => ({
        priority,
        rules: rules
          .filter((r) => r.priority === priority)
          .sort((a, b) => a.thresholdSec - b.thresholdSec),
      })),
    [rules],
  );
  const enabledCount = rules.filter((r) => r.enabled).length;

  const setEnabled = useKeyedAction(
    async (rule: EscalationRule, enabled: boolean) => {
      await services.admin.upsertEscalationRule({ ...rule, enabled }, actor);
      return enabled;
    },
    { success: (enabled) => `Rule switched ${enabled ? "on" : "off"}` },
  );
  const remove = useAction(services.admin.removeEscalationRule, {
    success: "Escalation rule removed",
    onSuccess: () => setRemoving(null),
  });

  return (
    <section
      id="escalation"
      aria-labelledby="escalation-title"
      className="scroll-mt-6"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="escalation-title"
            className="text-lg font-semibold tracking-tight"
          >
            Escalation engine
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            What happens automatically when a response stalls.{" "}
            <span className="tnum">
              {enabledCount} of {plural(rules.length, "rule")}
            </span>{" "}
            switched on.
          </p>
        </div>
        <Button size="lg" onClick={() => setEditing({ addFor: "P1" })}>
          <Plus aria-hidden /> Add rule
        </Button>
      </div>

      <SimulatorStatus />

      {rules.length === 0 ? (
        <Panel className="mt-3">
          <BlankState
            icon={Workflow}
            title="No escalation rules"
            description="Nothing is escalated automatically. Operators and supervisors can still escalate an incident by hand."
            action={
              <Button onClick={() => setEditing({ addFor: "P1" })}>
                <Plus aria-hidden /> Add rule
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3">
          {groups.map(({ priority, rules: groupRules }) => (
            <Panel key={priority} aria-label={`${priority} escalation rules`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <PriorityBadge priority={priority} />
                  <h3 className="text-sm font-semibold">
                    {PRIORITY_META[priority].label} incidents
                  </h3>
                  <span className="tnum text-xs text-muted-foreground">
                    {plural(groupRules.length, "rule")}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing({ addFor: priority })}
                >
                  <Plus aria-hidden /> Add {priority} rule
                </Button>
              </div>
              {groupRules.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-muted-foreground">
                  No rules. {priority} incidents are never escalated
                  automatically.
                </p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {groupRules.map((rule) => {
                    const sentence = ruleSentence(rule);
                    const level = ACTION_META[rule.action].level;
                    const count = fired.get(rule.id) ?? 0;
                    return (
                      <li
                        key={rule.id}
                        className={cn(
                          "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3",
                          !rule.enabled && "bg-inset/60",
                        )}
                      >
                        <Switch
                          aria-label={`Rule: ${sentence}`}
                          checked={rule.enabled}
                          disabled={setEnabled.isPending(rule.id)}
                          onCheckedChange={(checked) =>
                            void setEnabled.run(rule.id, rule, checked)
                          }
                        />
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="text-sm leading-relaxed">
                            <RuleSentence rule={rule} muted={!rule.enabled} />
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Level {level} escalation ·{" "}
                            {ESCALATION_LEVEL_LABEL[level]}
                            {count > 0 &&
                              ` · triggered ${count === 1 ? "once" : `${count} times`} in this demo`}
                          </p>
                        </div>
                        {!rule.enabled && (
                          <ToneChip tone="neutral" variant="outline">
                            Off
                          </ToneChip>
                        )}
                        <div className="ml-auto flex shrink-0 gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-lg"
                            aria-label={`Edit rule: ${sentence}`}
                            onClick={() => setEditing(rule)}
                          >
                            <Pencil aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-lg"
                            aria-label={`Remove rule: ${sentence}`}
                            onClick={() => setRemoving(rule)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          ))}
        </div>
      )}

      {editing && (
        <EscalationRuleDialog
          rule={"id" in editing ? editing : undefined}
          defaultPriority={"addFor" in editing ? editing.addFor : undefined}
          existing={rules}
          onClose={() => setEditing(null)}
        />
      )}

      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setRemoving(null)}
          title="Remove this escalation rule?"
          description="Incidents it has already escalated are not affected. You can switch a rule off instead if you may want it again."
          confirmLabel="Remove rule"
          variant="destructive"
          pending={remove.pending}
          onConfirm={() => remove.run(removing.id, actor)}
        >
          <p className="rounded-lg border border-border bg-inset px-3 py-2 text-sm leading-relaxed">
            <RuleSentence rule={removing} />
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}

/* ───────────────────────── Screen ───────────────────────── */

export function SlasScreen() {
  const policies = useDemoStore((s) => s.slaPolicies);
  const ordered = useMemo(
    () =>
      [...policies].sort(
        (a, b) =>
          PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank,
      ),
    [policies],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Response targets and escalation"
        description="How quickly each stage of a response should happen, and what the platform does on its own when it does not."
      />

      <Notice
        icon={FlaskConical}
        tone="caution"
        title="Demonstration targets and policies"
      >
        The values on this page show how the platform is configured. They are
        not official government service levels or police rules. A deployment
        sets its own with the responsible authority.
      </Notice>

      <Panel
        id="targets"
        aria-label="Response targets"
        className="mt-4 scroll-mt-6"
      >
        <PanelHeader
          title="Response targets"
          description="The time allowed for each stage of a response, by priority. Save a row to apply it."
        />
        {ordered.length === 0 ? (
          <BlankState
            compact
            title="No response targets are defined"
            description="Reset the demo from Settings to restore the starting targets."
          />
        ) : (
          <ul className="divide-y divide-border/70">
            {ordered.map((policy) => (
              <SlaRow key={policy.priority} policy={policy} />
            ))}
          </ul>
        )}
      </Panel>

      <div className="mt-8">
        <EscalationEngine />
      </div>
    </PageContainer>
  );
}
