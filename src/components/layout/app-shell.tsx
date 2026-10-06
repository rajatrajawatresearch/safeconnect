"use client";

import {
  Clock,
  Ellipsis,
  PanelLeftClose,
  PanelLeftOpen,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { Emblem } from "@/components/shared/emblem";
import { ErrorState, PageSkeleton, RestrictedState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deployment } from "@/config/deployment";
import {
  AREAS_CONFIG,
  ROLE_HOME,
  isNavActive,
  type AreaConfig,
  type AreaKey,
  type NavItem,
} from "@/config/navigation";
import { personaById } from "@/data/demo/people";
import { useSwitchPersona } from "@/features/auth/use-switch-persona";
import { useActiveIncidents } from "@/hooks/use-demo-data";
import { useMounted } from "@/hooks/use-mounted";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { shiftAt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { API_MODE } from "@/services/http/config";
import { useApiStatus } from "@/services/http/sync";
import { usePrefsStore } from "@/stores/prefs-store";
import { CommandPalette, SearchButton } from "./command-palette";
import { NotificationCenter } from "./notification-center";
import {
  ConnectivityIndicator,
  LanguageSwitcher,
  ThemeToggle,
} from "./top-controls";
import { UserMenu } from "./user-menu";

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const t = useT();
  const label = t(item.labelKey);
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0" : "px-2.5",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      <item.icon
        aria-hidden
        className={cn("size-[18px] shrink-0", active && "text-primary")}
      />
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="truncate">{label}</span>
      )}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function groupNav(nav: NavItem[]) {
  const groups: { heading?: string; items: NavItem[] }[] = [];
  for (const item of nav) {
    const last = groups[groups.length - 1];
    if (last && last.heading === item.group) last.items.push(item);
    else groups.push({ heading: item.group, items: [item] });
  }
  return groups;
}

function Sidebar({
  config,
  pathname,
}: {
  config: AreaConfig;
  pathname: string;
}) {
  const userCollapsed = usePrefsStore((s) => s.sidebarCollapsed);
  const setCollapsed = usePrefsStore((s) => s.setSidebarCollapsed);
  const groups = useMemo(() => groupNav(config.nav), [config.nav]);

  // Tablet widths always get the icon rail; desktop honours the user's choice.
  const render = (collapsed: boolean, className: string) => (
    <aside
      className={cn(
        "shrink-0 flex-col border-r border-sidebar-border bg-sidebar",
        collapsed ? "w-16" : "w-60",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "justify-center" : "gap-2.5 px-4",
        )}
      >
        <Link
          href={config.home}
          className="flex min-w-0 items-center gap-2.5 rounded-lg"
          aria-label={`${deployment.productName} ${config.name} home`}
        >
          <Emblem />
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-semibold tracking-tight">
                {deployment.productName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {config.name}
              </span>
            </span>
          )}
        </Link>
      </div>
      <nav
        aria-label={`${config.name} navigation`}
        className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-3"
      >
        {groups.map((group, index) => (
          <div key={group.heading ?? `g${index}`}>
            {group.heading && !collapsed && (
              <p className="mb-1 px-2.5 text-xs font-medium text-subtle">
                {group.heading}
              </p>
            )}
            {group.heading && collapsed && index > 0 && (
              <div
                aria-hidden
                className="mx-2 mb-3 border-t border-sidebar-border"
              />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={isNavActive(pathname, item, config.home)}
                    collapsed={collapsed}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border p-2",
          collapsed && "flex flex-col items-center gap-1",
        )}
      >
        <UserMenu variant={collapsed ? "compact" : "card"} />
        <Button
          variant="ghost"
          size={collapsed ? "icon-lg" : "sm"}
          className={cn(
            "hidden text-muted-foreground lg:inline-flex",
            !collapsed && "mt-1 w-full justify-start",
          )}
          onClick={() => setCollapsed(!userCollapsed)}
          aria-label={
            userCollapsed ? "Expand navigation" : "Collapse navigation"
          }
        >
          {userCollapsed ? (
            <PanelLeftOpen aria-hidden />
          ) : (
            <PanelLeftClose aria-hidden />
          )}
          {!collapsed && "Collapse"}
        </Button>
      </div>
    </aside>
  );

  return (
    <>
      {render(true, cn("hidden md:flex", !userCollapsed && "lg:hidden"))}
      {!userCollapsed && render(false, "hidden lg:flex")}
    </>
  );
}

function BottomNav({
  config,
  pathname,
}: {
  config: AreaConfig;
  pathname: string;
}) {
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = config.nav.filter((n) => n.primary);
  const overflow = config.nav.filter((n) => !n.primary);
  const shown = overflow.length ? primary.slice(0, 4) : primary.slice(0, 5);
  const moreActive = overflow.some((n) =>
    isNavActive(pathname, n, config.home),
  );
  const groups = useMemo(() => groupNav(config.nav), [config.nav]);

  const itemClass = (active: boolean) =>
    cn(
      "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
      active ? "text-primary" : "text-muted-foreground",
    );

  return (
    <nav
      aria-label={`${config.name} navigation`}
      className="pb-safe shrink-0 border-t border-border bg-card md:hidden"
    >
      <ul className="flex">
        {shown.map((item) => {
          const active = isNavActive(pathname, item, config.home);
          return (
            <li key={item.href} className="flex min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={itemClass(active)}
              >
                <item.icon
                  aria-hidden
                  className="size-5"
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className="max-w-full truncate">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
        {overflow.length > 0 && (
          <li className="flex min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={itemClass(moreActive)}
              aria-haspopup="dialog"
            >
              <Ellipsis aria-hidden className="size-5" />
              <span>{t("nav.more")}</span>
            </button>
          </li>
        )}
      </ul>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] gap-0 rounded-t-2xl"
        >
          <SheetHeader>
            <SheetTitle>{config.name}</SheetTitle>
            <SheetDescription>{config.subtitle}</SheetDescription>
          </SheetHeader>
          <div className="scroll-thin space-y-4 overflow-y-auto px-4 pb-6">
            {groups.map((group, index) => (
              <div key={group.heading ?? `g${index}`}>
                {group.heading && (
                  <p className="mb-1.5 text-xs font-medium text-subtle">
                    {group.heading}
                  </p>
                )}
                <ul className="grid grid-cols-2 gap-2">
                  {group.items.map((item) => {
                    const active = isNavActive(pathname, item, config.home);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-12 items-center gap-2.5 rounded-xl border px-3 text-sm font-medium",
                            active
                              ? "border-primary/50 bg-accent text-accent-foreground"
                              : "border-border bg-card",
                          )}
                        >
                          <item.icon
                            aria-hidden
                            className="size-[18px] shrink-0"
                          />
                          <span className="truncate">{t(item.labelKey)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

function CriticalAlertChip() {
  const active = useActiveIncidents();
  const critical = active.filter((i) => i.priority === "P1").length;
  if (critical === 0) return null;
  return (
    <Link
      href="/control/incidents?priority=P1"
      className="hidden h-8 items-center gap-1.5 rounded-full bg-critical-soft px-2.5 text-xs font-semibold whitespace-nowrap text-critical-fg hover:bg-critical-soft/70 sm:inline-flex"
    >
      <TriangleAlert aria-hidden className="size-3.5" />
      <span className="tnum">{critical}</span> critical
    </Link>
  );
}

function ShiftLabel() {
  const now = useNow(60_000);
  return <>{now ? shiftAt(now).label : "Shift"}</>;
}

function TopBar({ config }: { config: AreaConfig }) {
  // Shift and live-incident context belong to the operational consoles, not to administration.
  const operational = config.key === "control" || config.key === "command";
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">
      <Link
        href={config.home}
        className="flex min-w-0 items-center gap-2 md:hidden"
        aria-label={`${deployment.productName} ${config.name} home`}
      >
        <Emblem className="size-7" />
        <span className="truncate text-[15px] font-semibold tracking-tight">
          {config.console ? config.name : deployment.productName}
        </span>
      </Link>

      {config.console ? (
        <>
          <SearchButton className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-sm text-muted-foreground hover:bg-muted md:ml-0 md:w-full md:max-w-md" />
          {operational && (
            <span className="hidden items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground xl:inline-flex">
              <Clock aria-hidden className="size-3.5" /> <ShiftLabel />
            </span>
          )}
        </>
      ) : (
        <p className="hidden min-w-0 truncate text-sm text-muted-foreground md:block">
          {deployment.orgName} · {config.subtitle}
        </p>
      )}

      <div
        className={cn(
          "flex items-center gap-0.5",
          config.console ? "md:ml-auto" : "ml-auto",
        )}
      >
        {operational && <CriticalAlertChip />}
        <ConnectivityIndicator compact className="mx-1 sm:hidden" />
        <ConnectivityIndicator className="mx-1 hidden sm:inline-flex" />
        <LanguageSwitcher
          className={cn(config.console && "hidden md:inline-flex")}
        />
        <ThemeToggle className="hidden md:inline-flex" />
        <NotificationCenter />
        <UserMenu className="ml-1 md:hidden" />
      </div>
    </header>
  );
}

/** What someone sees when their role is not permitted in an area — with a way forward for the demo. */
function AccessDenied({ config }: { config: AreaConfig }) {
  const session = useSession();
  const switchPersona = useSwitchPersona();
  const target = personaById(config.defaultPersonaId);
  return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-card">
        <RestrictedState
          title={`${config.name} is restricted`}
          description={
            <>
              You are signed in as{" "}
              <span className="font-medium text-foreground">
                {session.persona.name}
              </span>
              . Your role does not permit access to this area. The attempt has
              been recorded.
            </>
          }
          action={
            <>
              <Button
                size="lg"
                onClick={() => switchPersona(target.id, config.home)}
              >
                Continue as {target.name}
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={ROLE_HOME[session.role].href}>
                  Back to my workspace
                </Link>
              </Button>
            </>
          }
        />
      </div>
    </div>
  );
}

/** Shown when the app is configured to use the API and the server does not answer. It keeps retrying. */
function ServerUnreachable() {
  return (
    <div className="grid h-[calc(100dvh-var(--banner-h))] place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-card">
        <ErrorState
          offline
          title="Cannot reach the platform server"
          description="The app is set up to use the API, and it is not answering. Start it with npm run dev:full (or npm run api:dev). This screen reconnects by itself."
        />
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div
      className="flex h-[calc(100dvh-var(--banner-h))]"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="hidden w-16 shrink-0 border-r border-border bg-sidebar md:block lg:w-60" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
          <Skeleton className="size-7 rounded-lg md:hidden" />
          <Skeleton className="h-8 w-56 max-w-[50%]" />
          <Skeleton className="ml-auto size-8 rounded-full" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * Frame shared by every role area: sidebar on desktop, icon rail on tablet, bottom bar on phones.
 *
 * The frame is a fixed viewport-height column, so `<main>` is the scroll container. Ordinary pages
 * just render content (wrap it in `PageContainer`); full-bleed views use `h-full` and manage their
 * own panels.
 *
 * Everything inside renders on the client after mount: the demo's data, clock, language and persona
 * all live in the browser, so there is nothing meaningful to server-render.
 */
export function AppShell({
  area,
  children,
}: {
  area: AreaKey;
  children: ReactNode;
}) {
  const config = AREAS_CONFIG[area];
  const mounted = useMounted();
  const pathname = usePathname();
  const session = useSession();
  const connectivity = usePrefsStore((s) => s.connectivity);
  const t = useT();

  const api = useApiStatus();

  if (!mounted) return <ShellSkeleton />;
  // With the API, wait for this persona's own data before drawing anything. The exception is the
  // demo's simulated "offline": there the app must still open and show what the device holds.
  if (
    API_MODE &&
    api.readyFor !== session.persona.id &&
    connectivity !== "offline"
  ) {
    return api.unreachable ? <ServerUnreachable /> : <ShellSkeleton />;
  }
  const allowed = config.roles.includes(session.role);

  return (
    <div className="flex h-[calc(100dvh-var(--banner-h))] overflow-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-10 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      {allowed && <Sidebar config={config} pathname={pathname} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar config={config} />
        {connectivity === "offline" && (
          <p
            role="alert"
            className="flex shrink-0 items-center justify-center gap-2 bg-critical-soft px-4 py-1.5 text-center text-xs font-medium text-critical-fg"
          >
            <WifiOff aria-hidden className="size-3.5 shrink-0" />{" "}
            {t("net.offlineBody")}
          </p>
        )}
        <main
          id="main"
          tabIndex={-1}
          className="scroll-thin relative min-h-0 flex-1 overflow-y-auto outline-none"
        >
          {allowed ? (
            <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
          ) : (
            <AccessDenied config={config} />
          )}
        </main>
        {allowed && <BottomNav config={config} pathname={pathname} />}
      </div>
      <CommandPalette />
    </div>
  );
}
