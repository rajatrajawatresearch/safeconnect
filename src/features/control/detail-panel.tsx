"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * A detail view that sits beside the main content when there is room and slides over it as a
 * drawer when there is not. The caller decides which with `inline` (usually a breakpoint hook).
 *
 * Content is expected to fill the height and manage its own scrolling, as `IncidentInspector` does.
 */
export function DetailPanel({
  open,
  onClose,
  inline,
  label,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** True renders an in-flow side panel; false renders a drawer. */
  inline: boolean;
  /** Accessible name, for example "Incident GJ-AHD-2026-28491". */
  label: string;
  children: ReactNode;
  /** Applied to the inline panel only. Set its width here. */
  className?: string;
}) {
  if (inline) {
    if (!open) return null;
    return (
      <aside
        aria-label={label}
        className={cn(
          "flex min-h-0 w-[440px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card",
          className,
        )}
      >
        {children}
      </aside>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        // Focus the drawer itself rather than its first control, whose tooltip would otherwise
        // pop open over the content every time the drawer appears.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
        className="gap-0 overflow-hidden p-0 outline-none data-[side=right]:w-full data-[side=right]:sm:max-w-[520px]"
      >
        <SheetTitle className="sr-only">{label}</SheetTitle>
        <SheetDescription className="sr-only">
          Details and actions for the selected item.
        </SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/** Title bar for detail panels whose content has no header of its own. */
export function DetailHeader({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose?: () => void;
  /** Chips or other status shown under the title. */
  children?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-start gap-3 border-b border-border/70 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <h2 className="text-base leading-tight font-semibold tracking-tight break-words">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
        )}
        {children && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {children}
          </div>
        )}
      </div>
      {onClose && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close details"
          className="-mr-1 shrink-0"
        >
          <X aria-hidden />
        </Button>
      )}
    </header>
  );
}
