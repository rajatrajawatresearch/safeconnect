"use client";

import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { ChatThread } from "@/components/shared/chat-thread";
import { EtaCountdown } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { useUnit } from "@/hooks/use-demo-data";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types";
import { CancelSosDialog } from "./cancel-sos-dialog";
import { useSosUi } from "./sos-ui-store";
import {
  currentStepIndex,
  deriveSteps,
  primaryAssignment,
} from "./status-stepper";

/**
 * Silent mode. A dim, still screen for when being seen asking for help is itself a risk:
 * one quiet status line, a location indicator and chat. Voice and video are not offered.
 *
 * It is a display mode and nothing else. It does not start the microphone or the camera, and it
 * says so on screen.
 */
export function SosDiscreet({ incident }: { incident: Incident }) {
  const t = useT();
  const setDiscreet = useSosUi((s) => s.setDiscreet);
  const unit = useUnit(primaryAssignment(incident)?.unitId);
  const [ending, setEnding] = useState(false);

  const steps = deriveSteps(incident);
  const reached = steps[Math.max(0, currentStepIndex(steps) - 1)];
  const sharingLive = incident.location.source === "device_emergency";

  return (
    // The `dark` class scopes the dark palette to this view whatever theme the app is in.
    <div className="dark flex h-full min-h-0 flex-col bg-background text-muted-foreground md:flex-row">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 md:w-72 md:justify-between md:border-r md:border-b-0 md:px-5 md:py-6 lg:w-80">
        <div className="flex items-start justify-between gap-3 md:flex-col md:gap-5">
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-foreground/80">
              {t("citizen.silent.title")}
            </h1>
            <p role="status" aria-live="polite" className="mt-1 text-sm">
              {t(reached.labelKey)}
              {unit && (
                <span className="font-mono text-[13px]">
                  {" "}
                  · {unit.callSign}
                </span>
              )}
              {incident.status === "en_route" && (
                <>
                  {" · "}
                  <EtaCountdown
                    at={incident.etaAt}
                    arrivingLabel={t("citizen.sos.arriving")}
                    className="text-[13px]"
                  />
                </>
              )}
            </p>
            <p className="mt-2 flex items-center gap-2 text-[13px]">
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  sharingLive ? "bg-resolved" : "bg-subtle",
                )}
              />
              {t(
                sharingLive
                  ? "citizen.silent.sharing"
                  : "citizen.silent.notSharing",
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="xl"
            className="shrink-0 px-3.5 text-foreground md:w-full"
            onClick={() => setDiscreet(incident.id, false)}
          >
            <Maximize2 aria-hidden />
            {t("citizen.silent.exit")}
          </Button>
        </div>

        <div className="hidden space-y-4 md:block">
          <p className="text-[13px] leading-relaxed">
            {t("citizen.silent.note")}
          </p>
          <Button
            variant="ghost"
            size="xl"
            className="w-full justify-start px-3"
            onClick={() => setEnding(true)}
          >
            {t("citizen.sos.endEmergency")}
          </Button>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <ChatThread
          incidentId={incident.id}
          channel="citizen"
          quickReplies={[
            t("citizen.sos.reply.safeForNow"),
            t("citizen.sos.reply.stillHere"),
            t("citizen.sos.reply.cannotTalk"),
            t("citizen.sos.reply.moved"),
          ]}
          placeholder={t("citizen.sos.chatPlaceholder")}
          className="min-h-0 flex-1 text-foreground"
        />
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 md:hidden">
          <p className="text-xs leading-snug">{t("citizen.silent.note")}</p>
          <Button
            variant="ghost"
            className="h-11 shrink-0 px-3 text-sm"
            onClick={() => setEnding(true)}
          >
            {t("citizen.sos.endEmergency")}
          </Button>
        </div>
      </div>

      <CancelSosDialog
        incident={incident}
        open={ending}
        initialKind={null}
        onOpenChange={setEnding}
      />
    </div>
  );
}
