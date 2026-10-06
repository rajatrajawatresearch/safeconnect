"use client";

import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PriorityBadge, StatusChip } from "@/components/shared/status-chips";
import { RelativeTime, ResponseTimer } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { PRIORITY_META, SOURCE_LABEL, TONE } from "@/config/incident";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types";
import { isActiveIncident } from "./use-threads";

/**
 * Conversation list beside the open conversation. From `lg` both are visible; on smaller
 * screens the list comes first and choosing a row swaps it for the conversation.
 */
export function ConversationSplit({
  list,
  detail,
  showDetail,
}: {
  list: ReactNode;
  detail: ReactNode;
  /** Small screens only: whether the conversation has replaced the list. */
  showDetail: boolean;
}) {
  return (
    <div className="flex h-full min-h-0">
      <div
        className={cn(
          "min-h-0 w-full shrink-0 flex-col border-border bg-card lg:flex lg:w-[340px] lg:border-r xl:w-[384px]",
          showDetail ? "hidden" : "flex",
        )}
      >
        {list}
      </div>
      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col lg:flex",
          showDetail ? "flex" : "hidden",
        )}
      >
        {detail}
      </div>
    </div>
  );
}

/** One incident in a conversation list. */
export function ThreadRow({
  incident,
  at,
  preview,
  badges,
  selected,
  onSelect,
}: {
  incident: Incident;
  /** Time of the latest activity shown in the row. */
  at: number;
  preview: ReactNode;
  badges?: ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  const active = isActiveIncident(incident);
  const tone = PRIORITY_META[incident.priority].tone;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "relative block w-full border-b border-border/70 py-3 pr-3 pl-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-offset-[-2px]",
        selected && "bg-accent/60 hover:bg-accent/60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2.5 left-0 w-1 rounded-r",
          active ? TONE[tone].dot : "bg-border",
        )}
      />
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <PriorityBadge
            priority={incident.priority}
            showCode={false}
            variant={active ? "soft" : "outline"}
          />
          <span className="truncate text-sm font-semibold">
            {incident.title}
          </span>
        </span>
        <RelativeTime
          at={at}
          friendly
          className="shrink-0 text-xs text-muted-foreground"
        />
      </span>
      <span className="mt-1 block truncate text-xs text-muted-foreground">
        <span className="tnum font-mono">{incident.id}</span> ·{" "}
        {incident.location.area}
      </span>
      <span className="mt-1.5 line-clamp-2 block text-[13px] leading-snug break-words text-muted-foreground">
        {preview}
      </span>
      {badges && (
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          {badges}
        </span>
      )}
    </button>
  );
}

/** Who and what the open conversation is about, with the way into the full incident. */
export function IncidentHeader({
  incident,
  onBack,
}: {
  incident: Incident;
  /** Small screens: return to the list. */
  onBack: () => void;
}) {
  const active = isActiveIncident(incident);
  return (
    <header className="flex shrink-0 items-start gap-2 border-b border-border/70 bg-card px-3 py-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={onBack}
        aria-label="Back to the list"
        className="-ml-1 shrink-0 lg:hidden"
      >
        <ArrowLeft aria-hidden />
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <PriorityBadge priority={incident.priority} />
          <h2 className="min-w-0 text-base leading-tight font-semibold break-words">
            {incident.title}
          </h2>
          <StatusChip status={incident.status} />
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="tnum font-mono">{incident.id}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden className="size-3.5" />
            {incident.location.area}
          </span>
          <span>{SOURCE_LABEL[incident.source]}</span>
          <span>
            {incident.anonymous ? "Anonymous source" : incident.reporterName}
            {incident.reporterPhoneMasked && !incident.anonymous && (
              <span className="tnum font-mono">
                {" "}
                · {incident.reporterPhoneMasked}
              </span>
            )}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        {active && (
          <ResponseTimer
            since={incident.createdAt}
            priority={incident.priority}
            className="hidden sm:block"
          />
        )}
        <Button variant="outline" asChild>
          <Link href={`/control/incidents?id=${incident.id}`}>
            <span className="hidden sm:inline">Open incident</span>
            <span className="sm:hidden">Incident</span>
            <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      </div>
    </header>
  );
}
