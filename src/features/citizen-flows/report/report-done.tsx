"use client";

import {
  ArrowRight,
  CircleCheck,
  EyeOff,
  Paperclip,
  Siren,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { PageContainer, Panel } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/use-t";
import { CopyButton, DemoRecordNote, Notice } from "../ui";
import { KIND_META } from "./model";
import type { SubmitResult } from "./submit";

/** Confirmation after a report, complaint or tip has been recorded: the reference and what follows. */
export function ReportDone({
  result,
  onAnother,
}: {
  result: SubmitResult;
  onAnother: () => void;
}) {
  const t = useT();
  const meta = KIND_META[result.kind];
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <PageContainer width="narrow">
      <div className="space-y-5">
        <Panel className="rounded-2xl p-6 text-center sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-resolved-soft text-resolved-fg">
            <CircleCheck aria-hidden className="size-7" />
          </span>
          <h1
            ref={heading}
            tabIndex={-1}
            className="mt-4 text-2xl font-semibold tracking-tight outline-none"
          >
            {t(meta.doneTitle)}
          </h1>
          <p role="status" className="sr-only">
            {t(meta.doneTitle)}. {t("report.done.reference")}:{" "}
            {result.reference}
          </p>

          <div className="mx-auto mt-5 flex max-w-md flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-inset px-4 py-3 text-left">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                {t("report.done.reference")}
              </p>
              <p className="tnum font-mono text-lg font-semibold break-all">
                {result.reference}
              </p>
            </div>
            <CopyButton value={result.reference} />
          </div>
        </Panel>

        {result.kind === "tip" && (
          <Notice
            tone="neutral"
            icon={EyeOff}
            title={t("report.done.tipTitle")}
          >
            {t("report.done.tipNote")}
          </Notice>
        )}

        {result.danger && (
          <Notice
            tone="critical"
            icon={Siren}
            actionBeside
            title={t("report.done.dangerTitle")}
            action={
              <Button asChild variant="critical" size="xl">
                <Link href="/citizen/sos">
                  {t("report.sosHint.action")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
          >
            {t("report.done.dangerBody")}
          </Notice>
        )}

        {result.failedUploads > 0 && (
          <Notice tone="high" icon={Paperclip} role="alert">
            {t("report.done.uploadsFailed", { count: result.failedUploads })}
          </Notice>
        )}

        <Panel
          aria-labelledby="report-next-title"
          className="rounded-2xl p-5 sm:p-6"
        >
          <h2 id="report-next-title" className="text-lg font-semibold">
            {t("report.done.next")}
          </h2>
          <ol className="mt-4 space-y-4">
            {meta.next.map((line, index) => (
              <li key={line} className="flex gap-3">
                <span
                  aria-hidden
                  className="tnum grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
                >
                  {index + 1}
                </span>
                <p className="pt-0.5 text-[15px] leading-relaxed">
                  {t(line, { station: result.stationName })}
                </p>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {result.kind === "report" && result.complaintId && (
            <Button asChild size="xl">
              <Link href={`/citizen/complaints?id=${result.complaintId}`}>
                {t("report.done.track")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          )}
          {result.kind === "emergency" && result.incidentId && (
            <Button asChild size="xl">
              <Link href={`/citizen/activity?id=${result.incidentId}`}>
                {t("report.done.viewActivity")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          )}
          <Button
            type="button"
            variant={result.kind === "tip" ? "default" : "outline"}
            size="xl"
            onClick={onAnother}
          >
            {t("report.done.another")}
          </Button>
          <Button asChild variant="ghost" size="xl">
            <Link href="/citizen">{t("report.done.home")}</Link>
          </Button>
        </div>

        <DemoRecordNote />
      </div>
    </PageContainer>
  );
}
