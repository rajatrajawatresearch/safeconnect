"use client";

import {
  Eye,
  EyeOff,
  Inbox,
  MessageSquareText,
  MessagesSquare,
  Phone,
  SearchX,
  Video,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { ChatThread } from "@/components/shared/chat-thread";
import { BlankState, EmptyState } from "@/components/shared/states";
import { SeverityDot, ToneChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EscalateDialog } from "@/features/escalations/escalate-dialog";
import { SearchField, Segmented } from "@/features/evidence/filters";
import { useUrlParam } from "@/features/evidence/use-url-param";
import { useIncidents } from "@/hooks/use-demo-data";
import { useIsLg } from "@/hooks/use-mounted";
import { useSession } from "@/hooks/use-session";
import { useDemoStore } from "@/stores/demo-store";
import type { Incident, SessionType } from "@/types";
import { SessionTab, type CallState } from "./session-tab";
import { ConversationSplit, IncidentHeader, ThreadRow } from "./thread-parts";
import {
  isActiveIncident,
  isAppLinked,
  useThreads,
  type Thread,
} from "./use-threads";

type TabKey = "voice" | "video" | "chat" | "internal";
type ListFilter = "all" | "reply" | "live";

const QUICK_REPLIES = [
  "Help is on the way. Stay where you are if it is safe.",
  "A response unit has been assigned.",
  "Are you in a safe place right now?",
  "Can you tell me what you can see around you?",
  "I am staying with you on this chat.",
];

/** A silent SOS means the citizen cannot talk; the replies never ask them to. */
const SILENT_QUICK_REPLIES = [
  "You do not need to speak. Type when you can.",
  "Help is on the way. Stay where you are if it is safe.",
  "Send 1 if you are safe for now, 2 if you need help immediately.",
  "Keep your phone silent. I am watching this chat.",
];

const isSilent = (incident: Incident) =>
  Boolean(incident.silent) || incident.source === "silent_sos";

function preview(thread: Thread): ReactNode {
  const message = thread.last;
  if (!message)
    return isSilent(thread.incident)
      ? "Silent SOS. No messages yet. Start with chat."
      : "No messages yet.";
  if (message.senderRole === "system") return message.text;
  return (
    <>
      {message.channel === "internal" && (
        <span className="mr-1.5 rounded border border-dashed border-medium/60 px-1 py-px text-[11px] font-medium text-medium-fg">
          Internal
        </span>
      )}
      <span className="font-medium text-foreground">
        {message.senderName.split(" · ")[0]}:
      </span>{" "}
      {message.text}
    </>
  );
}

function badges(thread: Thread): ReactNode {
  const silent = isSilent(thread.incident);
  if (!thread.live && !thread.needsReply && !silent) return null;
  return (
    <>
      {thread.live && (
        <ToneChip tone="resolved">
          <SeverityDot tone="resolved" pulse />
          {thread.live.type === "video" ? "Video live" : "Voice live"}
        </ToneChip>
      )}
      {thread.needsReply && (
        <ToneChip tone="high" dot>
          Awaiting reply
        </ToneChip>
      )}
      {silent && (
        <ToneChip tone="neutral" variant="outline">
          Silent SOS
        </ToneChip>
      )}
    </>
  );
}

/** Marks everything the citizen can see or hear. The internal tab is drawn differently on purpose. */
function CitizenBand({ children }: { children: ReactNode }) {
  return (
    <p className="flex shrink-0 items-center gap-1.5 border-b border-normal/35 bg-normal-soft px-3 py-1.5 text-xs font-medium text-normal-fg sm:px-4">
      <Eye aria-hidden className="size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function Conversation({
  incident,
  thread,
  tab,
  onTabChange,
  onBack,
}: {
  incident: Incident;
  thread: Thread | undefined;
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onBack: () => void;
}) {
  const { can } = useSession();
  const sessions = useDemoStore((s) => s.sessions);
  const [call, setCall] = useState<CallState | null>(null);
  const [escalating, setEscalating] = useState(false);

  // The session this console opened is over once the store marks it ended (by either side, or
  // because the incident was resolved). Until the session record exists it is still connecting.
  const opened = call
    ? sessions.find(
        (s) => s.incidentId === incident.id && s.startedAt >= call.openedAt,
      )
    : undefined;
  const activeCall = call && opened?.status !== "ended" ? call : null;

  const start = (type: SessionType) => {
    setCall({ type, openedAt: Date.now() });
    onTabChange(type);
  };

  const open = isActiveIncident(incident);
  const silent = isSilent(incident);
  const name = incident.reporterName;
  // Reachable when the incident came from the app, or the citizen is already talking to us.
  const hasCitizen =
    !incident.anonymous &&
    (isAppLinked(incident) || (thread?.citizenCount ?? 0) > 0);

  const chatBlocked = !hasCitizen
    ? incident.anonymous
      ? "The source is anonymous. There is no one to message."
      : "No citizen app session is linked to this incident."
    : !open
      ? "This incident is no longer open. The conversation is kept for the record."
      : !can("communication.citizen")
        ? "Your role can read this conversation but cannot message the citizen."
        : null;
  const notesBlocked = can("communication.internal")
    ? null
    : "Your role cannot add internal notes.";

  const sessionProps = {
    incident,
    linked: hasCitizen,
    call: activeCall,
    onStart: start,
    onEnd: () => setCall(null),
    onOpenChat: () => onTabChange("chat"),
    onEscalate: can("incident.escalate")
      ? () => setEscalating(true)
      : undefined,
  };
  const sessionBand = !hasCitizen
    ? "Citizen channel. Nobody is connected to it on this incident."
    : silent
      ? "Citizen-visible channel. Voice and video stay off for a silent SOS."
      : `Citizen-visible. ${name} sees and hears everything in a session.`;

  return (
    <>
      <IncidentHeader incident={incident} onBack={onBack} />
      <Tabs
        value={tab}
        onValueChange={(next) => onTabChange(next as TabKey)}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="no-scrollbar shrink-0 overflow-x-auto border-b border-border/70 bg-card px-3 py-2 sm:px-4">
          <TabsList
            aria-label="Communication channels"
            className="group-data-horizontal/tabs:h-9"
          >
            <TabsTrigger value="voice" className="flex-none px-2.5 sm:px-3">
              <Phone aria-hidden className="hidden sm:block" /> Voice
              {thread?.live?.type === "voice" && (
                <SeverityDot tone="resolved" pulse />
              )}
            </TabsTrigger>
            <TabsTrigger value="video" className="flex-none px-2.5 sm:px-3">
              <Video aria-hidden className="hidden sm:block" /> Video
              {thread?.live?.type === "video" && (
                <SeverityDot tone="resolved" pulse />
              )}
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex-none px-2.5 sm:px-3">
              <MessageSquareText aria-hidden className="hidden sm:block" /> Chat
              {thread?.needsReply && (
                <>
                  <SeverityDot tone="high" />
                  <span className="sr-only">, awaiting reply</span>
                </>
              )}
            </TabsTrigger>
            <span aria-hidden className="mx-1.5 h-4 w-px shrink-0 bg-input" />
            <TabsTrigger
              value="internal"
              className="flex-none px-2.5 data-active:bg-medium-soft data-active:text-medium-fg sm:px-3 dark:data-active:bg-medium-soft dark:data-active:text-medium-fg"
            >
              <EyeOff aria-hidden className="hidden sm:block" /> Internal notes
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="relative min-h-0 flex-1">
          <TabsContent
            value="voice"
            forceMount
            className="absolute inset-0 flex flex-col data-[state=inactive]:hidden"
          >
            <CitizenBand>{sessionBand}</CitizenBand>
            <SessionTab type="voice" {...sessionProps} />
          </TabsContent>

          <TabsContent
            value="video"
            forceMount
            className="absolute inset-0 flex flex-col data-[state=inactive]:hidden"
          >
            <CitizenBand>{sessionBand}</CitizenBand>
            <SessionTab type="video" {...sessionProps} />
          </TabsContent>

          <TabsContent
            value="chat"
            className="absolute inset-0 flex flex-col bg-card"
          >
            <CitizenBand>
              {hasCitizen
                ? `Citizen-visible. ${name} reads every message sent here.`
                : "Citizen channel. Nobody is connected to it on this incident."}
            </CitizenBand>
            <ChatThread
              incidentId={incident.id}
              channel="citizen"
              quickReplies={silent ? SILENT_QUICK_REPLIES : QUICK_REPLIES}
              placeholder={
                silent
                  ? "Write a message. The citizen can only type…"
                  : `Write to ${name.split(" ")[0]}…`
              }
              disabled={Boolean(chatBlocked)}
              disabledReason={chatBlocked ?? undefined}
              className="min-h-0 flex-1"
            />
          </TabsContent>

          <TabsContent
            value="internal"
            className="absolute inset-0 flex flex-col p-2 sm:p-3"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-2 border-dashed border-medium/50 bg-inset">
              <ChatThread
                incidentId={incident.id}
                channel="internal"
                placeholder="Add an internal note for staff…"
                disabled={Boolean(notesBlocked)}
                disabledReason={notesBlocked ?? undefined}
                className="min-h-0 flex-1"
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {escalating && (
        <EscalateDialog
          incident={incident}
          onClose={() => setEscalating(false)}
        />
      )}
    </>
  );
}

export function CommunicationsScreen() {
  const threads = useThreads();
  const incidents = useIncidents();
  const isLg = useIsLg();
  const [selectedId, setSelectedId] = useUrlParam("id");
  const [tab, setTab] = useState<TabKey>("chat");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");

  // Incidents a citizen can be reached on, plus anything that already has a conversation.
  const listed = useMemo(
    () =>
      threads.filter(
        (t) =>
          (isActiveIncident(t.incident) && isAppLinked(t.incident)) ||
          t.citizenCount + t.internalCount > 0 ||
          Boolean(t.live),
      ),
    [threads],
  );

  // On wide screens something is always open. It is chosen once so that new activity
  // reordering the list never swaps the conversation under the operator.
  const [fallbackId] = useState(() => listed[0]?.incident.id ?? null);
  const activeId = selectedId ?? (isLg ? fallbackId : null);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return listed.filter((t) => {
      if (filter === "reply" && !t.needsReply) return false;
      if (filter === "live" && !t.live) return false;
      if (!term) return true;
      const i = t.incident;
      return `${i.id} ${i.title} ${i.location.area} ${i.reporterName}`
        .toLowerCase()
        .includes(term);
    });
  }, [listed, query, filter]);

  const counts = useMemo(
    () => ({
      reply: listed.filter((t) => t.needsReply).length,
      live: listed.filter((t) => t.live).length,
    }),
    [listed],
  );

  const incident = activeId
    ? incidents.find((i) => i.id === activeId)
    : undefined;
  const thread = activeId
    ? threads.find((t) => t.incident.id === activeId)
    : undefined;

  const list = (
    <>
      <div className="shrink-0 border-b border-border/70 px-4 pt-4 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Communication centre
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Voice, video and chat with citizens, one incident at a time.
        </p>
        <SearchField
          value={query}
          onChange={setQuery}
          label="Search conversations"
          placeholder="Search incident, area or name"
          className="mt-3"
        />
        <Segmented
          label="Show"
          value={filter}
          onChange={setFilter}
          stretch
          className="mt-2"
          options={[
            { value: "all", label: "All", count: listed.length },
            { value: "reply", label: "Needs reply", count: counts.reply },
            { value: "live", label: "Live", count: counts.live },
          ]}
        />
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {listed.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No conversations right now"
            description="Incidents raised from the citizen app appear here the moment they arrive."
          />
        ) : visible.length === 0 ? (
          <BlankState
            icon={SearchX}
            compact
            title={
              filter === "reply"
                ? "Nobody is waiting for a reply"
                : filter === "live"
                  ? "No session is live"
                  : "No conversation matches"
            }
            description={
              query.trim()
                ? "Try a different incident ID, area or name."
                : "Switch to All to see every conversation."
            }
          />
        ) : (
          <ul aria-label="Conversations">
            {visible.map((t) => (
              <li key={t.incident.id}>
                <ThreadRow
                  incident={t.incident}
                  at={t.activityAt}
                  preview={preview(t)}
                  badges={badges(t)}
                  selected={t.incident.id === activeId}
                  onSelect={() => setSelectedId(t.incident.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  const detail = incident ? (
    <Conversation
      key={incident.id}
      incident={incident}
      thread={thread}
      tab={tab}
      onTabChange={setTab}
      onBack={() => setSelectedId(null)}
    />
  ) : (
    <div className="grid flex-1 place-items-center">
      <BlankState
        icon={MessagesSquare}
        title={
          activeId ? "No incident has this reference" : "Choose a conversation"
        }
        description={
          activeId
            ? "It may belong to an earlier demonstration session. Pick a conversation from the list."
            : "Pick an incident from the list to talk to the citizen or leave a note for staff."
        }
        action={
          selectedId && (
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              Back to the list
            </Button>
          )
        }
      />
    </div>
  );

  return (
    <ConversationSplit
      list={list}
      detail={detail}
      showDetail={Boolean(selectedId)}
    />
  );
}
