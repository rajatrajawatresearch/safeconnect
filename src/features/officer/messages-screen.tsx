"use client";

import {
  ArrowLeft,
  Eye,
  Headset,
  MessageSquare,
  PhoneOff,
  UserRound,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ChatThread } from "@/components/shared/chat-thread";
import {
  BlankState,
  EmptyState,
  RestrictedState,
} from "@/components/shared/states";
import { StatusChip, ToneChip } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMd } from "@/hooks/use-mounted";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import type { Incident, Message } from "@/types";
import {
  CITIZEN_QUICK_REPLIES,
  CONTROL_QUICK_REPLIES,
} from "./assignment-dialogs";
import { NoUnitState } from "./officer-ui";
import { isOpenIncident, useOfficer } from "./use-officer";

interface Conversation {
  incident: Incident;
  last: Message | undefined;
  count: number;
  at: number;
}

type Channel = "internal" | "citizen";

/* ───────────────────────── One conversation ───────────────────────── */

function ConversationPanel({
  incident,
  onBack,
}: {
  incident: Incident;
  /** Phones only: return to the list. */
  onBack?: () => void;
}) {
  const t = useT();
  const { can } = useSession();
  const [channel, setChannel] = useState<Channel>("internal");
  const open = isOpenIncident(incident);
  const reachable = Boolean(incident.citizenId);

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
        {onBack && (
          <Button
            variant="ghost"
            size="icon-xl"
            className="-ml-1.5"
            aria-label="Back to conversations"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold">
            {incident.title}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            <span className="tnum font-mono">{incident.id}</span> ·{" "}
            {incident.location.area}
          </p>
        </div>
        <StatusChip status={incident.status} />
      </header>

      <Tabs
        value={channel}
        onValueChange={(value) => setChannel(value as Channel)}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="shrink-0 border-b border-border/70 px-3 py-2 sm:px-4">
          <TabsList
            aria-label="Conversation"
            className="w-full group-data-horizontal/tabs:h-11"
          >
            <TabsTrigger value="internal" className="text-sm">
              <Headset aria-hidden />
              {t("officer.tab.controlRoom")}
            </TabsTrigger>
            <TabsTrigger value="citizen" className="text-sm">
              <UserRound aria-hidden />
              {t("officer.tab.citizen")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="internal" className="flex min-h-0 flex-col">
          {can("communication.internal") ? (
            <ChatThread
              incidentId={incident.id}
              channel="internal"
              quickReplies={open ? CONTROL_QUICK_REPLIES : undefined}
              placeholder="Message the control room…"
              className="min-h-0 flex-1"
            />
          ) : (
            <RestrictedState description="Your role does not include internal communication." />
          )}
        </TabsContent>

        <TabsContent value="citizen" className="flex min-h-0 flex-col">
          {can("communication.citizen") ? (
            <>
              <p className="flex shrink-0 items-center gap-1.5 border-b border-normal/35 bg-normal-soft px-3 py-1.5 text-xs font-medium text-normal-fg">
                <Eye aria-hidden className="size-3.5 shrink-0" />
                <span className="min-w-0">
                  The citizen reads this thread
                  {!incident.anonymous && ` · ${incident.reporterName}`}
                </span>
              </p>
              {incident.silent && open && (
                <p
                  role="note"
                  className="flex shrink-0 items-center gap-1.5 bg-high-soft px-3 py-1.5 text-xs font-medium text-high-fg"
                >
                  <PhoneOff aria-hidden className="size-3.5 shrink-0" />
                  {t("officer.chatOnly")}
                </p>
              )}
              <ChatThread
                incidentId={incident.id}
                channel="citizen"
                quickReplies={
                  open && reachable ? CITIZEN_QUICK_REPLIES : undefined
                }
                disabled={!open || !reachable}
                disabledReason={
                  !reachable
                    ? "No in-app contact for this reporter."
                    : "This incident is closed. The conversation is read-only."
                }
                className="min-h-0 flex-1"
              />
            </>
          ) : (
            <RestrictedState description="Your role does not include citizen communication." />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ───────────────────────── Screen ───────────────────────── */

function MessagesContent() {
  const t = useT();
  const params = useSearchParams();
  const isMd = useIsMd();
  const { work, persona } = useOfficer();
  const messages = useDemoStore((s) => s.messages);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    params.get("id"),
  );

  const conversations = useMemo<Conversation[]>(() => {
    return work.history
      .map((incident) => {
        let last: Message | undefined;
        let count = 0;
        for (const m of messages) {
          if (m.incidentId !== incident.id) continue;
          count += 1;
          if (!last || m.at >= last.at) last = m;
        }
        return { incident, last, count, at: last?.at ?? incident.createdAt };
      })
      .sort(
        (a, b) =>
          Number(isOpenIncident(b.incident)) -
            Number(isOpenIncident(a.incident)) || b.at - a.at,
      );
  }, [work.history, messages]);

  // Tablets and up always show a thread; phones show the list until one is chosen.
  const shownId =
    selectedId ?? (isMd ? (conversations[0]?.incident.id ?? null) : null);
  const current = conversations.find((c) => c.incident.id === shownId);
  const showList = isMd || !current;

  const preview = (m: Message) => {
    const who =
      m.senderRole === "system"
        ? null
        : m.senderName.startsWith(persona.name)
          ? "You"
          : m.senderName.split(" · ")[0];
    return who ? `${who}: ${m.text}` : m.text;
  };

  return (
    <div className="flex h-full min-h-0">
      {showList && (
        <section
          aria-labelledby="messages-title"
          className="flex min-w-0 flex-1 flex-col md:w-[20rem] md:flex-none md:border-r md:border-border lg:w-[22rem] xl:w-[24rem]"
        >
          <header className="shrink-0 px-4 pt-5 pb-3 sm:px-6 md:px-5">
            <h1
              id="messages-title"
              className="text-2xl font-semibold tracking-tight"
            >
              {t("officer.messages")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Threads on the incidents your unit is assigned to.
            </p>
          </header>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6 md:px-5">
            {conversations.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="A thread with the control room and one with the citizen open when your unit is assigned to an incident."
              />
            ) : (
              <ul className="grid gap-2.5">
                {conversations.map(({ incident, last, count }) => {
                  const selected = isMd && incident.id === shownId;
                  return (
                    <li key={incident.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(incident.id)}
                        aria-pressed={selected}
                        className={cn(
                          "block w-full rounded-2xl border bg-card px-4 py-3.5 text-left transition-colors hover:border-input hover:bg-muted/50",
                          selected
                            ? "border-primary/60 bg-accent/60"
                            : "border-border",
                        )}
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[15px] font-semibold">
                            {incident.title}
                          </span>
                          {last && (
                            <RelativeTime
                              at={last.at}
                              className="shrink-0 text-xs text-muted-foreground"
                            />
                          )}
                        </span>
                        <span className="tnum mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                          {incident.id}
                        </span>
                        <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-muted-foreground">
                          {last ? preview(last) : "No messages yet."}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StatusChip status={incident.status} />
                          {last && (
                            <ToneChip
                              tone={
                                last.channel === "internal"
                                  ? "medium"
                                  : "normal"
                              }
                              variant="outline"
                            >
                              {last.channel === "internal"
                                ? t("officer.tab.controlRoom")
                                : t("officer.tab.citizen")}
                            </ToneChip>
                          )}
                          <span className="tnum ml-auto text-xs text-muted-foreground">
                            {count} {count === 1 ? "message" : "messages"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {(isMd || current) && (
        <section
          aria-label={
            current
              ? `Conversation on ${current.incident.title}`
              : "Conversation"
          }
          className="flex min-w-0 flex-1 flex-col bg-card"
        >
          {current ? (
            <ConversationPanel
              key={current.incident.id}
              incident={current.incident}
              onBack={isMd ? undefined : () => setSelectedId(null)}
            />
          ) : (
            <div className="grid h-full place-items-center">
              <BlankState
                icon={MessageSquare}
                title="No conversation selected"
                description="Choose an incident to open its two threads."
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** `/officer/messages` — control room and citizen threads for the unit's incidents. */
export function OfficerMessagesScreen() {
  const { unit, unitId } = useOfficer();
  if (!unit || !unitId) return <NoUnitState />;
  return <MessagesContent />;
}
