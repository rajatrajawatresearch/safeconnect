"use client";

import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A console action that can explain itself when it is unavailable.
 *
 * A blocked action stays focusable (`aria-disabled`, not `disabled`) so the reason is reachable by
 * keyboard and screen reader, appears on hover, and is shown as a toast on tap — touch has no hover.
 */
export function ActionButton({
  icon: Icon,
  label,
  reason,
  onClick,
  variant = "outline",
  size = "default",
  pending,
  className,
}: {
  icon: LucideIcon;
  label: string;
  /** Why the action cannot be used right now. Null or undefined means it can. */
  reason?: string | null;
  onClick: () => void;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  pending?: boolean;
  className?: string;
}) {
  const blocked = Boolean(reason);
  const button = (
    <Button
      type="button"
      variant={blocked ? "outline" : variant}
      size={size}
      disabled={pending}
      aria-disabled={blocked || undefined}
      onClick={() => {
        if (reason) {
          toast(`${label} is unavailable`, { description: reason });
          return;
        }
        onClick();
      }}
      className={cn(
        "min-w-0 justify-start",
        blocked &&
          "cursor-not-allowed text-muted-foreground opacity-60 hover:bg-background hover:text-muted-foreground active:translate-y-0 dark:hover:bg-input/30",
        className,
      )}
    >
      <Icon aria-hidden />
      <span className="truncate">{label}</span>
      {reason && <span className="sr-only">. Unavailable: {reason}</span>}
    </Button>
  );

  if (!reason) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom">{reason}</TooltipContent>
    </Tooltip>
  );
}
