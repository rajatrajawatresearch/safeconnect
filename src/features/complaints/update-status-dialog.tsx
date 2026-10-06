"use client";

import { useState } from "react";
import { ComplaintStatusChip } from "@/components/shared/status-chips";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPLAINT_STATUS_META,
  COMPLAINT_STATUS_ORDER,
} from "@/config/incident";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { services } from "@/services";
import type { Complaint, ComplaintStatus } from "@/types";
import { NEXT_STATUS } from "./complaint-meta";

const MIN_NOTE = 10;

const NOTE_PLACEHOLDER: Record<ComplaintStatus, string> = {
  submitted: "What has happened since the complaint came in?",
  received: "Which desk has received it?",
  under_review: "Who is reviewing it, and what happens next?",
  assigned: "Who has it been assigned to, and for what?",
  in_progress: "What has been done so far, and what is planned?",
  info_required: "What exactly should the citizen add or send?",
  resolved: "What was the outcome?",
  closed: "Why is the complaint being closed?",
};

/**
 * Changes a complaint's status with a note. Mount it only while it is open (and key it by the
 * preset) so every opening starts from a clean form.
 */
export function UpdateStatusDialog({
  complaint,
  preset,
  onClose,
}: {
  complaint: Complaint;
  /** Status to start on, e.g. "info_required" from the "Ask for more information" action. */
  preset?: ComplaintStatus;
  onClose: () => void;
}) {
  const { actor } = useSession();
  const [status, setStatus] = useState<ComplaintStatus>(
    preset ?? NEXT_STATUS[complaint.status],
  );
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);
  const valid = note.trim().length >= MIN_NOTE;
  const unchanged = status === complaint.status;
  const isTip = complaint.kind === "confidential_tip";
  const reachesCitizen = Boolean(complaint.citizenId) && !isTip;

  const update = useAction(services.complaints.updateStatus, {
    success: unchanged ? "Update posted" : "Status updated",
    onSuccess: onClose,
  });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update status</DialogTitle>
          <DialogDescription>
            <span className="tnum font-mono">{complaint.id}</span> ·{" "}
            {complaint.title}
          </DialogDescription>
        </DialogHeader>

        <form
          id="complaint-status-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setAttempted(true);
            if (!valid) return;
            void update.run(complaint.id, status, note.trim(), actor);
          }}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Current status</span>
            <ComplaintStatusChip status={complaint.status} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="complaint-new-status">New status</Label>
            <Select
              value={status}
              onValueChange={(next) => setStatus(next as ComplaintStatus)}
            >
              <SelectTrigger
                id="complaint-new-status"
                className="w-full data-[size=default]:h-9"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                {COMPLAINT_STATUS_ORDER.map((value) => (
                  <SelectItem key={value} value={value}>
                    {COMPLAINT_STATUS_META[value].label}
                    {value === complaint.status && " (current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {status === "assigned" && !complaint.assignedAuthority && (
              <p className="text-xs text-muted-foreground">
                You will be recorded as the assigned authority.
              </p>
            )}
            {unchanged && (
              <p className="text-xs text-muted-foreground">
                The status stays the same. Your note is added as a new update.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="complaint-note">
              {reachesCitizen ? "Note for the citizen" : "Note on the record"}
            </Label>
            <Textarea
              id="complaint-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={NOTE_PLACEHOLDER[status]}
              rows={4}
              aria-required="true"
              aria-invalid={attempted && !valid}
              aria-describedby="complaint-note-hint"
            />
            <p
              id="complaint-note-hint"
              className={
                attempted && !valid
                  ? "text-xs text-critical-fg"
                  : "text-xs leading-relaxed text-muted-foreground"
              }
            >
              {attempted && !valid
                ? `Write at least ${MIN_NOTE} characters.`
                : reachesCitizen
                  ? "The citizen is notified and reads this note in their app. Write it plainly."
                  : isTip
                    ? "No one is notified. A confidential tip has no linked identity."
                    : "Kept on the record. No app account is linked to this complaint."}
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="complaint-status-form"
            size="lg"
            disabled={update.pending}
          >
            {update.pending
              ? "Saving…"
              : unchanged
                ? "Post update"
                : "Update status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
