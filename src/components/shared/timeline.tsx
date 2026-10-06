import {
  ArrowRightLeft,
  Ban,
  BadgeCheck,
  CircleCheckBig,
  ClipboardCheck,
  Headset,
  MapPinCheck,
  MessageSquareText,
  Navigation,
  Paperclip,
  PhoneCall,
  Radio,
  ShieldPlus,
  Siren,
  StickyNote,
  TriangleAlert,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { formatClock, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TimelineEvent, TimelineKind } from "@/types";

const KIND: Record<
  TimelineKind,
  { icon: LucideIcon; emphasis?: "critical" | "good" | "warn" }
> = {
  created: { icon: Siren, emphasis: "critical" },
  acknowledged: { icon: Headset },
  triage: { icon: BadgeCheck },
  assigned: { icon: Radio },
  accepted: { icon: UserCheck },
  rejected: { icon: UserX, emphasis: "warn" },
  en_route: { icon: Navigation },
  arrived: { icon: MapPinCheck, emphasis: "good" },
  communication: { icon: PhoneCall },
  evidence: { icon: Paperclip },
  note: { icon: StickyNote },
  backup: { icon: ShieldPlus, emphasis: "warn" },
  escalated: { icon: TriangleAlert, emphasis: "warn" },
  transferred: { icon: ArrowRightLeft },
  stage: { icon: MessageSquareText },
  resolved: { icon: CircleCheckBig, emphasis: "good" },
  cancelled: { icon: Ban },
  handoff: { icon: ClipboardCheck },
  system: { icon: Radio },
};

/**
 * Chronological record of an incident. Oldest first by default, as an operator reads it.
 * Pass `citizenView` to show only the entries the citizen is entitled to see.
 */
export function Timeline({
  events,
  citizenView,
  newestFirst,
  dense,
  className,
}: {
  events: TimelineEvent[];
  citizenView?: boolean;
  newestFirst?: boolean;
  dense?: boolean;
  className?: string;
}) {
  const visible = (
    citizenView ? events.filter((e) => e.citizenVisible) : events
  )
    .slice()
    .sort((a, b) => (newestFirst ? b.at - a.at : a.at - b.at));
  if (visible.length === 0)
    return (
      <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
    );

  return (
    <ol className={cn("relative", className)}>
      {visible.map((event, index) => {
        const { icon: Icon, emphasis } = KIND[event.kind];
        const last = index === visible.length - 1;
        return (
          <li
            key={event.id}
            className={cn(
              "relative flex gap-3",
              dense ? "pb-3" : "pb-4",
              last && "pb-0",
            )}
          >
            {!last && (
              <span
                aria-hidden
                className="absolute top-7 bottom-0 left-[13px] w-px bg-border"
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border bg-card",
                emphasis === "critical" &&
                  "border-critical/40 bg-critical-soft text-critical-fg",
                emphasis === "good" &&
                  "border-resolved/40 bg-resolved-soft text-resolved-fg",
                emphasis === "warn" &&
                  "border-high/40 bg-high-soft text-high-fg",
                !emphasis && "border-border text-muted-foreground",
              )}
            >
              <Icon aria-hidden className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <time
                  dateTime={new Date(event.at).toISOString()}
                  title={formatDateTime(event.at)}
                  className="tnum font-mono text-xs text-muted-foreground"
                >
                  {formatClock(event.at)}
                </time>
                <p className="text-sm font-medium">{event.title}</p>
              </div>
              {(event.detail || (!citizenView && event.actor)) && (
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                  {event.detail}
                  {!citizenView &&
                    event.actor &&
                    event.detail !== event.actor && (
                      <span className="text-subtle">
                        {event.detail ? " · " : ""}
                        {event.actor}
                      </span>
                    )}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
