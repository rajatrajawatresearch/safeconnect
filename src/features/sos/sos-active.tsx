"use client";

import {
  ChevronRight,
  EyeOff,
  MapPin,
  MapPinOff,
  MessageSquareText,
  Paperclip,
  Phone,
  ShieldCheck,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChatThread } from "@/components/shared/chat-thread";
import { ConnectivityIndicator } from "@/components/layout/top-controls";
import { OpsMap } from "@/components/shared/ops-map";
import { SecureSession } from "@/components/shared/secure-session";
import { SeverityDot } from "@/components/shared/status-chips";
import { EtaCountdown } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { joinNames, useSosContacts } from "@/features/citizen/use-citizen-data";
import { useAction } from "@/hooks/use-action";
import {
  useCategoryLookup,
  useIncidentEvidence,
  useIncidentMessages,
  useLiveSession,
  useUnit,
  useUnits,
} from "@/hooks/use-demo-data";
import { useIsLg, useIsMd } from "@/hooks/use-mounted";
import { useSession } from "@/hooks/use-session";
import { useLanguage, useT } from "@/hooks/use-t";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { CancelKind } from "@/stores/demo-store";
import type { Citizen, Incident, SessionType } from "@/types";
import { CancelSosDialog } from "./cancel-sos-dialog";
import { ShareMediaSheet, TrustedContactSheet } from "./sos-sheets";
import { useSosUi } from "./sos-ui-store";
import { IncidentStatusLabel, UnitProgressLabel } from "./status-label";
import { StatusStepper, primaryAssignment } from "./status-stepper";

/** Sent on the citizen's behalf from the session screen. Staff consoles read English. */
const WORSE_MESSAGE = "The situation is getting worse";

const card = "rounded-2xl border border-border bg-card shadow-card";

function ActionButton({
  icon: Icon,
  label,
  primary,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={primary ? "default" : "outline"}
      onClick={onClick}
      className="h-auto min-h-[4.75rem] min-w-0 flex-col gap-1.5 rounded-2xl px-2 py-3 text-[15px] font-semibold whitespace-normal"
    >
      <Icon aria-hidden className="size-6" />
      {label}
    </Button>
  );
}

/** "Unit GJ-AHD-17", with the call sign kept on one line however narrow the tile is. */
function UnitName({ callSign }: { callSign: string }) {
  const t = useT();
  const [before, after] = t("citizen.sos.unit", { callSign: "\u0001" }).split(
    "\u0001",
  );
  return (
    <>
      {before}
      <span className="whitespace-nowrap">{callSign}</span>
      {after}
    </>
  );
}

function RowButton({
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="flex min-h-16 w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-muted"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">{title}</span>
        <span className="line-clamp-2 text-sm leading-snug text-muted-foreground">
          {detail}
        </span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-subtle" />
    </button>
  );
}

/**
 * The emergency in progress, as the citizen sees it: who is helping, how far away they are, what
 * has happened so far, and every way to reach the control room. All of it is read live from the
 * incident record, so the screen moves as the control room and the unit act.
 */
export function SosActive({
  incident,
  citizen,
}: {
  incident: Incident;
  citizen: Citizen;
}) {
  const t = useT();
  const language = useLanguage();
  const { actor, persona } = useSession();
  const isMd = useIsMd();
  const isLg = useIsLg();
  const units = useUnits();
  const category = useCategoryLookup()(incident.categoryId);
  const assignment = primaryAssignment(incident);
  const unit = useUnit(assignment?.unitId);
  const live = useLiveSession(incident.id);
  const messages = useIncidentMessages(incident.id, "citizen");
  const evidence = useIncidentEvidence(incident.id);
  const { contacts, allowed: contactsAllowed } = useSosContacts(citizen.id);
  const setDiscreet = useSosUi((s) => s.setDiscreet);

  const [session, setSession] = useState<SessionType | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [ending, setEnding] = useState<{
    open: boolean;
    kind: CancelKind | null;
  }>({ open: false, kind: null });

  const worse = useAction(services.communication.sendMessage, {
    success: t("citizen.sos.worseToast"),
  });

  // A session this citizen started must not stay "live" once its screen has gone
  // (closed with Escape, or left by navigating away mid-call).
  useEffect(() => {
    if (!session && live && live.startedBy.id === actor.id)
      void services.communication.endSession(live.id, actor);
  }, [session, live, actor]);

  const assignedUnits = useMemo(() => {
    const ids = new Set(
      incident.assignments
        .filter((a) => a.response !== "rejected")
        .map((a) => a.unitId),
    );
    return units.filter((u) => ids.has(u.id));
  }, [units, incident.assignments]);
  const mapIncidents = useMemo(() => [incident], [incident]);
  const focus = useMemo(
    () => [incident.location, ...assignedUnits.map((u) => u.position)],
    [incident.location, assignedUnits],
  );

  const arrived = incident.status === "on_scene";
  const enRoute = incident.status === "en_route";
  const operator = incident.operatorName?.split(" ")[0];
  const sharingLive = incident.location.source === "device_emergency";
  const sharedCount = evidence.filter((e) => e.source === "citizen").length;
  const lastReply = [...messages]
    .reverse()
    .find((m) => m.senderRole !== "citizen" && m.senderRole !== "system");

  const quickReplies = [
    t("citizen.sos.reply.safeForNow"),
    t("citizen.sos.reply.stillHere"),
    t("citizen.sos.reply.cannotTalk"),
    t("citizen.sos.reply.moved"),
  ];

  const chatInputId = `chat-${incident.id}-citizen`;
  const openChat = () => {
    if (isLg) document.getElementById(chatInputId)?.focus();
    else setChatOpen(true);
  };

  const chatSubtitle = operator
    ? t("citizen.sos.chatWith", { name: operator })
    : t("citizen.sos.connecting");
  const chat = (
    <ChatThread
      incidentId={incident.id}
      channel="citizen"
      quickReplies={quickReplies}
      placeholder={t("citizen.sos.chatPlaceholder")}
      className="min-h-0 flex-1"
    />
  );

  return (
    <div className="flex h-full min-h-0">
      <div className="scroll-thin @container flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <header
            className={cn(
              "rounded-3xl border p-4 sm:p-6",
              arrived
                ? "border-resolved/35 bg-resolved-soft"
                : "border-critical/35 bg-critical-soft",
            )}
          >
            <div className="flex items-start gap-3.5">
              <SeverityDot
                tone={arrived ? "resolved" : "critical"}
                pulse={!arrived}
                className="mt-3 sm:mt-3.5"
              />
              <div className="min-w-0 flex-1">
                <h1
                  className={cn(
                    "text-2xl leading-tight font-semibold tracking-tight sm:text-3xl",
                    arrived ? "text-resolved-fg" : "text-critical-fg",
                  )}
                >
                  {t("citizen.sos.active")}
                </h1>
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-1 text-lg leading-snug font-medium sm:text-xl"
                >
                  {t(
                    arrived
                      ? "citizen.sos.helpArrived"
                      : enRoute
                        ? "citizen.sos.onTheWay"
                        : "citizen.sos.coordinating",
                  )}
                </p>
              </div>
              <ConnectivityIndicator className="hidden bg-card sm:inline-flex" />
              <ConnectivityIndicator compact className="bg-card sm:hidden" />
            </div>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div className="min-w-0">
                <dt className="text-muted-foreground">
                  {t("citizen.sos.incidentId")}
                </dt>
                <dd className="mt-0.5 truncate font-mono font-medium">
                  {incident.id}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {t("citizen.sos.raisedAt")}
                </dt>
                <dd className="tnum mt-0.5 font-mono font-medium">
                  <time dateTime={new Date(incident.createdAt).toISOString()}>
                    {formatTime(incident.createdAt)}
                  </time>
                </dd>
              </div>
              {category && (
                <div className="min-w-0">
                  <dt className="text-muted-foreground">
                    {t("citizen.sos.kind")}
                  </dt>
                  <dd className="mt-0.5 truncate font-medium">
                    {category.short}
                  </dd>
                </div>
              )}
            </dl>
          </header>

          <div className="mt-4 flex flex-col gap-4 @min-[40rem]:grid @min-[40rem]:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] @min-[40rem]:items-start @min-[40rem]:gap-5">
            <div className="contents @min-[40rem]:flex @min-[40rem]:min-w-0 @min-[40rem]:flex-col @min-[40rem]:gap-5">
              <section
                aria-label={t("citizen.sos.mapLabel")}
                className={cn(card, "order-2 overflow-hidden")}
              >
                <OpsMap
                  className="h-56 sm:h-64 @min-[40rem]:h-80"
                  me={incident.location}
                  incidents={mapIncidents}
                  units={assignedUnits}
                  focus={focus}
                  label={t("citizen.sos.mapLabel")}
                />
                <p className="flex items-start gap-2.5 border-t border-border/70 px-4 py-3 text-sm">
                  {sharingLive ? (
                    <MapPin
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-resolved-fg"
                    />
                  ) : (
                    <MapPinOff
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-medium-fg"
                    />
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {t(
                        sharingLive
                          ? "citizen.locationShared"
                          : "citizen.sos.areaShared",
                      )}
                    </span>
                    <span className="block text-muted-foreground">
                      {incident.location.address}
                    </span>
                  </span>
                </p>
              </section>

              <div className="order-3 grid grid-cols-3 gap-2.5">
                <ActionButton
                  icon={Phone}
                  label={t("citizen.sos.voice")}
                  onClick={() => setSession("voice")}
                />
                <ActionButton
                  icon={Video}
                  label={t("citizen.sos.video")}
                  onClick={() => setSession("video")}
                />
                <ActionButton
                  icon={MessageSquareText}
                  label={t("citizen.sos.chat")}
                  primary
                  onClick={openChat}
                />
              </div>

              {!isLg && lastReply && (
                <button
                  type="button"
                  onClick={openChat}
                  aria-haspopup="dialog"
                  className={cn(
                    card,
                    "order-3 flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted",
                  )}
                >
                  <MessageSquareText
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-muted-foreground">
                      {lastReply.senderName} ·{" "}
                      <span className="tnum">{formatTime(lastReply.at)}</span>
                    </span>
                    <span className="line-clamp-2 text-base">
                      {lastReply.text}
                    </span>
                  </span>
                </button>
              )}

              <section
                aria-label={t("citizen.sos.more")}
                className={cn(
                  card,
                  "order-5 divide-y divide-border/70 overflow-hidden",
                )}
              >
                <RowButton
                  icon={Paperclip}
                  title={t("citizen.sos.shareMedia")}
                  detail={
                    sharedCount > 0
                      ? t("citizen.sos.sharedCount", { count: sharedCount })
                      : t("citizen.sos.shareMediaHint")
                  }
                  onClick={() => setMediaOpen(true)}
                />
                <RowButton
                  icon={Users}
                  title={t("citizen.sos.trustedContact")}
                  detail={
                    !contactsAllowed
                      ? t("citizen.sos.contactsOffShort")
                      : contacts.length > 0
                        ? t("citizen.sos.contactsTold", {
                            names: joinNames(contacts, language),
                          })
                        : t("citizen.sos.contactsNoneShort")
                  }
                  onClick={() => setContactsOpen(true)}
                />
                <label
                  htmlFor="sos-silent-mode"
                  className="flex min-h-16 cursor-pointer items-center gap-3.5 px-4 py-3"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
                    <EyeOff aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium">
                      {t("citizen.sos.silentMode")}
                    </span>
                    <span className="block text-sm leading-snug text-muted-foreground">
                      {t("citizen.sos.silentModeBody")}
                    </span>
                  </span>
                  <Switch
                    id="sos-silent-mode"
                    checked={false}
                    onCheckedChange={(on) => setDiscreet(incident.id, on)}
                  />
                </label>
              </section>
            </div>

            <div className="contents @min-[40rem]:flex @min-[40rem]:min-w-0 @min-[40rem]:flex-col @min-[40rem]:gap-5">
              <dl className="order-1 grid grid-cols-2 gap-3">
                <div className={cn(card, "col-span-2 p-4 sm:p-5")}>
                  <dt className="text-sm text-muted-foreground">
                    {t("citizen.sos.eta")}
                  </dt>
                  <dd className="mt-1 flex items-end justify-between gap-4">
                    {arrived ? (
                      <span className="text-3xl font-semibold tracking-tight text-resolved-fg">
                        {t("citizen.sos.arrived")}
                      </span>
                    ) : enRoute ? (
                      <EtaCountdown
                        at={incident.etaAt}
                        arrivingLabel={t("citizen.sos.arriving")}
                        className="text-4xl leading-none font-semibold tracking-tight sm:text-5xl"
                      />
                    ) : assignment ? (
                      <span className="tnum text-3xl font-semibold tracking-tight">
                        {t("citizen.sos.etaAbout", { min: assignment.etaMin })}
                      </span>
                    ) : (
                      <span className="text-xl leading-tight font-semibold">
                        {t("citizen.sos.findingUnit")}
                      </span>
                    )}
                    <span className="max-w-[11rem] text-right text-sm leading-snug text-muted-foreground">
                      {arrived && incident.arrivedAt
                        ? formatTime(incident.arrivedAt)
                        : enRoute
                          ? t("citizen.sos.etaLive")
                          : assignment
                            ? t("citizen.sos.etaEstimate")
                            : t("citizen.sos.etaPending")}
                    </span>
                  </dd>
                </div>
                <div className={cn(card, "min-w-0 p-4")}>
                  <dt className="text-sm text-muted-foreground">
                    {t("citizen.sos.operator")}
                  </dt>
                  <dd className="mt-1">
                    <span className="block truncate text-xl font-semibold">
                      {operator ?? t("citizen.sos.connecting")}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {t("citizen.sos.controlRoom")}
                    </span>
                  </dd>
                </div>
                <div className={cn(card, "min-w-0 p-4")}>
                  <dt className="text-sm text-muted-foreground">
                    {t("citizen.sos.responder")}
                  </dt>
                  <dd className="mt-1">
                    <span className="block text-xl leading-tight font-semibold">
                      {unit ? (
                        <UnitName callSign={unit.callSign} />
                      ) : (
                        t("citizen.sos.responderPending")
                      )}
                    </span>
                    {unit && (
                      <span className="mt-1.5 block">
                        <UnitProgressLabel status={unit.status} />
                      </span>
                    )}
                  </dd>
                </div>
              </dl>

              <section
                aria-labelledby="sos-live-status"
                className={cn(card, "order-4 p-4 sm:p-5")}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 id="sos-live-status" className="text-lg font-semibold">
                    {t("citizen.sos.liveStatus")}
                  </h2>
                  <IncidentStatusLabel status={incident.status} size="md" />
                </div>
                <StatusStepper incident={incident} unit={unit} />
              </section>
            </div>
          </div>
        </div>

        <div className="pb-safe sticky bottom-0 z-10 border-t border-border bg-background">
          <div className="mx-auto flex w-full max-w-5xl gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Button
              variant="success"
              size="2xl"
              className="min-w-0 flex-1 px-3"
              onClick={() => setEnding({ open: true, kind: "safe" })}
            >
              <ShieldCheck aria-hidden className="max-[359px]:hidden" />
              {t("citizen.sos.iAmSafe")}
            </Button>
            <Button
              variant="outline"
              size="2xl"
              className="min-w-0 flex-1 px-3"
              onClick={() => setEnding({ open: true, kind: null })}
            >
              {t("citizen.sos.cancel")}
            </Button>
          </div>
        </div>
      </div>

      {isLg && (
        <aside
          aria-label={t("citizen.sos.chatTitle")}
          className="flex w-[340px] shrink-0 flex-col border-l border-border bg-card 2xl:w-[400px]"
        >
          <div className="border-b border-border/70 px-4 py-3">
            <h2 className="text-base font-semibold">
              {t("citizen.sos.chatTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{chatSubtitle}</p>
          </div>
          {chat}
        </aside>
      )}

      {!isLg &&
        (isMd ? (
          <Sheet open={chatOpen} onOpenChange={setChatOpen}>
            <SheetContent
              side="right"
              className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
            >
              <SheetHeader className="border-b border-border/70 pr-12">
                <SheetTitle>{t("citizen.sos.chatTitle")}</SheetTitle>
                <SheetDescription>{chatSubtitle}</SheetDescription>
              </SheetHeader>
              {chat}
            </SheetContent>
          </Sheet>
        ) : (
          <Drawer open={chatOpen} onOpenChange={setChatOpen}>
            <DrawerContent className="h-[80dvh] rounded-t-3xl">
              <DrawerHeader className="border-b border-border/70 px-4 pt-3 pb-3 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
                <DrawerTitle>{t("citizen.sos.chatTitle")}</DrawerTitle>
                <DrawerDescription>{chatSubtitle}</DrawerDescription>
              </DrawerHeader>
              {chat}
            </DrawerContent>
          </Drawer>
        ))}

      <Dialog
        open={session !== null}
        onOpenChange={(open) => !open && setSession(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="h-dvh w-screen max-w-none gap-0 overflow-hidden rounded-none p-0 ring-0 sm:max-w-none md:h-[min(46rem,88dvh)] md:w-[min(60rem,92vw)] md:rounded-3xl"
        >
          <DialogTitle className="sr-only">
            {t(
              session === "video"
                ? "citizen.sos.sessionVideo"
                : "citizen.sos.sessionVoice",
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("citizen.sos.sessionNote")}
          </DialogDescription>
          {session && (
            <SecureSession
              incident={incident}
              type={session}
              onEnd={() => setSession(null)}
              onEscalate={() =>
                void worse.run(
                  incident.id,
                  "citizen",
                  WORSE_MESSAGE,
                  actor,
                  persona.shortName,
                )
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <ShareMediaSheet
        incident={incident}
        open={mediaOpen}
        onOpenChange={setMediaOpen}
      />
      <TrustedContactSheet
        citizenId={citizen.id}
        open={contactsOpen}
        onOpenChange={setContactsOpen}
      />
      <CancelSosDialog
        incident={incident}
        open={ending.open}
        initialKind={ending.kind}
        onOpenChange={(open) => setEnding((e) => ({ ...e, open }))}
      />
    </div>
  );
}
