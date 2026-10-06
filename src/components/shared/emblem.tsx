import { deployment } from "@/config/deployment";
import { cn } from "@/lib/utils";

/**
 * Neutral placeholder emblem: a shield holding a signal arc. Deliberately generic — it borrows from
 * no government or police insignia and is meant to be replaced per deployment.
 */
export function Emblem({
  className,
  title = `${deployment.productName} emblem`,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      className={cn("size-8 shrink-0", className)}
    >
      <path
        d="M16 2.5 27 6.6v8.2c0 7-4.4 12.2-11 14.7C9.4 27 5 21.8 5 14.8V6.6L16 2.5Z"
        className="fill-primary"
      />
      <path
        d="M16 5.3 24.4 8.4v6.4c0 5.5-3.3 9.7-8.4 11.9-5.1-2.2-8.4-6.4-8.4-11.9V8.4L16 5.3Z"
        className="fill-primary-foreground/10"
      />
      <circle cx="16" cy="17.6" r="2.1" className="fill-primary-foreground" />
      <path
        d="M11.4 14.2a6.5 6.5 0 0 1 9.2 0"
        className="fill-none stroke-primary-foreground"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8.9 11.4a10 10 0 0 1 14.2 0"
        className="fill-none stroke-primary-foreground/60"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  subtitle,
}: {
  className?: string;
  subtitle?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Emblem />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[15px] font-semibold tracking-tight">
          {deployment.productName}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {subtitle ?? deployment.orgName}
        </span>
      </span>
    </span>
  );
}
