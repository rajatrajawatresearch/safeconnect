"use client";

import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  EyeOff,
  FilePen,
  FileText,
  MapPin,
  MapPinOff,
  MapPinned,
  Route,
  ShieldCheck,
  Users,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/shared/page";
import { RestrictedState } from "@/components/shared/states";
import { SeverityDot, ToneChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import { SosConfirmDialog } from "@/features/sos/sos-confirm-dialog";
import { SosHoldButton } from "@/features/sos/sos-hold-button";
import { IncidentStatusLabel } from "@/features/sos/status-label";
import { useRaiseSos } from "@/features/sos/use-raise-sos";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { greetingFor } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Citizen, Incident } from "@/types";
import { QUICK_HELP, QuickHelpSheet, type QuickHelp } from "./quick-help-sheet";
import { useCitizenComplaints, useCitizenContacts } from "./use-citizen-data";

interface Entry {
  href: string;
  icon: LucideIcon;
  labelKey: TKey;
  descKey: TKey;
  meta?: string;
}

const tileClass =
  "flex min-h-24 w-full flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-card transition-colors hover:bg-muted sm:p-4";

function QuickTile({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="text-[13px] leading-tight font-medium sm:text-sm">
        {label}
      </span>
    </>
  );
}

/** Shown in place of the SOS control while an emergency is already open. */
function ActiveEmergencyCard({ incident }: { incident: Incident }) {
  const t = useT();
  const queued = incident.sync === "queued";
  // A silent SOS stays quiet on the home screen too.
  const quiet = Boolean(incident.silent);
  return (
    <section
      aria-labelledby="emergency-title"
      className={cn(
        "rounded-3xl border p-5 sm:p-7",
        quiet
          ? "border-border bg-card shadow-card"
          : "border-critical/35 bg-critical-soft",
      )}
    >
      <div className="flex items-start gap-3.5">
        {!quiet && (
          <SeverityDot tone="critical" pulse={!queued} className="mt-3" />
        )}
        <div className="min-w-0 flex-1">
          <h2
            id="emergency-title"
            className={cn(
              "text-2xl font-semibold tracking-tight sm:text-3xl",
              !quiet && "text-critical-fg",
            )}
          >
            {queued
              ? t("citizen.sos.queued")
              : quiet
                ? t("citizen.home.silentActive")
                : t("citizen.safetyStatus.active")}
          </h2>
          <p className="mt-2 max-w-xl text-base leading-relaxed">
            {queued
              ? t("citizen.sos.queuedBody")
              : t("citizen.home.activeBody")}
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{incident.id}</span>
            {!queued && <IncidentStatusLabel status={incident.status} />}
          </p>
        </div>
      </div>
      <Button
        asChild
        size="2xl"
        variant={quiet ? "default" : "critical"}
        className="mt-5 w-full sm:w-auto"
      >
        <Link href="/citizen/sos">
          {t("citizen.sos.viewActive")} <ArrowRight aria-hidden />
        </Link>
      </Button>
    </section>
  );
}

function Home({ citizen }: { citizen: Citizen }) {
  const t = useT();
  const router = useRouter();
  const now = useNow(60_000);
  const { raise, pending, active, shareLive } = useRaiseSos();
  const { openCount } = useCitizenComplaints(citizen.id);
  const contacts = useCitizenContacts(citizen.id);
  const [confirm, setConfirm] = useState({ open: false, silent: false });
  const [quick, setQuick] = useState<QuickHelp | null>(null);
  const offline = usePrefsStore((state) => state.connectivity === "offline");

  const firstName = citizen.name.split(" ")[0];
  const greeting = t(`citizen.greeting.${greetingFor(new Date(now))}`, {
    name: firstName,
  });

  const openQuick = (help: QuickHelp) => {
    if (active) {
      toast(t("citizen.sos.alreadyActive"));
      router.push("/citizen/sos");
      return;
    }
    setQuick(help);
  };

  const entries: Entry[] = [
    {
      href: "/citizen/journey",
      icon: Route,
      labelKey: "citizen.section.journey",
      descKey: "citizen.home.journeyDesc",
    },
    {
      href: "/citizen/report",
      icon: FileText,
      labelKey: "citizen.section.report",
      descKey: "citizen.home.reportDesc",
    },
    {
      href: "/citizen/complaints",
      icon: ClipboardList,
      labelKey: "citizen.section.complaints",
      descKey: "citizen.home.complaintsDesc",
      meta:
        openCount > 0
          ? t("citizen.home.openCount", { count: openCount })
          : undefined,
    },
    {
      href: "/citizen/nearby",
      icon: MapPinned,
      labelKey: "citizen.section.nearby",
      descKey: "citizen.home.nearbyDesc",
    },
    {
      href: "/citizen/contacts",
      icon: Users,
      labelKey: "citizen.section.contacts",
      descKey: "citizen.home.contactsDesc",
      meta: t("citizen.home.contactsCount", { count: contacts.length }),
    },
    {
      href: "/citizen/safety",
      icon: ShieldCheck,
      labelKey: "citizen.section.safetyCenter",
      descKey: "citizen.home.safetyDesc",
    },
  ];

  return (
    <PageContainer width="wide">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight sm:text-3xl">
            {greeting}
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-base text-muted-foreground">
            <MapPin aria-hidden className="size-4 shrink-0" />
            {citizen.area}, {citizen.city}
          </p>
        </div>
        <p
          role="status"
          className="flex h-10 items-center gap-2.5 rounded-full border border-border bg-card pr-1.5 pl-4 text-sm shadow-card"
        >
          <span className="text-muted-foreground">
            {t("citizen.safetyStatus")}
          </span>
          {active ? (
            <ToneChip
              tone={active.silent ? "neutral" : "critical"}
              size="md"
              dot
            >
              {t("citizen.safetyStatus.active")}
            </ToneChip>
          ) : (
            <ToneChip tone="resolved" size="md" dot>
              {t("citizen.safetyStatus.normal")}
            </ToneChip>
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-6">
          {active ? (
            <ActiveEmergencyCard incident={active} />
          ) : (
            <section
              aria-labelledby="emergency-title"
              className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7"
            >
              <div className="grid items-center gap-x-8 gap-y-6 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0 text-center md:text-left">
                  <h2
                    id="emergency-title"
                    className="text-3xl font-semibold tracking-tight sm:text-4xl"
                  >
                    {t("citizen.emergency.title")}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-muted-foreground md:mx-0">
                    {t(
                      shareLive
                        ? "citizen.emergency.body"
                        : "citizen.emergency.bodyNoLocation",
                    )}
                  </p>
                  {offline && (
                    <p
                      role="status"
                      className="mt-3 flex items-start gap-2.5 rounded-xl bg-medium-soft px-3.5 py-3 text-left text-sm leading-snug font-medium text-medium-fg"
                    >
                      <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0" />
                      {t("citizen.sos.queuedBody")}
                    </p>
                  )}
                  {!shareLive && (
                    <Link
                      href="/citizen/privacy"
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-medium-soft px-3.5 text-sm font-medium text-medium-fg hover:underline"
                    >
                      <MapPinOff aria-hidden className="size-4 shrink-0" />
                      {t("citizen.sos.sharingOff")}
                      <ChevronRight aria-hidden className="size-4 shrink-0" />
                    </Link>
                  )}
                </div>

                <SosHoldButton
                  size="lg"
                  busy={pending}
                  onConfirm={() => void raise()}
                  className="md:col-start-2 md:row-span-2 md:row-start-1"
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center md:col-start-1 md:row-start-2 md:justify-start">
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
              </div>
            </section>
          )}

          <section aria-labelledby="quick-title">
            <h2 id="quick-title" className="text-lg font-semibold">
              {t("citizen.home.quickTitle")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("citizen.home.quickHint")}
            </p>
            <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3 md:grid-cols-6 lg:grid-cols-3 2xl:grid-cols-6">
              {QUICK_HELP.map((help) => (
                <li key={help.key} className="flex">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => openQuick(help)}
                    className={tileClass}
                  >
                    <QuickTile icon={help.icon} label={t(help.labelKey)} />
                  </button>
                </li>
              ))}
              <li className="flex">
                <Link href="/citizen/report" className={tileClass}>
                  <QuickTile icon={FilePen} label={t("citizen.quick.report")} />
                </Link>
              </li>
            </ul>
          </section>
        </div>

        <section aria-labelledby="tools-title" className="min-w-0">
          <h2 id="tools-title" className="text-lg font-semibold">
            {t("citizen.home.toolsTitle")}
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 lg:gap-0 lg:divide-y lg:divide-border/70 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:shadow-card">
            {entries.map((entry) => (
              <li key={entry.href} className="flex">
                <Link
                  href={entry.href}
                  className="flex min-h-18 w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-muted lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                    <entry.icon aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-medium">
                      {t(entry.labelKey)}
                      {entry.meta && (
                        <ToneChip tone="neutral" className="tnum">
                          {entry.meta}
                        </ToneChip>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                      {t(entry.descKey)}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-5 shrink-0 text-subtle"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <SosConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}
        silent={confirm.silent}
        shareLive={shareLive}
        onConfirm={() => void raise({ silent: confirm.silent })}
      />
      <QuickHelpSheet
        help={quick}
        citizen={citizen}
        shareLive={shareLive}
        pending={pending}
        onOpenChange={(open) => !open && setQuick(null)}
        onConfirm={(help, note) =>
          void raise({ categoryId: help.categoryId, note })
        }
      />
    </PageContainer>
  );
}

export function HomeScreen() {
  const { citizen } = useSession();
  if (!citizen)
    return (
      <RestrictedState description="This screen is for the citizen app. Switch to a citizen from the demo role menu." />
    );
  return <Home citizen={citizen} />;
}
