"use client";

import {
  ArrowUpRight,
  EyeOff,
  Megaphone,
  MessagesSquare,
  Plus,
  SearchX,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ChatThread } from "@/components/shared/chat-thread";
import { IncidentRow } from "@/components/shared/incident-row";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import {
  BlankState,
  EmptyState,
  RestrictedState,
} from "@/components/shared/states";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ROLE_LABEL } from "@/features/evidence/evidence-meta";
import { SearchField, Segmented } from "@/features/evidence/filters";
import { useUrlParam } from "@/features/evidence/use-url-param";
import { notificationVisibleTo, useIncidents } from "@/hooks/use-demo-data";
import { useIsLg } from "@/hooks/use-mounted";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import type { AppNotification, Incident } from "@/types";
import { ConversationSplit, IncidentHeader, ThreadRow } from "./thread-parts";
import { isActiveIncident, useThreads, type Thread } from "./use-threads";

type ListView = "threads" | "notices";

const NOTICE_KINDS: AppNotification["kind"][] = [
  "system",
  "escalation",
  "backup",
];

const NOTICE_DOT: Record<AppNotification["tone"], string> = {
  critical: "bg-critical",
  high: "bg-high",
  info: "bg-normal",
  success: "bg-resolved",
};

const NOTICE_KIND_LABEL: Partial<Record<AppNotification["kind"], string>> = {
  system: "Shift",
  escalation: "Escalation",
  backup: "Backup",
};

function preview(thread: Thread): ReactNode {
  const message = thread.lastInternal;
  if (!message) return "No notes yet. Write the first one.";
  if (message.senderRole === "system") return message.text;
  return (
    <>
      <span className="font-medium text-foreground">{message.senderName}</span>
      <span className="text-subtle"> · {ROLE_LABEL[message.senderRole]}</span>
      <br />
      {message.text}
    </>
  );
}

/** Staff-only thread of one incident. Drawn with the dashed frame used for everything internal. */
function InternalThread({
  incident,
  noteCount,
  onBack,
}: {
  incident: Incident;
  noteCount: number;
  onBack: () => void;
}) {
  const { can } = useSession();
  return (
    <>
      <IncidentHeader incident={incident} onBack={onBack} />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border/70 bg-card px-3 py-2 text-xs text-muted-foreground sm:px-4">
        <p className="flex items-center gap-1.5">
          <EyeOff aria-hidden className="size-3.5" />
          <span>
            Staff-only thread ·{" "}
            <span className="tnum">
              {noteCount} {noteCount === 1 ? "note" : "notes"}
            </span>
          </span>
        </p>
        {incident.citizenId && (
          <Link
            href={`/control/communications?id=${incident.id}`}
            className="inline-flex items-center gap-1 rounded font-medium text-primary hover:underline"
          >
            Conversation with the citizen
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-2 sm:p-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-2 border-dashed border-medium/50 bg-inset">
          <ChatThread
            incidentId={incident.id}
            channel="internal"
            placeholder="Write to staff on this incident…"
            disabled={!can("communication.internal")}
            disabledReason="Your role cannot post in internal threads."
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </>
  );
}

function NewThreadDialog({
  candidates,
  onPick,
  onClose,
}: {
  candidates: Incident[];
  onPick: (incident: Incident) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const shown = term
    ? candidates.filter((i) =>
        `${i.id} ${i.title} ${i.location.area}`.toLowerCase().includes(term),
      )
    : candidates;
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a thread</DialogTitle>
          <DialogDescription>
            Choose an open incident that has no internal thread yet. The thread
            is created when you send the first note.
          </DialogDescription>
        </DialogHeader>
        <SearchField
          value={query}
          onChange={setQuery}
          label="Search open incidents"
          placeholder="Search incident or area"
        />
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {candidates.length === 0
              ? "Every open incident already has an internal thread."
              : "No open incident matches."}
          </p>
        ) : (
          <ul className="scroll-thin -mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 pb-1">
            {shown.map((incident) => (
              <li key={incident.id}>
                <IncidentRow incident={incident} onSelect={onPick} />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShiftNotices({ notices }: { notices: AppNotification[] }) {
  if (notices.length === 0)
    return (
      <BlankState
        icon={Megaphone}
        compact
        title="No shift notices"
        description="Shift changes, backup requests and escalations for your role are listed here."
      />
    );
  return (
    <ul aria-label="Shift notices">
      {notices.map((notice) => (
        <li
          key={notice.id}
          className="flex gap-3 border-b border-border/70 px-4 py-3"
        >
          <span
            aria-hidden
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              NOTICE_DOT[notice.tone],
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{notice.title}</p>
              <RelativeTime
                at={notice.at}
                friendly
                className="shrink-0 text-xs text-muted-foreground"
              />
            </div>
            {notice.body && (
              <p className="mt-0.5 text-[13px] leading-snug break-words text-muted-foreground">
                {notice.body}
              </p>
            )}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
              <span>{NOTICE_KIND_LABEL[notice.kind] ?? "Notice"}</span>
              {notice.incidentId && (
                <Link
                  href={`/control/incidents?id=${notice.incidentId}`}
                  className="tnum inline-flex items-center gap-1 rounded font-mono text-primary hover:underline"
                >
                  {notice.incidentId}
                  <ArrowUpRight aria-hidden className="size-3.5" />
                </Link>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MessagesConsole() {
  const session = useSession();
  const threads = useThreads();
  const incidents = useIncidents();
  const notifications = useDemoStore((s) => s.notifications);
  const isLg = useIsLg();
  const [selectedId, setSelectedId] = useUrlParam("id");
  const [view, setView] = useState<ListView>("threads");
  const [query, setQuery] = useState("");
  const [mine, setMine] = useState(false);
  const [picking, setPicking] = useState(false);

  const internal = useMemo(
    () =>
      threads
        .filter((t) => t.internalCount > 0)
        .sort((a, b) => (b.lastInternal?.at ?? 0) - (a.lastInternal?.at ?? 0)),
    [threads],
  );

  // Chosen once, so a new note elsewhere never swaps the open thread on wide screens.
  const [fallbackId] = useState(() => internal[0]?.incident.id ?? null);
  const activeId = selectedId ?? (isLg ? fallbackId : null);

  // A thread opened by reference or just started has no notes yet; it is still listed first.
  const listed = useMemo(() => {
    if (!selectedId || internal.some((t) => t.incident.id === selectedId))
      return internal;
    const fresh = threads.find((t) => t.incident.id === selectedId);
    return fresh ? [fresh, ...internal] : internal;
  }, [internal, threads, selectedId]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return listed.filter((t) => {
      const i = t.incident;
      if (mine && i.operatorId !== session.persona.id) return false;
      if (!term) return true;
      return `${i.id} ${i.title} ${i.location.area} ${t.lastInternal?.senderName ?? ""} ${t.lastInternal?.text ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [listed, query, mine, session.persona.id]);

  const notices = useMemo(
    () =>
      notifications
        .filter(
          (n) =>
            NOTICE_KINDS.includes(n.kind) && notificationVisibleTo(n, session),
        )
        .sort((a, b) => b.at - a.at),
    [notifications, session],
  );

  const candidates = useMemo(() => {
    const taken = new Set(internal.map((t) => t.incident.id));
    return incidents.filter((i) => isActiveIncident(i) && !taken.has(i.id));
  }, [incidents, internal]);

  const incident = activeId
    ? incidents.find((i) => i.id === activeId)
    : undefined;
  const activeThread = activeId
    ? threads.find((t) => t.incident.id === activeId)
    : undefined;

  const list = (
    <>
      <div className="shrink-0 border-b border-border/70 px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Staff-only threads, one per incident. Citizens never see them.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setPicking(true)}
            disabled={!session.can("communication.internal")}
            className="shrink-0"
          >
            <Plus aria-hidden /> New thread
          </Button>
        </div>
        <Segmented
          label="Show"
          value={view}
          onChange={setView}
          stretch
          className="mt-3"
          options={[
            { value: "threads", label: "Threads", count: listed.length },
            { value: "notices", label: "Shift notices", count: notices.length },
          ]}
        />
        {view === "threads" && (
          <>
            <SearchField
              value={query}
              onChange={setQuery}
              label="Search internal threads"
              placeholder="Search incident, sender or text"
              className="mt-2"
            />
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <Label htmlFor="messages-mine" className="font-normal">
                My incidents only
              </Label>
              <Switch
                id="messages-mine"
                checked={mine}
                onCheckedChange={setMine}
              />
            </div>
          </>
        )}
        {view === "notices" && (
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            Read-only. Shift changes, backup requests and escalations sent to
            your role.
          </p>
        )}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {view === "notices" ? (
          <ShiftNotices notices={notices} />
        ) : listed.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No internal threads yet"
            description="Start one from an open incident. Notes from officers and operators collect here."
          />
        ) : visible.length === 0 ? (
          <BlankState
            icon={SearchX}
            compact
            title={
              mine && !query.trim()
                ? "No threads on your incidents"
                : "No thread matches"
            }
            description={
              mine
                ? "Switch off “My incidents only” to see every thread."
                : "Try a different incident ID, sender or phrase."
            }
          />
        ) : (
          <ul aria-label="Internal threads">
            {visible.map((t) => (
              <li key={t.incident.id}>
                <ThreadRow
                  incident={t.incident}
                  at={t.lastInternal?.at ?? t.incident.createdAt}
                  preview={preview(t)}
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
    <InternalThread
      key={incident.id}
      incident={incident}
      noteCount={activeThread?.internalCount ?? 0}
      onBack={() => setSelectedId(null)}
    />
  ) : (
    <div className="grid flex-1 place-items-center">
      <BlankState
        icon={MessagesSquare}
        title={activeId ? "No incident has this reference" : "Choose a thread"}
        description={
          activeId
            ? "It may belong to an earlier demonstration session."
            : "Pick an incident from the list to read and add staff notes."
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
    <>
      <ConversationSplit
        list={list}
        detail={detail}
        showDetail={Boolean(selectedId)}
      />
      {picking && (
        <NewThreadDialog
          candidates={candidates}
          onClose={() => setPicking(false)}
          onPick={(picked) => {
            setPicking(false);
            setView("threads");
            setSelectedId(picked.id);
          }}
        />
      )}
    </>
  );
}

export function MessagesScreen() {
  const { can } = useSession();
  if (!can("communication.internal")) {
    return (
      <PageContainer>
        <PageHeader title="Messages" />
        <Panel>
          <RestrictedState
            title="Internal messaging is restricted"
            description="Your role does not permit access."
          />
        </Panel>
      </PageContainer>
    );
  }
  return <MessagesConsole />;
}
