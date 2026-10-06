"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { PriorityBadge } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ESCALATION_LEVEL_LABEL } from "@/config/incident";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { Incident } from "@/types";
import { ESCALATION_LEVELS, LEVEL_NOTE } from "./escalation-meta";

const MIN_REASON = 10;

/**
 * Raises an incident to a supervisor or to command. Mount it only while it is open, so it starts
 * one level above wherever the incident currently stands.
 */
export function EscalateDialog({
  incident,
  onClose,
}: {
  incident: Incident;
  onClose: () => void;
}) {
  const { actor } = useSession();
  const [level, setLevel] = useState<1 | 2 | 3>(
    Math.min(3, incident.escalationLevel + 1) as 1 | 2 | 3,
  );
  const [reason, setReason] = useState("");
  const [attempted, setAttempted] = useState(false);
  const valid = reason.trim().length >= MIN_REASON;

  const escalate = useAction(services.incidents.escalate, {
    success: "Incident escalated",
    onSuccess: onClose,
  });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escalate incident</DialogTitle>
          <DialogDescription>
            The level you choose is alerted straight away and the escalation is
            added to the incident timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-inset p-3">
          <PriorityBadge priority={incident.priority} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{incident.title}</p>
            <p className="tnum truncate font-mono text-xs text-muted-foreground">
              {incident.id} · {incident.location.area}
            </p>
          </div>
        </div>

        <form
          id="escalate-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setAttempted(true);
            if (!valid) return;
            void escalate.run(incident.id, level, reason.trim(), actor);
          }}
        >
          <div
            role="group"
            aria-labelledby="escalate-level-label"
            className="space-y-2"
          >
            <p id="escalate-level-label" className="text-sm font-medium">
              Escalate to
            </p>
            <RadioGroup
              value={String(level)}
              onValueChange={(next) => setLevel(Number(next) as 1 | 2 | 3)}
              className="gap-2"
            >
              {ESCALATION_LEVELS.map((value) => (
                <label
                  key={value}
                  htmlFor={`escalate-level-${value}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                    level === value
                      ? "border-primary/60 bg-accent/60"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem
                    id={`escalate-level-${value}`}
                    value={String(value)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {ESCALATION_LEVEL_LABEL[value]}
                      {incident.escalationLevel === value && (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · already informed
                        </span>
                      )}
                    </span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {LEVEL_NOTE[value]}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="escalate-reason">Reason</Label>
            <Textarea
              id="escalate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What has changed, and what do you need from them?"
              rows={3}
              aria-required="true"
              aria-invalid={attempted && !valid}
              aria-describedby="escalate-reason-hint"
            />
            <p
              id="escalate-reason-hint"
              className={
                attempted && !valid
                  ? "text-xs text-critical-fg"
                  : "text-xs text-muted-foreground"
              }
            >
              {attempted && !valid
                ? `Write at least ${MIN_REASON} characters.`
                : "Staff only. The citizen does not see this."}
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="escalate-form"
            size="lg"
            disabled={escalate.pending}
          >
            <TriangleAlert aria-hidden />
            {escalate.pending ? "Escalating…" : "Escalate incident"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
