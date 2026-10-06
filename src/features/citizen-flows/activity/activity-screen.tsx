"use client";

import {
  Bell,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  History,
  MousePointerClick,
  Route,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import {
  BlankState,
  EmptyState,
  RestrictedState,
} from "@/components/shared/states";
import {
  ComplaintStatusChip,
  StatusChip,
  ToneChip,
} from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { STATUS_META } from "@/config/incident";
import { JOURNEY_STATUS_META } from "@/features/journey/journey-model";
import { useAction } from "@/hooks/use-action";
import { useCitizenIncidents, useNotifications } from "@/hooks/use-demo-data";
import { useIsLg } from "@/hooks/use-mounted";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { formatTime } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import { ChoiceChip, OfflineNote } from "../ui";
import { ActivityDetail, useItemHeading } from "./activity-detail";
import {
  TABS,
  buildActivity,
  groupByDay,
  tabFromParam,
  type ActivityItem,
  type ActivityTab,
} from "./activity-model";

const BASE = "/citizen/activity";

function hrefFor(tab: ActivityTab, id?: string) {
  const query = new URLSearchParams();
  if (tab !== "all") query.set("tab", tab);
  if (id) query.set("id", id);
  const text = query.toString();
  return text ? `${BASE}?${text}` : BASE;
}

const EMPTY: Record<
  ActivityTab,
  {
    icon: LucideIcon;
    title: TKey;
    body: TKey;
    action?: { label: TKey; href: string };
  }
> = {
  all: {
    icon: History,
    title: "activity.empty.all.title",
    body: "activity.empty.all.body",
  },
  emergencies: {
    icon: ShieldCheck,
    title: "activity.empty.emergencies.title",
    body: "activity.empty.emergencies.body",
  },
  reports: {
    icon: ClipboardList,
    title: "activity.empty.reports.title",
    body: "activity.empty.reports.body",
    action: { label: "activity.empty.reports.action", href: "/citizen/report" },
  },
  journeys: {
    icon: Route,
    title: "activity.empty.journeys.title",
    body: "activity.empty.journeys.body",
    action: {
      label: "activity.empty.journeys.action",
      href: "/citizen/journey",
    },
  },
  notifications: {
    icon: Bell,
    title: "activity.empty.notifications.title",
    body: "activity.empty.notifications.body",
  },
};

const TYPE_ICON: Record<
  Exclude<ActivityItem["type"], "incident">,
  LucideIcon
> = {
  complaint: ClipboardList,
  journey: Route,
  notification: Bell,
};

function ActivityRow({
  item,
  href,
  selected,
  unread,
  onOpen,
}: {
  item: ActivityItem;
  href: string;
  selected: boolean;
  unread: boolean;
  onOpen: () => void;
}) {
  const t = useT();
  const { title, kind } = useItemHeading(item);
  const active =
    item.type === "incident" && STATUS_META[item.incident.status].active;

  let detail: string | undefined;
  let chip: React.ReactNode = null;
  if (item.type === "incident") {
    detail = item.incident.location.area;
    chip = <StatusChip status={item.incident.status} />;
  } else if (item.type === "complaint") {
    detail = item.complaint.id;
    chip = <ComplaintStatusChip status={item.complaint.status} />;
  } else if (item.type === "journey") {
    const meta = JOURNEY_STATUS_META[item.journey.status];
    chip = (
      <ToneChip tone={meta.tone} dot>
        {t(meta.label)}
      </ToneChip>
    );
  } else {
    detail = item.notification.body;
  }
  const TypeIcon = item.type === "incident" ? null : TYPE_ICON[item.type];

  return (
    <Link
      href={href}
      scroll={false}
      replace
      onClick={onOpen}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-card transition-colors hover:border-input",
        selected ? "border-primary bg-accent/40" : "border-border",
      )}
    >
      <span
        className={cn(
          "relative grid size-10 shrink-0 place-items-center rounded-xl",
          active
            ? "bg-critical-soft text-critical-fg"
            : "bg-muted text-muted-foreground",
        )}
      >
        {item.type === "incident" ? (
          <CategoryIcon
            categoryId={item.incident.categoryId}
            className="size-5"
          />
        ) : (
          TypeIcon && <TypeIcon aria-hidden className="size-5" />
        )}
        {unread && (
          <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-primary">
            <span className="sr-only">{t("activity.unread")}</span>
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm text-muted-foreground">{kind}</span>
          <time
            dateTime={new Date(item.at).toISOString()}
            className="tnum shrink-0 text-sm text-muted-foreground"
          >
            {formatTime(item.at)}
          </time>
        </span>
        <span
          className={cn(
            "mt-0.5 line-clamp-2 block text-base leading-snug",
            item.type === "notification" && !unread
              ? "font-medium"
              : "font-semibold",
          )}
        >
          {title}
        </span>
        {detail && (
          <span
            className={cn(
              "mt-0.5 block text-sm text-muted-foreground",
              item.type === "complaint"
                ? "tnum truncate font-mono text-[13px]"
                : "line-clamp-2",
            )}
          >
            {detail}
          </span>
        )}
        {chip && <span className="mt-2 flex">{chip}</span>}
      </span>
      <ChevronRight
        aria-hidden
        className="mt-2.5 size-5 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}

/** One chronological history of everything the citizen has raised, shared or been told. */
export function ActivityScreen() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const isLg = useIsLg();
  const now = useNow(60_000);
  const session = useSession();
  const citizen = session.citizen;
  const incidents = useCitizenIncidents(citizen?.id);
  const allComplaints = useDemoStore((s) => s.complaints);
  const allJourneys = useDemoStore((s) => s.journeys);
  const { items: notifications, unread } = useNotifications(session);
  const markAll = useAction(services.notifications.markAllRead);

  const items = useMemo(
    () =>
      buildActivity({
        incidents,
        complaints: allComplaints.filter((c) => c.citizenId === citizen?.id),
        journeys: allJourneys.filter((j) => j.citizenId === citizen?.id),
        notifications,
      }),
    [incidents, allComplaints, allJourneys, notifications, citizen?.id],
  );
  const unreadIds = useMemo(() => new Set(unread.map((n) => n.id)), [unread]);

  const tab = tabFromParam(params.get("tab"));
  const tabType = TABS.find((x) => x.id === tab)?.type ?? null;
  const visible = useMemo(
    () => (tabType ? items.filter((i) => i.type === tabType) : items),
    [items, tabType],
  );
  const groups = useMemo(() => groupByDay(visible, now), [visible, now]);

  const requestedId = params.get("id");
  const requested = requestedId
    ? items.find((i) => i.id === requestedId)
    : undefined;
  // From lg up the side panel shows the newest entry until the citizen picks one.
  const selected = requested ?? (isLg && !requestedId ? visible[0] : undefined);
  const heading = useItemHeading(selected);

  if (!citizen)
    return (
      <PageContainer width="narrow">
        <RestrictedState />
      </PageContainer>
    );

  const close = () => router.replace(hrefFor(tab), { scroll: false });
  const open = (item: ActivityItem) => {
    if (item.type === "notification" && unreadIds.has(item.id))
      void services.notifications
        .markRead(item.id, citizen.id)
        .catch(() => undefined);
  };
  const empty = EMPTY[tab];

  return (
    <PageContainer width="wide">
      <PageHeader
        title={t("activity.title")}
        description={t("activity.subtitle")}
      />

      <div
        role="radiogroup"
        aria-label={t("activity.tab.label")}
        className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
      >
        {TABS.map((x) => {
          const count = x.type
            ? items.filter((i) => i.type === x.type).length
            : items.length;
          return (
            <ChoiceChip
              key={x.id}
              type="radio"
              name="activity-tab"
              value={x.id}
              checked={tab === x.id}
              onToggle={(value) =>
                router.replace(hrefFor(value), { scroll: false })
              }
              className="shrink-0 whitespace-nowrap"
            >
              {t(x.label)}
              <span className="tnum text-muted-foreground">{count}</span>
              {x.id === "notifications" && unread.length > 0 && (
                <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {unread.length}
                  <span className="sr-only"> {t("activity.unread")}</span>
                </span>
              )}
            </ChoiceChip>
          );
        })}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_30rem]">
        <section aria-label={t("activity.title")} className="min-w-0 space-y-5">
          <OfflineNote />

          {tab === "notifications" && unread.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="lg"
                className="h-11 px-3.5"
                disabled={markAll.pending}
                onClick={() =>
                  markAll.run(
                    unread.map((n) => n.id),
                    citizen.id,
                  )
                }
              >
                <CheckCheck aria-hidden />
                {t("notifications.markAll")}
              </Button>
            </div>
          )}

          {visible.length === 0 ? (
            <Panel className="rounded-2xl">
              <EmptyState
                icon={empty.icon}
                title={t(empty.title)}
                description={t(empty.body)}
                action={
                  empty.action && (
                    <Button asChild size="xl">
                      <Link href={empty.action.href}>
                        {t(empty.action.label)}
                      </Link>
                    </Button>
                  )
                }
              />
            </Panel>
          ) : (
            groups.map((group) => (
              <div key={group.key}>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                  {group.relative === "today"
                    ? t("activity.day.today")
                    : group.relative === "yesterday"
                      ? t("activity.day.yesterday")
                      : group.label}
                </h2>
                <ul className="space-y-3">
                  {group.items.map((item) => (
                    <li key={`${item.type}-${item.id}`}>
                      <ActivityRow
                        item={item}
                        href={hrefFor(tab, item.id)}
                        selected={isLg && selected?.id === item.id}
                        unread={unreadIds.has(item.id)}
                        onOpen={() => open(item)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <aside
          aria-label={t("activity.detail.label")}
          className="scroll-thin hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-var(--banner-h)-6.5rem)] lg:overflow-y-auto"
        >
          <Panel className="rounded-2xl p-5">
            {selected ? (
              <>
                <p className="text-sm text-muted-foreground">{heading.kind}</p>
                <h2 className="mt-1 mb-4 text-xl font-semibold tracking-tight break-words">
                  {heading.title}
                </h2>
                <ActivityDetail key={selected.id} item={selected} />
              </>
            ) : (
              <BlankState
                icon={MousePointerClick}
                title={
                  requestedId
                    ? t("activity.notFound")
                    : t("activity.select.title")
                }
                description={t("activity.select.body")}
              />
            )}
          </Panel>
        </aside>
      </div>

      {/* Below lg the detail opens as a bottom sheet over the list. */}
      <Sheet
        open={!isLg && Boolean(requested)}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] gap-0 rounded-t-2xl"
        >
          <SheetHeader className="pr-12">
            <SheetDescription>{heading.kind}</SheetDescription>
            <SheetTitle className="text-lg font-semibold break-words">
              {heading.title}
            </SheetTitle>
          </SheetHeader>
          <div className="scroll-thin pb-safe overflow-y-auto px-4">
            <div className="pb-6">
              {requested && (
                <ActivityDetail key={requested.id} item={requested} />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
