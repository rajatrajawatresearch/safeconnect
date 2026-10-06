"use client";

import { ArrowRight, ChevronRight, Route } from "lucide-react";
import Link from "next/link";
import { Panel } from "@/components/shared/page";
import { BlankState } from "@/components/shared/states";
import { ToneChip } from "@/components/shared/status-chips";
import { useT } from "@/hooks/use-t";
import { formatDateTime } from "@/lib/format";
import type { Journey } from "@/types";
import { JOURNEY_STATUS_META, journeyMinutes } from "./journey-model";

/** Journeys that have ended, newest first. Each opens in the activity history. */
export function PastJourneys({ journeys }: { journeys: Journey[] }) {
  const t = useT();
  return (
    <section aria-labelledby="past-journeys-title">
      <h2 id="past-journeys-title" className="mb-3 text-lg font-semibold">
        {t("journey.past.title")}
      </h2>
      {journeys.length === 0 ? (
        <Panel className="rounded-2xl">
          <BlankState
            compact
            icon={Route}
            title={t("journey.past.empty.title")}
            description={t("journey.past.empty.body")}
          />
        </Panel>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {journeys.map((journey) => {
            const meta = JOURNEY_STATUS_META[journey.status];
            return (
              <li key={journey.id}>
                <Link
                  href={`/citizen/activity?tab=journeys&id=${journey.id}`}
                  className="flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-input"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Route aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-1.5 text-base font-medium">
                      <span className="min-w-0 truncate">
                        {journey.from.label}
                      </span>
                      <ArrowRight
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      <span className="sr-only">{t("journey.to")}</span>
                      <span className="min-w-0 truncate">
                        {journey.destination.label}
                      </span>
                    </span>
                    <span className="tnum mt-0.5 block text-sm text-muted-foreground">
                      {formatDateTime(journey.startedAt)} ·{" "}
                      {t("journey.minutes", { n: journeyMinutes(journey) })}
                    </span>
                    <ToneChip tone={meta.tone} dot className="mt-2">
                      {t(meta.label)}
                    </ToneChip>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
