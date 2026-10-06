import {
  CircleCheck,
  Lock,
  RefreshCw,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

function StateShell({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
  tone,
}: StateProps & { tone: "calm" | "warn" | "locked" }) {
  return (
    <div
      role={tone === "warn" ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            "mb-4 grid place-items-center rounded-full",
            compact ? "size-10" : "size-12",
            tone === "calm" && "bg-resolved-soft text-resolved-fg",
            tone === "warn" && "bg-high-soft text-high-fg",
            tone === "locked" && "bg-muted text-muted-foreground",
          )}
        >
          <Icon aria-hidden className={compact ? "size-5" : "size-6"} />
        </span>
      )}
      <p className={cn("font-medium", compact ? "text-sm" : "text-base")}>
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </div>
  );
}

/** Nothing to show. Say what the emptiness means and, where it helps, what to do next. */
export function EmptyState({ icon = CircleCheck, ...props }: StateProps) {
  return <StateShell icon={icon} tone="calm" {...props} />;
}

/** Same layout without the "all good" colouring, for neutral empties such as "No documents added". */
export function BlankState(props: StateProps) {
  return <StateShell tone="locked" {...props} />;
}

export function ErrorState({
  title = "Unable to load this view.",
  description,
  onRetry,
  offline,
  className,
  compact,
}: {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  offline?: boolean;
  className?: string;
  compact?: boolean;
}) {
  return (
    <StateShell
      tone="warn"
      icon={offline ? WifiOff : RefreshCw}
      title={offline ? "Connection interrupted. Reconnecting…" : title}
      description={
        description ??
        (offline
          ? "Live data will return as soon as the connection does."
          : "The request did not complete.")
      }
      compact={compact}
      className={className}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw aria-hidden /> Try again
          </Button>
        )
      }
    />
  );
}

/** Shown in place of content the current role may not open. */
export function RestrictedState({
  title = "Restricted",
  description = "Your role does not permit access.",
  action,
  className,
  compact,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <StateShell
      tone="locked"
      icon={Lock}
      title={title}
      description={description}
      action={action}
      className={className}
      compact={compact}
    />
  );
}

export function ListSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className={cn("space-y-3", className)}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({
  cards = 6,
  className,
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className={cn(
        "grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6",
        className,
      )}
    >
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-14" />
          <Skeleton className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading chart"
      className={cn("flex h-56 items-end gap-2 px-2", className)}
    >
      {[40, 62, 48, 75, 58, 88, 66, 52, 70, 45, 60, 80].map((h, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-t-md rounded-b-none"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

/** Full-area placeholder used while an app shell hydrates. */
export function PageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <CardGridSkeleton cards={4} className="xl:grid-cols-4" />
      <div className="rounded-xl border bg-card p-4">
        <ListSkeleton rows={6} />
      </div>
    </div>
  );
}
