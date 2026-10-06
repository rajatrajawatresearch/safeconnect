"use client";

import { ChevronRight, MapPin, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { Panel } from "@/components/shared/page";
import { ErrorState } from "@/components/shared/states";
import { PriorityBadge, StatusChip } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PRIORITY_META, TONE } from "@/config/incident";
import { useIsMd } from "@/hooks/use-mounted";
import { formatKm } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types";

/** Officer surfaces are one step rounder and roomier than the consoles. */
export function OfficerCard({
  children,
  className,
  as,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside" | "li";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Panel as={as} className={cn("rounded-2xl", className)} {...rest}>
      {children}
    </Panel>
  );
}

/** Card heading with an optional icon and a trailing link or control. */
export function CardHeading({
  icon: Icon,
  title,
  description,
  action,
  id,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-3 gap-y-2",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Icon aria-hidden className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 id={id} className="text-[15px] leading-snug font-semibold">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** "View all" style link sized for a thumb. */
export function CardLink({
  href,
  children,
  label,
}: {
  href: string;
  children: ReactNode;
  /** Fuller name for screen readers when the visible text is short. */
  label?: string;
}) {
  return (
    <Button
      asChild
      variant="ghost"
      size="lg"
      className="-mr-2 h-10 text-primary"
    >
      <Link href={href} aria-label={label}>
        {children}
        <ChevronRight aria-hidden />
      </Link>
    </Button>
  );
}

/** Label over a large value, for distance, ETA and timers. */
export function Metric({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tnum mt-0.5 truncate text-xl font-semibold tracking-tight">
        {children}
      </dd>
    </div>
  );
}

/**
 * The one-handed action area on phones: pinned above the bottom navigation while the page scrolls.
 * Hidden from `md` up, where the same actions sit in the left column.
 */
export function StickyActionBar({
  children,
  className,
  label = "Actions",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "sticky bottom-0 z-20 mt-auto border-t border-border bg-card px-4 py-3 shadow-raised md:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Bottom sheet on phones, side panel from tablet up. The body fills the remaining height. */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  bodyClassName,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  wide?: boolean;
}) {
  const isMd = useIsMd();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMd ? "right" : "bottom"}
        className={cn(
          "gap-0 p-0",
          "data-[side=bottom]:h-[88dvh] data-[side=bottom]:rounded-t-2xl",
          "data-[side=right]:w-full data-[side=right]:sm:max-w-md",
          wide && "data-[side=right]:lg:max-w-xl",
        )}
      >
        <SheetHeader className="shrink-0 border-b border-border/70 pr-12">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className={cn("flex min-h-0 flex-1 flex-col", bodyClassName)}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Shown when the signed-in profile has no unit, which the officer screens cannot work without. */
export function NoUnitState() {
  return (
    <div className="grid min-h-full place-items-center p-6">
      <ErrorState
        title="No unit is linked to this profile."
        description="The officer app needs an on-duty unit. Switch to the field officer role from the demo bar, or ask an administrator to link a unit."
      />
    </div>
  );
}

/**
 * One incident in an officer list. Shows only what a responder needs to recognise it — never the
 * reporter. Renders as a button when `onSelect` is given.
 */
export function OfficerIncidentRow({
  incident,
  km,
  trailing,
  onSelect,
  selected,
  className,
}: {
  incident: Incident;
  /** Road distance from the unit, when known. */
  km?: number;
  /** Replaces the incident status chip (for example with the officer's own stage). */
  trailing?: ReactNode;
  onSelect?: (incident: Incident) => void;
  selected?: boolean;
  className?: string;
}) {
  const meta = PRIORITY_META[incident.priority];
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-3 left-0 w-1 rounded-r",
          TONE[meta.tone].dot,
        )}
      />
      <div className="flex items-center justify-between gap-2">
        <PriorityBadge
          priority={incident.priority}
          variant="soft"
          showCode={false}
        />
        <RelativeTime
          at={incident.createdAt}
          className="text-xs text-muted-foreground"
        />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[15px] font-semibold">
        <CategoryIcon
          categoryId={incident.categoryId}
          className="text-muted-foreground"
        />
        <span className="truncate">{incident.title}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{incident.location.area}</span>
        </span>
        {km !== undefined && <span className="tnum">{formatKm(km)}</span>}
        <span className="ml-auto">
          {trailing ?? <StatusChip status={incident.status} />}
        </span>
      </div>
    </>
  );

  const classes = cn(
    "relative block w-full rounded-2xl border bg-card py-3.5 pr-3.5 pl-4.5 text-left transition-colors",
    selected ? "border-primary/60 bg-accent/60" : "border-border",
    onSelect && "hover:border-input hover:bg-muted/50",
    className,
  );

  if (!onSelect) return <div className={classes}>{body}</div>;
  return (
    <button
      type="button"
      onClick={() => onSelect(incident)}
      aria-pressed={selected}
      aria-label={`${meta.label} incident, ${incident.title}, ${incident.location.area}${km !== undefined ? `, ${formatKm(km)} away` : ""}`}
      className={classes}
    >
      {body}
    </button>
  );
}
