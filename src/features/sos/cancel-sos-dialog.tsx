"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { CancelKind } from "@/stores/demo-store";
import type { Incident } from "@/types";

const REASONS: { kind: CancelKind; labelKey: TKey; hintKey: TKey }[] = [
  {
    kind: "safe",
    labelKey: "citizen.sos.reason.safe",
    hintKey: "citizen.sos.reason.safeHint",
  },
  {
    kind: "false_alarm",
    labelKey: "citizen.sos.reason.mistake",
    hintKey: "citizen.sos.reason.mistakeHint",
  },
  {
    kind: "other",
    labelKey: "citizen.sos.reason.other",
    hintKey: "citizen.sos.reason.otherHint",
  },
];

/** What the control room record should say for each choice. Staff consoles read English. */
const RECORDED: Record<CancelKind, string> = {
  safe: "",
  false_alarm: "Pressed by mistake",
  other: "",
};

function Form({
  incident,
  initialKind,
  onDone,
}: {
  incident: Incident;
  initialKind: CancelKind | null;
  onDone: () => void;
}) {
  const t = useT();
  const { actor } = useSession();
  const noteId = useId();
  const errorId = useId();
  const [kind, setKind] = useState<CancelKind | null>(initialKind);
  const [note, setNote] = useState("");
  const [showError, setShowError] = useState(false);
  // The command returns nothing, so success is reported through the callback rather than the result.
  const cancel = useAction(services.sos.cancel, {
    onSuccess: () => {
      toast.success(
        t(
          kind === "safe"
            ? "citizen.sos.endedSafe"
            : "citizen.sos.endedCancelled",
        ),
      );
      onDone();
    },
  });

  const error = !kind
    ? t("citizen.sos.reason.required")
    : kind === "other" && note.trim().length < 3
      ? t("citizen.sos.reason.otherRequired")
      : null;

  const submit = () => {
    if (!kind || error) {
      setShowError(true);
      return;
    }
    const reason = [RECORDED[kind], note.trim()].filter(Boolean).join(". ");
    void cancel.run(incident.id, kind, reason, actor);
  };

  return (
    <>
      <RadioGroup
        value={kind ?? ""}
        onValueChange={(value) => {
          setKind(value as CancelKind);
          setShowError(false);
        }}
        aria-label={t("citizen.sos.reason.label")}
        aria-describedby={showError && error ? errorId : undefined}
        className="gap-2.5"
      >
        {REASONS.map((reason) => (
          <Label
            key={reason.kind}
            htmlFor={`${noteId}-${reason.kind}`}
            className={cn(
              "flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-left leading-snug font-normal transition-colors",
              kind === reason.kind
                ? "border-primary/60 bg-accent"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <RadioGroupItem
              id={`${noteId}-${reason.kind}`}
              value={reason.kind}
              className="mt-1"
            />
            <span className="min-w-0">
              <span className="block text-base font-medium">
                {t(reason.labelKey)}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {t(reason.hintKey)}
              </span>
            </span>
          </Label>
        ))}
      </RadioGroup>

      <div className="space-y-2">
        <Label htmlFor={noteId} className="text-[15px]">
          {t(
            kind === "other"
              ? "citizen.sos.reason.note"
              : "citizen.sos.reason.noteOptional",
          )}
        </Label>
        <Textarea
          id={noteId}
          value={note}
          maxLength={240}
          aria-required={kind === "other"}
          aria-invalid={showError && kind === "other" && Boolean(error)}
          onChange={(e) => {
            setNote(e.target.value);
            setShowError(false);
          }}
          className="min-h-20 rounded-xl text-base md:text-[15px]"
        />
      </div>

      {showError && error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm font-medium text-critical-fg"
        >
          {error}
        </p>
      )}

      <AlertDialogFooter className="-mx-5 -mb-5 rounded-b-2xl p-5">
        <AlertDialogCancel size="xl">
          {t("citizen.sos.keepActive")}
        </AlertDialogCancel>
        <Button
          size="xl"
          variant={kind === "safe" ? "success" : "default"}
          disabled={cancel.pending}
          onClick={submit}
        >
          {t(
            kind === "safe"
              ? "citizen.sos.iAmSafe"
              : "citizen.sos.endEmergency",
          )}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

/**
 * Ends an emergency from the citizen's side. A reason is always required so the control room
 * knows whether to stand the response down or check on the citizen.
 */
export function CancelSosDialog({
  incident,
  open,
  initialKind,
  onOpenChange,
}: {
  incident: Incident;
  open: boolean;
  /** Preselects "I am safe now" when the dialog was opened from that button. */
  initialKind: CancelKind | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90dvh] gap-4 overflow-y-auto rounded-2xl p-5 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-md">
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle className="text-lg">
            {t("citizen.sos.cancelTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[15px] leading-relaxed">
            {t("citizen.sos.cancelBody")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* The content unmounts when closed, so each opening starts from the button that opened it. */}
        <Form
          incident={incident}
          initialKind={initialKind}
          onDone={() => onOpenChange(false)}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
