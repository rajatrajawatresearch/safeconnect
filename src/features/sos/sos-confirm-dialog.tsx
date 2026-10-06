"use client";

import { EyeOff, Siren } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useT } from "@/hooks/use-t";
import { usePrefsStore } from "@/stores/prefs-store";

/**
 * The non-timed way to raise an SOS: one tap to open this, one tap to confirm.
 * It exists for anyone who cannot hold a button down for three seconds.
 */
export function SosConfirmDialog({
  open,
  onOpenChange,
  silent,
  shareLive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  silent?: boolean;
  /** Whether the device position will be attached. */
  shareLive: boolean;
  onConfirm: () => void;
}) {
  const t = useT();
  // Offline, the request is queued rather than delivered, and the dialog must not claim otherwise.
  const offline = usePrefsStore((state) => state.connectivity === "offline");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-5 rounded-2xl p-5 data-[size=default]:sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia
            className={
              silent
                ? "rounded-full bg-muted text-muted-foreground"
                : "rounded-full bg-critical-soft text-critical-fg"
            }
          >
            {silent ? <EyeOff aria-hidden /> : <Siren aria-hidden />}
          </AlertDialogMedia>
          <AlertDialogTitle className="text-lg">
            {t(
              silent ? "citizen.home.silentTitle" : "citizen.home.confirmTitle",
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[15px] leading-relaxed">
            {offline
              ? t("citizen.sos.queuedBody")
              : t(
                  silent
                    ? "citizen.home.silentBody"
                    : "citizen.home.confirmBody",
                )}{" "}
            {!shareLive && t("citizen.sos.sharingOffBody")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="-mx-5 -mb-5 rounded-b-2xl p-5">
          <AlertDialogCancel size="xl">{t("action.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            size="xl"
            variant={silent ? "default" : "critical"}
            onClick={onConfirm}
          >
            {t(
              silent
                ? "citizen.home.silentAction"
                : "citizen.home.confirmAction",
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
