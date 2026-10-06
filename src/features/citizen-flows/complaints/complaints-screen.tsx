"use client";

import {
  Building2,
  ChevronRight,
  ClipboardList,
  FilePlus2,
  MessageSquareWarning,
  Search,
  SearchX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import {
  BlankState,
  EmptyState,
  RestrictedState,
} from "@/components/shared/states";
import { ComplaintStatusChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stationById } from "@/data/demo/geo";
import { useCategoryLookup, useCitizenIncidents } from "@/hooks/use-demo-data";
import { useIsLg } from "@/hooks/use-mounted";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { formatDate } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import type { Complaint, ComplaintStatus } from "@/types";
import { ChoiceChip, DemoRecordNote, OfflineNote } from "../ui";
import { ComplaintDetail } from "./complaint-detail";

type Filter = "all" | "open" | "info" | "done";

const FILTERS: {
  id: Filter;
  label: TKey;
  match: (status: ComplaintStatus) => boolean;
}[] = [
  { id: "all", label: "complaints.filter.all", match: () => true },
  {
    id: "open",
    label: "complaints.filter.open",
    match: (s) => s !== "resolved" && s !== "closed" && s !== "info_required",
  },
  {
    id: "info",
    label: "complaints.filter.info",
    match: (s) => s === "info_required",
  },
  {
    id: "done",
    label: "complaints.filter.done",
    match: (s) => s === "resolved" || s === "closed",
  },
];

const LIST_HREF = "/citizen/complaints";
const hrefFor = (id: string) => `${LIST_HREF}?id=${encodeURIComponent(id)}`;

function ComplaintCard({
  complaint,
  selected,
}: {
  complaint: Complaint;
  selected: boolean;
}) {
  const t = useT();
  const lookup = useCategoryLookup();
  const station = stationById(complaint.stationId);
  const needsInput = complaint.status === "info_required";
  return (
    <Link
      href={hrefFor(complaint.id)}
      scroll={false}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "relative block rounded-2xl border bg-card p-4 shadow-card transition-colors hover:border-input",
        selected ? "border-primary bg-accent/40" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <ComplaintStatusChip status={complaint.status} />
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground"
        />
      </div>
      <p className="mt-2.5 line-clamp-2 text-base leading-snug font-semibold">
        {complaint.title}
      </p>
      <p className="tnum mt-1 truncate font-mono text-[13px] text-muted-foreground">
        {complaint.id}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <CategoryIcon categoryId={complaint.categoryId} />
          <span className="truncate">
            {lookup(complaint.categoryId)?.short ?? complaint.categoryId}
          </span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Building2 aria-hidden className="size-4 shrink-0" />
          <span className="truncate">
            {station?.name ?? complaint.department}
          </span>
        </span>
        <span className="whitespace-nowrap">
          {t("complaints.submittedOn", {
            date: formatDate(complaint.submittedAt),
          })}
        </span>
      </div>
      {needsInput && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-high-soft px-3 py-2 text-sm font-medium text-high-fg">
          <MessageSquareWarning aria-hidden className="size-4 shrink-0" />
          {t("complaints.info.requestedTitle")}
        </p>
      )}
    </Link>
  );
}

/** Complaint tracking: the citizen's own complaints, with status, updates and documents for each. */
export function ComplaintsScreen() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const isLg = useIsLg();
  const { citizen } = useSession();
  const complaints = useDemoStore((s) => s.complaints);
  const incidents = useCitizenIncidents(citizen?.id);
  const lookup = useCategoryLookup();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const mine = useMemo(
    () =>
      citizen
        ? complaints
            .filter((c) => c.citizenId === citizen.id)
            .sort((a, b) => b.submittedAt - a.submittedAt)
        : [],
    [complaints, citizen],
  );

  const filtered = useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter)?.match ?? (() => true);
    const term = query.trim().toLowerCase();
    return mine.filter((c) => {
      if (!match(c.status)) return false;
      if (!term) return true;
      return [
        c.id,
        c.title,
        c.department,
        lookup(c.categoryId)?.label,
        stationById(c.stationId)?.name,
      ].some((text) => text?.toLowerCase().includes(term));
    });
  }, [mine, filter, query, lookup]);

  if (!citizen)
    return (
      <PageContainer width="narrow">
        <RestrictedState />
      </PageContainer>
    );

  const requestedId = params.get("id");
  const requested = requestedId
    ? mine.find((c) => c.id === requestedId)
    : undefined;
  // From lg up the panel is never left empty: with nothing asked for, the first complaint is shown.
  const selected =
    requested ?? (isLg && !requestedId ? filtered[0] : undefined);
  const notFound = Boolean(requestedId) && !requested;
  const backToList = () => router.push(LIST_HREF, { scroll: false });

  const detail = selected ? (
    <ComplaintDetail
      key={selected.id}
      complaint={selected}
      linkedIncidentVisible={incidents.some(
        (i) => i.id === selected.linkedIncidentId,
      )}
      onBack={isLg ? undefined : backToList}
    />
  ) : notFound ? (
    <Panel className="rounded-2xl">
      {!isLg && <h1 className="sr-only">{t("complaints.title")}</h1>}
      <BlankState
        icon={SearchX}
        title={t("complaints.notFound.title")}
        description={t("complaints.notFound.body")}
        action={
          <Button size="xl" variant="outline" onClick={backToList}>
            {t("complaints.notFound.action")}
          </Button>
        }
      />
    </Panel>
  ) : null;

  // On phones a complaint opens as its own page; the list comes back with the back control.
  if (!isLg && requestedId)
    return <PageContainer width="narrow">{detail}</PageContainer>;

  const clearFilters = () => {
    setFilter("all");
    setQuery("");
  };

  return (
    <PageContainer width="wide">
      <PageHeader
        title={t("complaints.title")}
        description={t("complaints.subtitle")}
        actions={
          <Button asChild size="xl">
            <Link href="/citizen/report?type=report">
              <FilePlus2 aria-hidden />
              {t("complaints.new")}
            </Link>
          </Button>
        }
      />

      {mine.length === 0 ? (
        <Panel className="rounded-2xl">
          <EmptyState
            icon={ClipboardList}
            title={t("complaints.empty.title")}
            description={t("complaints.empty.body")}
            action={
              <Button asChild size="xl">
                <Link href="/citizen/report">
                  {t("complaints.empty.action")}
                </Link>
              </Button>
            }
          />
          <DemoRecordNote className="border-t border-border px-5 py-4" />
        </Panel>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
          <section
            aria-label={t("complaints.title")}
            className="scroll-thin space-y-4 lg:sticky lg:top-6 lg:-m-1 lg:max-h-[calc(100dvh-var(--banner-h)-6.5rem)] lg:overflow-y-auto lg:p-1"
          >
            <OfflineNote />
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("complaints.search")}
                aria-label={t("complaints.search")}
                className="h-12 rounded-xl bg-card pr-11 pl-10 text-base md:text-base dark:bg-card"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("complaints.clearSearch")}
                  className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </div>

            <div
              role="radiogroup"
              aria-label={t("complaints.filter.label")}
              className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
            >
              {FILTERS.map((f) => (
                <ChoiceChip
                  key={f.id}
                  type="radio"
                  name="complaint-filter"
                  value={f.id}
                  checked={filter === f.id}
                  onToggle={(value) => setFilter(value)}
                  className="shrink-0 whitespace-nowrap"
                >
                  {t(f.label)}
                  <span className="tnum text-muted-foreground">
                    {mine.filter((c) => f.match(c.status)).length}
                  </span>
                </ChoiceChip>
              ))}
            </div>

            {filtered.length === 0 ? (
              <Panel className="rounded-2xl">
                <BlankState
                  compact
                  icon={SearchX}
                  title={t("complaints.noMatch.title")}
                  description={t("complaints.noMatch.body")}
                  action={
                    <Button variant="outline" size="xl" onClick={clearFilters}>
                      {t("complaints.noMatch.action")}
                    </Button>
                  }
                />
              </Panel>
            ) : (
              <ul className="space-y-3">
                {filtered.map((complaint) => (
                  <li key={complaint.id}>
                    <ComplaintCard
                      complaint={complaint}
                      selected={isLg && selected?.id === complaint.id}
                    />
                  </li>
                ))}
              </ul>
            )}

            <DemoRecordNote />
          </section>

          <div className="hidden min-w-0 lg:block">
            {detail ?? (
              <Panel className="rounded-2xl">
                <BlankState
                  icon={ClipboardList}
                  title={t("complaints.select.title")}
                  description={t("complaints.select.body")}
                />
              </Panel>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
