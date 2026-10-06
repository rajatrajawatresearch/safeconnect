"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ESCALATION_LEVEL_LABEL,
  PRIORITIES,
  PRIORITY_META,
} from "@/config/incident";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { formatSeconds } from "@/lib/format";
import { uid } from "@/lib/prng";
import { services } from "@/services";
import type { EscalationRule, IncidentPriority } from "@/types";
import { ACTIONS, ACTION_META, TRIGGERS, TRIGGER_META } from "./admin-meta";
import { FormField, Spinner } from "./admin-ui";

/** "P1 incident · No acknowledgement within 30 sec → Alert supervisor" */
export const ruleSentence = (
  rule: Pick<
    EscalationRule,
    "priority" | "trigger" | "thresholdSec" | "action"
  >,
) =>
  `${rule.priority} incident · ${TRIGGER_META[rule.trigger].label} within ${formatSeconds(rule.thresholdSec)} → ${ACTION_META[rule.action].label}`;

/** The same sentence with the parts an administrator sets picked out. */
export function RuleSentence({
  rule,
  muted,
}: {
  rule: Pick<
    EscalationRule,
    "priority" | "trigger" | "thresholdSec" | "action"
  >;
  muted?: boolean;
}) {
  const strong = muted ? "font-medium" : "font-medium text-foreground";
  return (
    <span className="text-muted-foreground">
      {rule.priority} incident ·{" "}
      <span className={strong}>{TRIGGER_META[rule.trigger].label}</span> within{" "}
      <span className={`tnum ${strong}`}>
        {formatSeconds(rule.thresholdSec)}
      </span>
      <ArrowRight
        aria-label="then"
        className="mx-1.5 inline size-3.5 align-[-2px] text-subtle"
      />
      <span className={strong}>{ACTION_META[rule.action].label}</span>
    </span>
  );
}

const schema = z.object({
  priority: z.enum(PRIORITIES),
  trigger: z.enum(TRIGGERS),
  thresholdSec: z
    .number({ error: "Enter the threshold in whole seconds." })
    .int("Enter the threshold in whole seconds.")
    .min(5, "Use at least 5 seconds.")
    .max(86_400, "Use 86,400 seconds (24 hours) or less."),
  action: z.enum(ACTIONS),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function EscalationRuleDialog({
  rule,
  defaultPriority = "P1",
  existing,
  onClose,
}: {
  /** Omit to add a rule. */
  rule?: EscalationRule;
  defaultPriority?: IncidentPriority;
  existing: EscalationRule[];
  onClose: () => void;
}) {
  const { actor } = useSession();
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: rule
      ? {
          priority: rule.priority,
          trigger: rule.trigger,
          thresholdSec: rule.thresholdSec,
          action: rule.action,
          enabled: rule.enabled,
        }
      : {
          priority: defaultPriority,
          trigger: "no_acknowledgement",
          thresholdSec: 60,
          action: "alert_supervisor",
          enabled: true,
        },
  });
  const draft = useWatch({ control });

  const save = useAction(services.admin.upsertEscalationRule, {
    success: rule ? "Escalation rule saved" : "Escalation rule added",
    onSuccess: onClose,
  });

  const onSubmit = handleSubmit((values) => {
    const duplicate = existing.some(
      (other) =>
        other.id !== rule?.id &&
        other.priority === values.priority &&
        other.trigger === values.trigger &&
        other.thresholdSec === values.thresholdSec &&
        other.action === values.action,
    );
    if (duplicate) {
      setError("root", {
        message: "An identical rule already exists for this priority.",
      });
      return;
    }
    void save.run({ ...values, id: rule?.id ?? uid("er") }, actor);
  });

  const previewReady =
    draft.priority &&
    draft.trigger &&
    draft.action &&
    typeof draft.thresholdSec === "number" &&
    Number.isFinite(draft.thresholdSec) &&
    draft.thresholdSec > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Edit escalation rule" : "Add escalation rule"}
          </DialogTitle>
          <DialogDescription>
            A demonstration policy. When the condition holds for longer than the
            threshold, the incident is escalated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4">
          <FormField
            label="When an incident of priority"
            htmlFor="rule-priority"
            error={errors.priority?.message}
          >
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="rule-priority"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    className="w-full data-[size=default]:h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority} · {PRIORITY_META[priority].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Has"
            htmlFor="rule-trigger"
            error={errors.trigger?.message}
            hint={draft.trigger && TRIGGER_META[draft.trigger].description}
          >
            <Controller
              control={control}
              name="trigger"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="rule-trigger"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-describedby="rule-trigger-hint"
                    className="w-full data-[size=default]:h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    {TRIGGERS.map((trigger) => (
                      <SelectItem key={trigger} value={trigger}>
                        {TRIGGER_META[trigger].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Within"
            htmlFor="rule-threshold"
            error={errors.thresholdSec?.message}
            hint={
              typeof draft.thresholdSec === "number" && draft.thresholdSec >= 60
                ? `That is ${formatSeconds(draft.thresholdSec)}.`
                : "Seconds. The simulator checks once a second."
            }
          >
            <InputGroup className="h-9">
              <InputGroupInput
                id="rule-threshold"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={Boolean(errors.thresholdSec)}
                aria-describedby={
                  errors.thresholdSec
                    ? "rule-threshold-error"
                    : "rule-threshold-hint"
                }
                className="tnum"
                {...register("thresholdSec", { valueAsNumber: true })}
              />
              <InputGroupAddon align="inline-end">sec</InputGroupAddon>
            </InputGroup>
          </FormField>

          <FormField
            label="Then"
            htmlFor="rule-action"
            error={errors.action?.message}
            hint={
              draft.action &&
              `Raises a level ${ACTION_META[draft.action].level} escalation · ${ESCALATION_LEVEL_LABEL[ACTION_META[draft.action].level]}.`
            }
          >
            <Controller
              control={control}
              name="action"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="rule-action"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-describedby="rule-action-hint"
                    className="w-full data-[size=default]:h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    {ACTIONS.map((action) => (
                      <SelectItem key={action} value={action}>
                        {ACTION_META[action].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-inset px-3 py-2.5">
            <div className="min-w-0">
              <Label htmlFor="rule-enabled">Switched on</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                A rule that is off is kept but never evaluated.
              </p>
            </div>
            <Controller
              control={control}
              name="enabled"
              render={({ field }) => (
                <Switch
                  id="rule-enabled"
                  ref={field.ref}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>

          <div aria-live="polite" className="text-sm">
            <p className="text-xs text-muted-foreground">Reads as</p>
            <p className="mt-1 leading-relaxed">
              {previewReady ? (
                <RuleSentence
                  rule={{
                    priority: draft.priority as IncidentPriority,
                    trigger: draft.trigger as EscalationRule["trigger"],
                    thresholdSec: draft.thresholdSec as number,
                    action: draft.action as EscalationRule["action"],
                  }}
                />
              ) : (
                <span className="text-muted-foreground">
                  Enter a threshold to see the rule.
                </span>
              )}
            </p>
          </div>

          {errors.root?.message && (
            <p role="alert" className="text-sm text-destructive">
              {errors.root.message}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="lg" disabled={save.pending}>
              {save.pending && <Spinner />}
              {rule ? "Save rule" : "Add rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
