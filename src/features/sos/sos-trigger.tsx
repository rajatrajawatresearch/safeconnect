"use client";

import {
  ChevronRight,
  EyeOff,
  Headset,
  MapPin,
  MapPinOff,
  Send,
  Truck,
  Users,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { joinNames, useSosContacts } from "@/features/citizen/use-citizen-data";
import { useLanguage, useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Citizen } from "@/types";
import { SosConfirmDialog } from "./sos-confirm-dialog";
import { SosHoldButton } from "./sos-hold-button";
import { useRaiseSos } from "./use-raise-sos";

function Step({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon aria-hidden className="size-[18px]" />
      </span>
      <span className="min-w-0 pt-1.5 text-[15px] leading-snug">
        {children}
      </span>
    </li>
  );
}

/** No emergency in progress: the whole screen is the trigger and a plain account of what it does. */
export function SosTrigger({ citizen }: { citizen: Citizen }) {
  const t = useT();
  const language = useLanguage();
  const { raise, pending, shareLive } = useRaiseSos();
  const { contacts, allowed } = useSosContacts(citizen.id);
  const [confirm, setConfirm] = useState({ open: false, silent: false });
  const offline = usePrefsStore((state) => state.connectivity === "offline");

  return (
    <div className="mx-auto grid min-h-full w-full max-w-5xl grid-cols-1 grid-rows-[1fr_auto] gap-5 px-4 py-5 sm:px-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:grid-rows-1 md:items-center md:gap-6 md:py-8 lg:px-8">
      <section
        aria-labelledby="sos-trigger-title"
        className="flex flex-col items-center justify-center text-center md:rounded-3xl md:border md:border-border md:bg-card md:px-6 md:py-10 md:shadow-card"
      >
        <h1
          id="sos-trigger-title"
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {t("citizen.emergency.title")}
        </h1>
        <p className="mt-2 max-w-sm text-base leading-relaxed text-muted-foreground">
          {t(
            shareLive
              ? "citizen.emergency.body"
              : "citizen.emergency.bodyNoLocation",
          )}
        </p>

        <SosHoldButton
          size="xl"
          busy={pending}
          onConfirm={() => void raise()}
          className="mt-7"
        />
        <p className="sr-only">{t("citizen.sos.kbdHint")}</p>

        <div className="mt-5 flex w-full max-w-sm flex-col gap-2">
          <Button
            variant="outline"
            size="xl"
            className="h-auto min-h-12 py-2 whitespace-normal"
            onClick={() => setConfirm({ open: true, silent: false })}
          >
            {t("citizen.home.cannotHold")}
          </Button>
          <Button
            variant="ghost"
            size="xl"
            className="text-muted-foreground"
            onClick={() => setConfirm({ open: true, silent: true })}
          >
            <EyeOff aria-hidden /> {t("citizen.home.silent")}
          </Button>
        </div>
      </section>

      <aside className="space-y-4">
        {offline && (
          <p
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-medium/40 bg-medium-soft p-4 text-[15px] leading-snug text-medium-fg sm:p-5"
          >
            <WifiOff aria-hidden className="mt-0.5 size-5 shrink-0" />
            {t("citizen.sos.queuedBody")}
          </p>
        )}
        <section
          className={cn(
            "rounded-2xl border p-4 sm:p-5",
            shareLive
              ? "border-border bg-card shadow-card"
              : "border-medium/40 bg-medium-soft",
          )}
        >
          <p className="flex items-start gap-3">
            {shareLive ? (
              <MapPin
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-resolved-fg"
              />
            ) : (
              <MapPinOff
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-medium-fg"
              />
            )}
            <span className="min-w-0">
              <span className="block text-base font-medium">
                {t(
                  shareLive
                    ? "citizen.sos.sharingOn"
                    : "citizen.sos.sharingOff",
                )}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-sm leading-relaxed",
                  shareLive ? "text-muted-foreground" : "text-medium-fg",
                )}
              >
                {shareLive
                  ? t("citizen.privacy.emergencySharing")
                  : t("citizen.sos.sharingOffBody")}
              </span>
            </span>
          </p>
          <Link
            href="/citizen/privacy"
            className="mt-2 ml-8 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("citizen.sos.openPrivacy")}
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </section>

        <section
          aria-labelledby="sos-what-happens"
          className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
        >
          <h2 id="sos-what-happens" className="text-lg font-semibold">
            {t("citizen.sos.whatHappens")}
          </h2>
          <ol className="mt-3 space-y-3">
            <Step icon={Send}>
              {t(shareLive ? "citizen.sos.what1" : "citizen.sos.what1Off")}
            </Step>
            <Step icon={Headset}>{t("citizen.sos.what2")}</Step>
            <Step icon={Truck}>{t("citizen.sos.what3")}</Step>
          </ol>
        </section>

        <Link
          href={allowed ? "/citizen/contacts" : "/citizen/privacy"}
          className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-muted"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
            <Users aria-hidden className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1 text-[15px] leading-snug">
            {!allowed
              ? t("citizen.sos.contactsOffShort")
              : contacts.length > 0
                ? t("citizen.sos.contactsWillTell", {
                    names: joinNames(contacts, language),
                  })
                : t("citizen.sos.contactsNoneShort")}
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-subtle" />
        </Link>

        <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
          {t("citizen.quick.demoNote")}
        </p>
      </aside>

      <SosConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}
        silent={confirm.silent}
        shareLive={shareLive}
        onConfirm={() => void raise({ silent: confirm.silent })}
      />
    </div>
  );
}
