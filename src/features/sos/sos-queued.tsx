"use client";

import { CloudOff, MapPin, PhoneCall, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { ConnectivityIndicator } from "@/components/layout/top-controls";
import { ToneChip } from "@/components/shared/status-chips";
import { ResponseTimer } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/use-t";
import { formatTime } from "@/lib/format";
import type { CancelKind } from "@/stores/demo-store";
import type { Incident } from "@/types";
import { CancelSosDialog } from "./cancel-sos-dialog";

/**
 * The SOS was raised with no connection. This screen is honest about that: the request is saved
 * on the device and has reached nobody yet. It makes no claim about SMS or telephone fallback.
 */
export function SosQueued({ incident }: { incident: Incident }) {
  const t = useT();
  const [ending, setEnding] = useState<{
    open: boolean;
    kind: CancelKind | null;
  }>({ open: false, kind: null });
  const sharingLive = incident.location.source === "device_emergency";

  return (
    <div className="mx-auto grid min-h-full w-full max-w-5xl grid-cols-1 content-center gap-5 px-4 py-6 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start lg:px-8">
      <section
        aria-labelledby="queued-title"
        className="rounded-3xl border border-medium/40 bg-card p-5 shadow-card sm:p-7"
      >
        <span className="grid size-14 place-items-center rounded-full bg-medium-soft text-medium-fg">
          <CloudOff aria-hidden className="size-7" />
        </span>
        <h1
          id="queued-title"
          className="mt-4 text-2xl leading-tight font-semibold tracking-tight sm:text-3xl"
        >
          {t("citizen.sos.queued")}
        </h1>
        <p role="status" aria-live="polite" className="mt-2">
          <ToneChip tone="medium" size="md" dot>
            {t("citizen.sos.fallback")}
          </ToneChip>
        </p>
        <p className="mt-4 text-base leading-relaxed">
          {t("citizen.sos.queuedDetail")}
        </p>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          {t("citizen.sos.queuedNoSms")}
        </p>

        <p className="mt-5 flex items-center gap-3 rounded-2xl bg-medium-soft px-4 py-3.5 text-lg font-semibold text-medium-fg">
          <PhoneCall aria-hidden className="size-5 shrink-0" />
          {t("citizen.sos.call112")}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Button
            variant="success"
            size="2xl"
            className="sm:flex-1"
            onClick={() => setEnding({ open: true, kind: "safe" })}
          >
            <ShieldCheck aria-hidden />
            {t("citizen.sos.iAmSafe")}
          </Button>
          <Button
            variant="outline"
            size="2xl"
            className="sm:flex-1"
            onClick={() => setEnding({ open: true, kind: null })}
          >
            {t("citizen.sos.cancelRequest")}
          </Button>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold">
            {t("citizen.sos.queuedSaved")}
          </h2>
          <dl className="mt-3 space-y-3 text-[15px]">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">
                {t("citizen.sos.incidentId")}
              </dt>
              <dd className="truncate font-mono font-medium">{incident.id}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">
                {t("citizen.sos.raisedAt")}
              </dt>
              <dd className="tnum font-mono font-medium">
                {formatTime(incident.createdAt)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">
                {t("citizen.sos.waiting")}
              </dt>
              <dd>
                <ResponseTimer
                  since={incident.createdAt}
                  label={t("citizen.sos.waiting")}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">
                {t("citizen.sos.connection")}
              </dt>
              <dd>
                <ConnectivityIndicator />
              </dd>
            </div>
          </dl>
          <p className="mt-4 flex items-start gap-2.5 border-t border-border/70 pt-4 text-sm">
            <MapPin
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0">
              <span className="block font-medium">
                {t(
                  sharingLive
                    ? "citizen.sos.queuedLocation"
                    : "citizen.sos.queuedArea",
                )}
              </span>
              <span className="block text-muted-foreground">
                {incident.location.address}
              </span>
            </span>
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold">
            {t("citizen.sos.whileWaiting")}
          </h2>
          <ul className="mt-3 space-y-2.5 text-[15px] leading-relaxed">
            <li>{t("citizen.sos.whileWaiting1")}</li>
            <li>{t("citizen.sos.whileWaiting2")}</li>
            <li>{t("citizen.sos.whileWaiting3")}</li>
          </ul>
        </section>

        <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
          {t("citizen.sos.queuedDemoHint")} {t("demo.realEmergency")}
        </p>
      </aside>

      <CancelSosDialog
        incident={incident}
        open={ending.open}
        initialKind={ending.kind}
        onOpenChange={(open) => setEnding((e) => ({ ...e, open }))}
      />
    </div>
  );
}
