"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMd } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

/**
 * One piece of secondary content, presented the way each device expects it:
 * a bottom sheet that can be dragged away on phones, a centred dialog from tablet width up.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Sticks to the bottom edge so the primary action is always reachable. */
  footer?: ReactNode;
  className?: string;
}) {
  const isMd = useIsMd();

  if (isMd) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
            className,
          )}
        >
          <DialogHeader className="px-5 pt-5 pr-12 pb-3">
            <DialogTitle className="text-lg leading-snug">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-[15px] leading-relaxed">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            {children}
          </div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-inset px-5 py-4 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn("rounded-t-3xl", className)}>
        <DrawerHeader className="px-5 pt-4 pb-3 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <DrawerTitle className="text-lg leading-snug">{title}</DrawerTitle>
          {description && (
            <DrawerDescription className="text-[15px] leading-relaxed">
              {description}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {children}
        </div>
        {footer && (
          <div className="pb-safe border-t border-border bg-inset">
            <div className="flex flex-col gap-2 px-5 py-4">{footer}</div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
