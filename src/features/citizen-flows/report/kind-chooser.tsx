"use client";

import {
  ArrowRight,
  Building2,
  Check,
  ListChecks,
  Radio,
  SearchX,
  Siren,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/shared/category-icon";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { TONE } from "@/config/incident";
import { useT } from "@/hooks/use-t";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { IncidentCategory } from "@/types";
import { DemoRecordNote, Notice } from "../ui";
import { KIND_META, REPORT_KINDS, type ReportKind } from "./model";

/** What each bullet under a kind is about: speed and follow-up, routing and tracking, identity and tracking. */
const POINT_ICONS: Record<ReportKind, [LucideIcon, LucideIcon]> = {
  emergency: [Radio, UserCheck],
  report: [Building2, ListChecks],
  tip: [UserX, SearchX],
};

/** The three kinds as large buttons. `compact` is the list used inside the "change type" dialog. */
export function KindOptions({
  onSelect,
  selected,
  compact,
}: {
  onSelect: (kind: ReportKind) => void;
  selected?: ReportKind;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <ul className={cn("grid gap-3", !compact && "lg:grid-cols-3")}>
      {REPORT_KINDS.map((kind) => {
        const meta = KIND_META[kind];
        const isSelected = selected === kind;
        return (
          <li key={kind} className="flex">
            <button
              type="button"
              onClick={() => onSelect(kind)}
              aria-pressed={selected ? isSelected : undefined}
              className={cn(
                "group flex w-full flex-col rounded-2xl border bg-card text-left transition-colors hover:border-input",
                compact ? "p-4" : "p-5 shadow-card",
                isSelected ? "border-primary bg-accent/50" : "border-border",
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid shrink-0 place-items-center rounded-xl",
                    compact ? "size-10" : "size-12",
                    TONE[meta.tone].soft,
                  )}
                >
                  <meta.icon
                    aria-hidden
                    className={compact ? "size-5" : "size-6"}
                  />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 font-semibold",
                    compact ? "text-base" : "text-lg",
                  )}
                >
                  {t(meta.title)}
                </span>
                {isSelected ? (
                  <Check aria-hidden className="size-5 shrink-0 text-primary" />
                ) : (
                  <ArrowRight
                    aria-hidden
                    className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                )}
              </span>
              <span
                className={cn(
                  "mt-3 block leading-relaxed text-muted-foreground",
                  compact ? "text-sm" : "text-[15px]",
                )}
              >
                {t(meta.body)}
              </span>
              {!compact && (
                <span className="mt-4 block space-y-2 border-t border-border/70 pt-4">
                  {meta.points.map((point, index) => {
                    const PointIcon = POINT_ICONS[kind][index];
                    return (
                      <span
                        key={point}
                        className="flex items-start gap-2 text-sm font-medium"
                      >
                        <PointIcon
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        />
                        {t(point)}
                      </span>
                    );
                  })}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const COMPARE: { aspect: TKey; report: TKey; tip: TKey }[] = [
  {
    aspect: "report.compare.identity",
    report: "report.compare.identity.report",
    tip: "report.compare.identity.tip",
  },
  {
    aspect: "report.compare.tracking",
    report: "report.compare.tracking.report",
    tip: "report.compare.tracking.tip",
  },
  {
    aspect: "report.compare.followUp",
    report: "report.compare.followUp.report",
    tip: "report.compare.followUp.tip",
  },
  {
    aspect: "report.compare.record",
    report: "report.compare.record.report",
    tip: "report.compare.record.tip",
  },
  {
    aspect: "report.compare.legal",
    report: "report.compare.legal.both",
    tip: "report.compare.legal.both",
  },
];

/** Makes the difference between a report and a confidential tip impossible to miss. */
function ReportOrTip() {
  const t = useT();
  return (
    <Panel
      aria-labelledby="report-compare-title"
      className="rounded-2xl p-5 sm:p-6"
    >
      <h2 id="report-compare-title" className="text-lg font-semibold">
        {t("report.compare.title")}
      </h2>
      <p className="mt-1 text-[15px] text-muted-foreground">
        {t("report.compare.body")}
      </p>

      {/* From md up the comparison reads as a table. */}
      <table className="mt-4 hidden w-full table-fixed text-left text-[15px] md:table">
        <thead>
          <tr className="border-b border-border text-sm text-muted-foreground">
            <th scope="col" className="w-1/4 py-2 pr-4 font-medium">
              <span className="sr-only">{t("report.compare.aspect")}</span>
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              {t("report.compare.report")}
            </th>
            <th scope="col" className="py-2 font-medium">
              {t("report.compare.tip")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {COMPARE.map((row) => (
            <tr key={row.aspect}>
              <th
                scope="row"
                className="py-3 pr-4 align-top font-normal text-muted-foreground"
              >
                {t(row.aspect)}
              </th>
              <td className="py-3 pr-4 align-top font-medium">
                {t(row.report)}
              </td>
              <td className="py-3 align-top font-medium">{t(row.tip)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* On phones each kind gets its own short list. */}
      <div className="mt-4 grid gap-3 md:hidden">
        {(["report", "tip"] as const).map((column) => (
          <div
            key={column}
            className="rounded-xl border border-border bg-inset p-4"
          >
            <h3 className="text-base font-semibold">
              {t(
                column === "report"
                  ? "report.compare.report"
                  : "report.compare.tip",
              )}
            </h3>
            <dl className="mt-2 space-y-2">
              {COMPARE.map((row) => (
                <div key={row.aspect}>
                  <dt className="text-[13px] text-muted-foreground">
                    {t(row.aspect)}
                  </dt>
                  <dd className="text-[15px] font-medium">{t(row[column])}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <DemoRecordNote className="mt-4" />
    </Panel>
  );
}

export function KindChooser({
  onSelect,
  category,
}: {
  onSelect: (kind: ReportKind) => void;
  /** Category carried in from a shortcut elsewhere in the app. */
  category?: IncidentCategory;
}) {
  const t = useT();
  return (
    <PageContainer width="wide">
      <PageHeader
        title={t("report.title")}
        description={t("report.subtitle")}
      />

      <div className="space-y-6">
        <Notice
          tone="critical"
          icon={Siren}
          actionBeside
          title={t("report.sosHint.title")}
          action={
            <Button asChild variant="critical" size="xl">
              <Link href="/citizen/sos">
                {t("report.sosHint.action")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        >
          {t("report.sosHint.body")}
        </Notice>

        <section aria-labelledby="report-choose-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 id="report-choose-title" className="text-lg font-semibold">
              {t("report.choose.title")}
            </h2>
            {category && (
              <p className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm">
                <CategoryIcon
                  categoryId={category.id}
                  className="text-muted-foreground"
                />
                <span className="text-muted-foreground">
                  {t("report.choose.about")}
                </span>
                <span className="font-medium">{category.label}</span>
              </p>
            )}
          </div>
          <KindOptions onSelect={onSelect} />
        </section>

        <ReportOrTip />
      </div>
    </PageContainer>
  );
}
