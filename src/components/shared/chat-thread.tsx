"use client";

import { EyeOff, Languages, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useIncidentMessages, useUnit } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { Message, MessageChannel } from "@/types";

const ROLE_LABEL: Record<Message["senderRole"], string> = {
  citizen: "Citizen",
  operator: "Control room",
  dispatcher: "Dispatch",
  officer: "Officer",
  supervisor: "Supervisor",
  command: "Command",
  state_command: "State command",
  admin: "Admin",
  system: "System",
};

/**
 * Conversation on one incident.
 *
 * `channel="citizen"` is what the citizen can read. `channel="internal"` is staff only and is drawn
 * differently on purpose, so nobody types an internal remark into the citizen's thread by mistake.
 */
export function ChatThread({
  incidentId,
  channel,
  quickReplies,
  placeholder,
  disabled,
  disabledReason,
  className,
}: {
  incidentId: string;
  channel: MessageChannel;
  /** One-tap messages. Keep them short: they are for people who cannot type right now. */
  quickReplies?: string[];
  placeholder?: string;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
}) {
  const session = useSession();
  const unit = useUnit(session.persona.unitId);
  const messages = useIncidentMessages(incidentId, channel);
  const [draft, setDraft] = useState("");
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const logRef = useRef<HTMLDivElement>(null);
  const send = useAction(services.communication.sendMessage);
  const internal = channel === "internal";

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length]);

  const displayName =
    session.role === "citizen"
      ? session.persona.shortName
      : session.role === "officer"
        ? `${session.persona.name}${unit ? ` · Unit ${unit.callSign}` : ""}`
        : internal
          ? session.persona.name
          : `${session.persona.shortName} · Control room`;

  const submit = async (text: string) => {
    const value = text.trim();
    if (!value || disabled) return;
    setDraft("");
    await send.run(incidentId, channel, value, session.actor, displayName);
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {internal && (
        <p className="flex items-center gap-1.5 border-b border-dashed border-medium/50 bg-medium-soft px-3 py-1.5 text-xs font-medium text-medium-fg">
          <EyeOff aria-hidden className="size-3.5" /> Internal notes. The
          citizen never sees this thread.
        </p>
      )}

      <div
        ref={logRef}
        className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
        role="log"
        aria-live="polite"
        aria-label={
          internal ? "Internal messages" : "Messages with the citizen"
        }
      >
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {internal
              ? "No internal notes yet."
              : session.role === "citizen"
                ? "Send a message. The control room replies here."
                : "No messages with the citizen yet."}
          </p>
        )}
        {messages.map((m) => {
          if (m.senderRole === "system") {
            return (
              <p
                key={m.id}
                className="text-center text-xs text-muted-foreground"
              >
                {m.text} · <span className="tnum">{formatTime(m.at)}</span>
              </p>
            );
          }
          const mine =
            m.senderRole === session.role &&
            (session.role !== "officer" ||
              m.senderName.startsWith(session.persona.name));
          return (
            <div
              key={m.id}
              className={cn(
                "flex flex-col",
                mine ? "items-end" : "items-start",
              )}
            >
              <p className="mb-1 px-1 text-xs text-muted-foreground">
                {mine ? "You" : m.senderName}
                {!mine &&
                  !m.senderName.includes(ROLE_LABEL[m.senderRole]) &&
                  session.role !== "citizen" && (
                    <span className="text-subtle">
                      {" "}
                      · {ROLE_LABEL[m.senderRole]}
                    </span>
                  )}
                <span className="tnum"> · {formatTime(m.at)}</span>
              </p>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
                  mine
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : internal
                      ? "rounded-bl-md border border-dashed border-border bg-inset"
                      : "rounded-bl-md bg-muted",
                )}
              >
                {showOriginal[m.id] && m.translated
                  ? m.translated.text
                  : m.text}
              </div>
              {m.translated && session.role !== "citizen" && (
                <button
                  type="button"
                  onClick={() =>
                    setShowOriginal((s) => ({ ...s, [m.id]: !s[m.id] }))
                  }
                  className="mt-1 inline-flex items-center gap-1 px-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Languages aria-hidden className="size-3" />
                  {showOriginal[m.id]
                    ? "Show translation"
                    : `Translated by the assistant · show ${m.translated.language.replace(" (original)", "")} original`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {quickReplies && quickReplies.length > 0 && !disabled && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-2">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => submit(reply)}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium whitespace-nowrap hover:bg-muted"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t border-border/70 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(draft);
        }}
      >
        <label className="sr-only" htmlFor={`chat-${incidentId}-${channel}`}>
          {internal ? "Write an internal note" : "Write a message"}
        </label>
        <textarea
          id={`chat-${incidentId}-${channel}`}
          rows={1}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(draft);
            }
          }}
          placeholder={
            disabled
              ? (disabledReason ?? "This conversation is closed.")
              : (placeholder ??
                (internal ? "Add an internal note…" : "Write a message…"))
          }
          className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
        />
        <Button
          type="submit"
          size="icon-lg"
          className="size-10 shrink-0 rounded-xl"
          disabled={disabled || !draft.trim() || send.pending}
          aria-label={internal ? "Add note" : "Send message"}
        >
          <SendHorizontal aria-hidden />
        </Button>
      </form>
    </div>
  );
}
