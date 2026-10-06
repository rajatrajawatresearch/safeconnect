import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard scrolling page body. Full-bleed views (maps, boards, multi-panel consoles) skip this
 * and fill `h-full` themselves.
 */
export function PageContainer({
  children,
  className,
  width = "wide",
}: {
  children: ReactNode;
  className?: string;
  /** `narrow` for citizen and officer reading widths, `wide` for consoles, `full` for dashboards. */
  width?: "narrow" | "wide" | "full";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8",
        width === "narrow" && "max-w-3xl",
        width === "wide" && "max-w-6xl",
        width === "full" && "max-w-[1800px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Use only when it carries information (a station name, an incident id), not as decoration. */
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-6",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-sm text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

/**
 * The surface every card, panel and tile is built from: card colour, hairline border, soft shadow.
 * `inset` is the quieter variant for nested groups.
 */
export function Panel({
  children,
  className,
  as: Tag = "section",
  inset,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside" | "li";
  inset?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        "rounded-xl border",
        inset
          ? "border-border/70 bg-inset"
          : "border-border bg-card shadow-card",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
      )}
    </div>
  );
}

/** Label-over-value pair for detail panels. */
export function Field({
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
      <dd className="mt-0.5 text-sm font-medium break-words">{children}</dd>
    </div>
  );
}

export function Kbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
