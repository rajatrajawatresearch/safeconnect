"use client";

import { Bell, BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { notificationVisibleTo, useNotifications } from "@/hooks/use-demo-data";
import { alertAllowed } from "@/features/control-settings/notification-prefs-store";
import { useSosUi } from "@/features/sos/sos-ui-store";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { personaById } from "@/data/demo/people";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useApiStatus } from "@/services/http/sync";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import type { AppNotification } from "@/types";

const TONE_DOT: Record<AppNotification["tone"], string> = {
  critical: "bg-critical",
  high: "bg-high",
  info: "bg-normal",
  success: "bg-resolved",
};

export function NotificationCenter({ className }: { className?: string }) {
  const session = useSession();
  const { items, unread, unreadCount } = useNotifications(session);
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);

  const openItem = (n: AppNotification) => {
    void services.notifications.markRead(n.id, session.persona.id);
    setOpen(false);
    if (n.href) router.push(n.href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className={cn("relative", className)}
          aria-label={`${t("notifications.title")}${unreadCount ? `, ${unreadCount} unread` : ""}`}
        >
          {unreadCount ? <BellRing aria-hidden /> : <Bell aria-hidden />}
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="tnum absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-critical px-1 text-[10px] leading-none font-semibold text-critical-on"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-1.5rem))] gap-0 p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <h2 className="text-sm font-semibold">{t("notifications.title")}</h2>
          <Button
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0}
            onClick={() =>
              services.notifications.markAllRead(
                unread.map((n) => n.id),
                session.persona.id,
              )
            }
          >
            {t("notifications.markAll")}
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {t("notifications.empty")}
          </p>
        ) : (
          <ul className="scroll-thin max-h-[min(26rem,60vh)] overflow-y-auto py-1">
            {items.slice(0, 30).map((n) => {
              const isUnread = !n.readBy.includes(session.persona.id);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className="flex w-full gap-3 px-4 py-2.5 text-left hover:bg-muted/60"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        isUnread ? TONE_DOT[n.tone] : "bg-border",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm",
                          isUnread
                            ? "font-semibold"
                            : "font-medium text-muted-foreground",
                        )}
                      >
                        {n.title}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                          {n.body}
                        </span>
                      )}
                      <RelativeTime
                        at={n.at}
                        friendly
                        className="mt-1 block text-xs text-subtle"
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Raises a toast when something new arrives for the current role.
 * Operators are only interrupted by things that need them; routine updates wait in the bell.
 */
export function NotificationToaster() {
  const router = useRouter();
  const seen = useRef<Set<string> | null>(null);
  const lastSnapshot = useRef(0);

  useEffect(() => {
    seen.current = new Set(
      useDemoStore.getState().notifications.map((n) => n.id),
    );
    return useDemoStore.subscribe((state, previous) => {
      if (state.notifications === previous.notifications || !seen.current)
        return;
      const snapshots = useApiStatus.getState().snapshots;
      if (snapshots !== lastSnapshot.current) {
        lastSnapshot.current = snapshots;
        seen.current = new Set(state.notifications.map((n) => n.id));
        return;
      }
      const persona = personaById(usePrefsStore.getState().personaId);
      const session = { persona, role: persona.role };
      for (const n of state.notifications) {
        if (seen.current.has(n.id)) break;
        seen.current.add(n.id);
        if (!notificationVisibleTo(n, session)) continue;
        const staff = persona.role !== "citizen" && persona.role !== "officer";
if (
          persona.role === "citizen" &&
          state.incidents.some(
            (i) =>
              i.citizenId === persona.id &&
              !["resolved", "closed", "cancelled"].includes(i.status) &&
              (useSosUi.getState().discreet[i.id] ?? Boolean(i.silent)),
          )
        )
          continue;
        if (staff && n.tone === "info") continue;
        if (staff && !alertAllowed(n.kind)) continue;
        const options = {
          description: n.body,
          action: n.href
            ? { label: "Open", onClick: () => router.push(n.href as string) }
            : undefined,
          duration: n.tone === "critical" ? 9000 : 5000,
        };
        if (n.tone === "critical") toast.error(n.title, options);
        else if (n.tone === "high") toast.warning(n.title, options);
        else if (n.tone === "success") toast.success(n.title, options);
        else toast(n.title, options);
      }
      if (seen.current.size > 400)
        seen.current = new Set(state.notifications.map((n) => n.id));
    });
  }, [router]);

  return null;
}
