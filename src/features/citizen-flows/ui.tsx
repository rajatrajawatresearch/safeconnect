"use client";

import {
  Check,
  CircleAlert,
  Copy,
  Info,
  ScrollText,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { TONE, type Tone } from "@/config/incident";
import { useT } from "@/hooks/use-t";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/stores/prefs-store";

/**
 * Building blocks shared by the citizen report, complaint, activity and journey screens.
 * Everything here is sized for touch: targets are at least 44px and text runs one step larger
 * than the staff consoles.
 */

/** `<main>` is the scroll container of the app shell; a new step or view starts from its top. */
export function scrollMainToTop() {
  document.getElementById("main")?.scrollTo({ top: 0 });
}

interface ChoiceCardProps<T extends string> {
  name: string;
  value: T;
  checked: boolean;
  onSelect: (value: T) => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
  /** Extra content shown under the description, inside the card. */
  children?: ReactNode;
  className?: string;
}

/**
 * One option of a single-choice question, drawn as a card.
 * A native radio sits underneath, so arrow keys, form semantics and screen readers behave as expected.
 */
export function ChoiceCard<T extends string>({
  name,
  value,
  checked,
  onSelect,
  title,
  description,
  icon: Icon,
  disabled,
  children,
  className,
}: ChoiceCardProps<T>) {
  return (
    <label
      className={cn(
        "group relative flex min-h-16 items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors",
        "has-[:checked]:border-primary has-[:checked]:bg-accent/50",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        // A locked group still shows which answer applies, so the chosen card stays at full strength.
        disabled
          ? "cursor-not-allowed opacity-55 has-[:checked]:opacity-100"
          : "cursor-pointer hover:border-input",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      {Icon && (
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground transition-colors group-has-[:checked]:bg-primary group-has-[:checked]:text-primary-foreground">
          <Icon aria-hidden className="size-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">{title}</span>
        {description && (
          <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
            {description}
          </span>
        )}
        {children}
      </span>
      <span
        aria-hidden
        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-input transition-colors group-has-[:checked]:border-primary group-has-[:checked]:bg-primary"
      >
        <span className="size-2 rounded-full bg-primary-foreground opacity-0 group-has-[:checked]:opacity-100" />
      </span>
    </label>
  );
}

interface ChoiceChipProps<T extends string> {
  type: "radio" | "checkbox";
  name: string;
  value: T;
  checked: boolean;
  onToggle: (value: T, checked: boolean) => void;
  children: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}

/** Compact pill for short options (durations, intervals, optional details). */
export function ChoiceChip<T extends string>({
  type,
  name,
  value,
  checked,
  onToggle,
  children,
  icon: Icon,
  disabled,
  className,
}: ChoiceChipProps<T>) {
  return (
    <label
      className={cn(
        // `relative` keeps the visually hidden input inside the chip, so a scrolling chip row clips it.
        "group relative inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[15px] font-medium transition-colors select-none",
        "has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-accent-foreground",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        disabled
          ? "cursor-not-allowed opacity-55"
          : "cursor-pointer hover:border-input",
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(value, e.target.checked)}
        className="sr-only"
      />
      {type === "checkbox" ? (
        <span
          aria-hidden
          className="grid size-4 shrink-0 place-items-center rounded-[5px] border border-input group-has-[:checked]:border-primary group-has-[:checked]:bg-primary group-has-[:checked]:text-primary-foreground"
        >
          <Check className="size-3 opacity-0 group-has-[:checked]:opacity-100" />
        </span>
      ) : (
        Icon && <Icon aria-hidden className="size-4 shrink-0" />
      )}
      {children}
    </label>
  );
}

const NOTICE_ROLE = { status: "status", alert: "alert", note: "note" } as const;

/** A short explanation or warning that sits in the page flow. Tone carries urgency; the title carries meaning. */
export function Notice({
  tone = "normal",
  icon: Icon = Info,
  title,
  children,
  action,
  actionBeside,
  role = "note",
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  /** From `sm` up, put the action to the right of the text instead of under it. For page-wide notices. */
  actionBeside?: boolean;
  role?: keyof typeof NOTICE_ROLE;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <div
      role={NOTICE_ROLE[role]}
      className={cn(
        "flex gap-3 rounded-2xl border p-4",
        tone === "neutral" ? "border-border bg-inset" : cn(t.border, t.soft),
        className,
      )}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", t.text)} />
      <div
        className={cn(
          "min-w-0 flex-1",
          actionBeside && "sm:flex sm:items-center sm:gap-4",
        )}
      >
        <div className="min-w-0 flex-1">
          {title && (
            <p className="text-base font-semibold text-foreground">{title}</p>
          )}
          {children && (
            <div
              className={cn(
                "text-sm leading-relaxed text-foreground/80",
                title && "mt-1",
              )}
            >
              {children}
            </div>
          )}
        </div>
        {action && (
          <div
            className={cn(
              "mt-3 flex flex-wrap gap-2",
              actionBeside && "sm:mt-0 sm:shrink-0",
            )}
          >
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

/** Validation message under a field. The schema stores translation keys, so the text follows the language. */
export function FieldError({
  id,
  message,
  className,
}: {
  id?: string;
  message: string | undefined;
  className?: string;
}) {
  const t = useT();
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "mt-2 flex items-start gap-1.5 text-sm font-medium text-critical-fg",
        className,
      )}
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {t(message as TKey)}
    </p>
  );
}

/** Question heading inside a step or form section. */
export function SectionTitle({
  children,
  hint,
  id,
  className,
  headingRef,
}: {
  children: ReactNode;
  hint?: ReactNode;
  id?: string;
  className?: string;
  /** Lets a wizard move focus to the heading when the step changes. */
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <h2
        id={id}
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="text-lg font-semibold tracking-tight outline-none sm:text-xl"
      >
        {children}
      </h2>
      {hint && (
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Primary actions for a step. On phones the bar sticks to the bottom of the scroll area so the next
 * action is always under the thumb; from `md` up it sits in the normal flow.
 */
export function StickyActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pb-safe sticky bottom-0 z-10 -mx-4 mt-auto border-t border-border bg-background sm:-mx-6",
        "md:static md:mx-0 md:mt-6 md:border-0 md:bg-transparent md:pb-0",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 md:p-0">
        {children}
      </div>
    </div>
  );
}

/** The standing reminder that records in this prototype are not statutory filings. */
export function DemoRecordNote({ className }: { className?: string }) {
  const t = useT();
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <ScrollText aria-hidden className="mt-0.5 size-4 shrink-0" />
      {t("flow.demoNote")}
    </p>
  );
}

/** Shown above lists while the demo connection is offline: what is on screen is the saved copy. */
export function OfflineNote({ className }: { className?: string }) {
  const t = useT();
  const offline = usePrefsStore((s) => s.connectivity === "offline");
  if (!offline) return null;
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-inset px-3 py-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <WifiOff aria-hidden className="size-4 shrink-0" />
      {t("flow.offlineSaved")}
    </p>
  );
}

/** Copies a reference to the clipboard and confirms it in place. */
export function CopyButton({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused; the reference stays visible on screen either way.
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={copy}
      aria-label={`${t("flow.copy")} ${value}`}
      className={cn("h-11 px-3", className)}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span aria-live="polite">
        {copied ? t("flow.copied") : t("flow.copy")}
      </span>
    </Button>
  );
}
