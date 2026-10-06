"use client";

import { ArrowRight, CircleCheckBig, CircleSlash } from "lucide-react";
import Link from "next/link";
import { Timeline } from "@/components/shared/timeline";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/use-t";
import { formatDuration, formatTime } from "@/lib/format";
import type { Incident } from "@/types";
import { endedAt, useSosUi } from "./sos-ui-store";

/** How the store words a resolution the citizen made themselves. */
const SAFE_PREFIX = "Citizen confirmed they are safe.";

/** The calm ending: what happened, when, and where the record now lives. */
export function SosClosure({ incident }: { incident: Incident }) {
  const t = useT();
  const dismiss = useSosUi((s) => s.dismiss);
  const cancelled = incident.status === "cancelled";
  const markedSafe =
    !cancelled &&
    incident.timeline.some(
      (e) => e.kind === "resolved" && e.title.startsWith("Citizen confirmed"),
    );
  const end = endedAt(incident);
  // The record is written in the control room's voice. Show the citizen only what they said.
  const detail = cancelled
    ? incident.cancelReason
    : markedSafe
      ? incident.resolution?.replace(SAFE_PREFIX, "").trim()
      : incident.resolution;
  const Icon = cancelled ? CircleSlash : CircleCheckBig;

  return (
    <div className="mx-auto grid min-h-full w-full max-w-5xl grid-cols-1 content-center gap-5 px-4 py-6 sm:px-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start lg:px-8">
      <section
        aria-labelledby="closure-title"
        className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7"
      >
        <span
          className={
            cancelled
              ? "grid size-14 place-items-center rounded-full bg-muted text-muted-foreground"
              : "grid size-14 place-items-center rounded-full bg-resolved-soft text-resolved-fg"
          }
        >
          <Icon aria-hidden className="size-7" />
        </span>
        <h1
          id="closure-title"
          className="mt-4 text-2xl leading-tight font-semibold tracking-tight sm:text-3xl"
        >
          {t(
            cancelled
              ? "citizen.closure.cancelTitle"
              : markedSafe
                ? "citizen.closure.safeTitle"
                : "citizen.closure.resolvedTitle",
          )}
        </h1>
        <p className="mt-2 max-w-prose text-base leading-relaxed text-muted-foreground">
          {t("citizen.closure.body")}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border/70 pt-5 text-[15px]">
          <div className="col-span-2 min-w-0">
            <dt className="text-sm text-muted-foreground">
              {t("citizen.sos.incidentId")}
            </dt>
            <dd className="mt-0.5 truncate font-mono font-medium">
              {incident.id}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              {t("citizen.sos.raisedAt")}
            </dt>
            <dd className="tnum mt-0.5 font-mono font-medium">
              {formatTime(incident.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              {t("citizen.closure.ended")}
            </dt>
            <dd className="tnum mt-0.5 font-mono font-medium">
              {formatTime(end)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              {t("citizen.closure.duration")}
            </dt>
            <dd className="tnum mt-0.5 font-mono font-medium">
              {formatDuration((end - incident.createdAt) / 1000)}
            </dd>
          </div>
          {detail && (
            <div className="col-span-2">
              <dt className="text-sm text-muted-foreground">
                {t(
                  cancelled || markedSafe
                    ? "citizen.closure.reason"
                    : "citizen.closure.outcome",
                )}
              </dt>
              <dd className="mt-0.5 leading-relaxed">{detail}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Button asChild size="xl" className="sm:flex-1">
            <Link href="/citizen/activity">
              {t("citizen.closure.viewActivity")} <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="xl"
            className="sm:flex-1"
            onClick={() => dismiss(incident.id)}
          >
            {t("citizen.closure.done")}
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("citizen.closure.again")}
        </p>
      </section>

      <section
        aria-labelledby="closure-timeline"
        className="rounded-2xl border border-border bg-card p-5 shadow-card"
      >
        <h2 id="closure-timeline" className="mb-4 text-lg font-semibold">
          {t("citizen.closure.whatHappened")}
        </h2>
        <Timeline events={incident.timeline} citizenView />
      </section>
    </div>
  );
}
