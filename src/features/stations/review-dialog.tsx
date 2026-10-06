"use client";

import { ClipboardCheck } from "lucide-react";
import { Field } from "@/components/shared/page";
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
import { useAction } from "@/hooks/use-action";
import { useUnits } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { formatDateTime, formatDuration } from "@/lib/format";
import { services } from "@/services";
import type { Incident } from "@/types";

/**
 * Supervisor review of a submitted response report: read it, then close the incident.
 * Mount it only while it is open.
 */
export function ReviewDialog({
  incident,
  onClose,
}: {
  incident: Incident;
  onClose: () => void;
}) {
  const { actor } = useSession();
  const units = useUnits();
  const close = useAction(services.incidents.close, {
    success: "Incident closed",
    onSuccess: onClose,
  });

  const responders = incident.assignments
    .filter((a) => a.response === "accepted")
    .map((a) => units.find((u) => u.id === a.unitId)?.callSign)
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review and close</DialogTitle>
          <DialogDescription>
            Read the preliminary response report. Closing records you as the
            reviewer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-inset p-3">
          <PriorityBadge priority={incident.priority} variant="outline" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{incident.title}</p>
            <p className="tnum truncate font-mono text-xs text-muted-foreground">
              {incident.id} · {incident.location.area}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Preliminary response report</h3>
          <p className="mt-1.5 rounded-xl border border-border p-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
            {incident.handoff.reportDraft ??
              incident.resolution ??
              "The officer submitted the report without a written summary."}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
          <Field label="Responding unit">{responders || "None recorded"}</Field>
          <Field label="Resolved">
            <span className="tnum">
              {incident.resolvedAt
                ? formatDateTime(incident.resolvedAt)
                : "Not recorded"}
            </span>
          </Field>
          <Field label="Time to resolve">
            <span className="tnum font-mono">
              {incident.resolvedAt
                ? formatDuration(
                    (incident.resolvedAt - incident.createdAt) / 1000,
                    true,
                  )
                : "—"}
            </span>
          </Field>
          <Field label="Evidence package">
            <span className="tnum font-mono">
              {incident.handoff.evidencePackageRef ?? "None"}
            </span>
            <span className="font-normal text-muted-foreground">
              {" "}
              · {incident.evidenceIds.length}{" "}
              {incident.evidenceIds.length === 1 ? "item" : "items"}
            </span>
          </Field>
        </dl>

        <p className="text-xs leading-relaxed text-muted-foreground">
          This is an internal response record for the demonstration. It is not
          an FIR, and closing it starts no statutory process.
        </p>

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            disabled={close.pending}
            onClick={() => close.run(incident.id, actor)}
          >
            <ClipboardCheck aria-hidden />
            {close.pending ? "Closing…" : "Close incident"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
