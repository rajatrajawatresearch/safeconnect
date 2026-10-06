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
import { useIsXl } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

/**
 * Register on the left, one record on the right.
 *
 * From `xl` the record opens as a side panel beside the register, which keeps scrolling on its
 * own. Below that it opens as a sheet over the register. Nothing is shown until a record is chosen,
 * so the register has the full width for its columns.
 */
export function RecordSplit({
  children,
  pane,
  open,
  onClose,
  label,
}: {
  children: ReactNode;
  /** The record. Render it with `PaneFrame` so it brings its own header and close button. */
  pane: ReactNode;
  open: boolean;
  onClose: () => void;
  /** Accessible name of the record panel, e.g. "Evidence record". */
  label: string;
}) {
  const isXl = useIsXl();
  return (
    <div className="flex h-full min-h-0">
      <div className="scroll-thin min-w-0 flex-1 overflow-y-auto">
        {children}
      </div>
      {isXl
        ? open && (
            <aside
              aria-label={label}
              className="flex w-[440px] shrink-0 flex-col border-l border-border bg-card 2xl:w-[500px]"
            >
              {pane}
            </aside>
          )
        : null}
      {!isXl && (
        <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="gap-0 bg-card p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
          >
            <SheetTitle className="sr-only">{label}</SheetTitle>
            <SheetDescription className="sr-only">
              Details of the selected record.
            </SheetDescription>
            {pane}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

/** Header, scrolling body and optional action bar of a record panel. */
export function PaneFrame({
  eyebrow,
  title,
  meta,
  onClose,
  children,
  footer,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Chips or a one-line summary under the title. */
  meta?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          {eyebrow && (
            <p className="tnum truncate font-mono text-xs text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-0.5 text-base leading-snug font-semibold break-words">
            {title}
          </h2>
          {meta && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {meta}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close details"
          className="-mr-1 shrink-0"
        >
          <X aria-hidden />
        </Button>
      </header>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
      {footer && (
        <footer className="shrink-0 border-t border-border/70 bg-inset px-4 py-3 sm:px-5">
          {footer}
        </footer>
      )}
    </div>
  );
}

/** One titled block inside a record panel. */
export function PaneSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-b border-border/70 px-4 py-4 last:border-b-0 sm:px-5",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
