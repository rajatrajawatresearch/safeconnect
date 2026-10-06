"use client";

import { FileOutput } from "lucide-react";
import { useState } from "react";
import {
  ClassificationChip,
  IntegrityChip,
} from "@/components/shared/status-chips";
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
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { services } from "@/services";
import type { Evidence } from "@/types";

const MIN_PURPOSE = 10;

const COMMON_PURPOSES = [
  "Case hand-off package for the investigating officer",
  "Supervisor review of the response",
  "Requested by the district command for review",
];

/** Records an export request against the item. Nothing is downloaded in the demonstration. */
export function ExportDialog({
  evidence,
  open,
  onOpenChange,
}: {
  evidence: Evidence;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { actor } = useSession();
  const [purpose, setPurpose] = useState("");
  const [attempted, setAttempted] = useState(false);
  const valid = purpose.trim().length >= MIN_PURPOSE;

  const close = (next: boolean) => {
    if (!next) {
      setPurpose("");
      setAttempted(false);
    }
    onOpenChange(next);
  };

  const request = useAction(services.evidence.requestExport, {
    success: "Export requested",
    onSuccess: () => close(false),
  });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request export</DialogTitle>
          <DialogDescription>
            The request is recorded against {actor.name} in the access history
            and the audit log. The original stays untouched.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-inset p-3">
          <p className="tnum font-mono text-xs text-muted-foreground">
            {evidence.id}
          </p>
          <p className="mt-0.5 text-sm font-medium break-words">
            {evidence.title}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <IntegrityChip value={evidence.integrity} />
            <ClassificationChip value={evidence.classification} />
          </div>
          {evidence.integrity === "flagged" && (
            <p className="mt-2 text-xs leading-relaxed text-critical-fg">
              Integrity is flagged on this item. The request will carry the
              flag.
            </p>
          )}
        </div>

        <form
          id="export-form"
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            setAttempted(true);
            if (!valid) return;
            void request.run(evidence.id, purpose.trim(), actor);
          }}
        >
          <Label htmlFor="export-purpose">Purpose of the export</Label>
          <Textarea
            id="export-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Why is this item needed, and by whom?"
            rows={3}
            aria-required="true"
            aria-invalid={attempted && !valid}
            aria-describedby="export-purpose-hint"
          />
          <p
            id="export-purpose-hint"
            className={
              attempted && !valid
                ? "text-xs text-critical-fg"
                : "text-xs text-muted-foreground"
            }
          >
            {attempted && !valid
              ? `Describe the purpose in at least ${MIN_PURPOSE} characters.`
              : "Required. Reviewers read this before an export is approved."}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {COMMON_PURPOSES.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => setPurpose(text)}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-left text-xs font-medium hover:bg-muted"
              >
                {text}
              </button>
            ))}
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="export-form"
            size="lg"
            disabled={request.pending}
          >
            <FileOutput aria-hidden />
            {request.pending ? "Requesting…" : "Request export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
