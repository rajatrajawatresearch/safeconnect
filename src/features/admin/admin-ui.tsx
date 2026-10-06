"use client";

import { LoaderCircle, Search, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden className={cn("animate-spin", className)} />;
}

const NOTICE_TONE = {
  neutral: { box: "border-border bg-inset", icon: "text-muted-foreground" },
  info: { box: "border-normal/35 bg-normal-soft", icon: "text-normal-fg" },
  caution: { box: "border-medium/40 bg-medium-soft", icon: "text-medium-fg" },
} as const;

/** A standing explanation on a page: what this screen is, what a control affects, what is not real. */
export function Notice({
  tone = "neutral",
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof NOTICE_TONE;
  icon?: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-2 rounded-xl border px-4 py-3",
        NOTICE_TONE[tone].box,
        className,
      )}
    >
      {Icon && (
        <Icon
          aria-hidden
          className={cn("mt-0.5 size-4 shrink-0", NOTICE_TONE[tone].icon)}
        />
      )}
      <div className="min-w-0 flex-1 basis-56 text-sm">
        {title && <p className="font-medium">{title}</p>}
        {children && (
          <div
            className={cn(
              "leading-relaxed text-muted-foreground",
              title && "mt-0.5",
            )}
          >
            {children}
          </div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name. Also the placeholder unless one is given. */
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
}

/** A filter dropdown. The label is announced to assistive technology; the value speaks for itself visually. */
export function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger
        aria-label={label}
        className={cn("w-full min-w-0 data-[size=default]:h-9", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="max-h-80">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Label, control and one line of help or error, wired for screen readers by the caller's `htmlFor`. */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 grid-cols-1 gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-xs text-destructive"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A confirmation that stays open while the command runs, so a failure can be retried in place. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = "default",
  pending,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  variant?: "default" | "destructive";
  pending?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant={variant} disabled={pending} onClick={onConfirm}>
            {pending && <Spinner />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * `useAction` for a list of independent controls (switches, checkboxes): each call is tracked under
 * a key so only the control that is saving shows as busy.
 */
export function useKeyedAction<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  options: {
    success?: string | ((result: R) => string);
    error?: string;
    onSuccess?: (result: R) => void;
  } = {},
) {
  const { run: runAction } = useAction(fn, options);
  const [keys, setKeys] = useState<readonly string[]>([]);

  const run = useCallback(
    async (key: string, ...args: A) => {
      setKeys((current) => [...current, key]);
      try {
        return await runAction(...args);
      } finally {
        setKeys((current) => {
          const index = current.indexOf(key);
          return index < 0
            ? current
            : [...current.slice(0, index), ...current.slice(index + 1)];
        });
      }
    },
    [runAction],
  );

  const isPending = useCallback((key: string) => keys.includes(key), [keys]);

  return { run, isPending, anyPending: keys.length > 0 };
}

export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/** Small "Saving…" marker for controls that save as soon as they change. */
export function SavingMark({ show }: { show: boolean }) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        !show && "sr-only",
      )}
    >
      {show && (
        <>
          <Spinner className="size-3" /> Saving
        </>
      )}
    </span>
  );
}
