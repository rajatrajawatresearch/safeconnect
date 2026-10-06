"use client";

import { ArrowRight, CloudOff, MapPin, Paperclip } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { Field } from "@/components/shared/page";
import {
  ComplaintStatusChip,
  StatusChip,
  ToneChip,
} from "@/components/shared/status-chips";
import { Timeline } from "@/components/shared/timeline";
import { Button } from "@/components/ui/button";
import { STATUS_META } from "@/config/incident";
import { stationById } from "@/data/demo/geo";
import { JourneyMap } from "@/features/journey/journey-map";
import {
  JOURNEY_STATUS_META,
  journeyMinutes,
} from "@/features/journey/journey-model";
import { useCategoryLookup, useIncidentEvidence } from "@/hooks/use-demo-data";
import { useT } from "@/hooks/use-t";
import { formatDateTime } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import type { AppNotification, Complaint, Incident, Journey } from "@/types";
import { DemoRecordNote, Notice } from "../ui";
import { SOURCE_KEY, type ActivityItem } from "./activity-model";

const EMERGENCY_SOURCES: Incident["source"][] = [
  "sos",
  "silent_sos",
  "journey",
];

const NOTIFICATION_DOT: Record<AppNotification["tone"], string> = {
  critical: "bg-critical",
  high: "bg-high",
  info: "bg-normal",
  success: "bg-resolved",
};

export const TYPE_KEY: Record<
  Exclude<ActivityItem["type"], "incident">,
  TKey
> = {
  complaint: "activity.type.complaint",
  journey: "activity.type.journey",
  notification: "activity.type.notification",
};

/** Title and kind label for a history entry, shared by the list, the side panel and the sheet. */
export function useItemHeading(item: ActivityItem | undefined) {
  const t = useT();
  if (!item) return { title: "", kind: "" };
  switch (item.type) {
    case "incident":
      return {
        title: item.incident.title,
        kind: t(SOURCE_KEY[item.incident.source]),
      };
    case "complaint":
      return { title: item.complaint.title, kind: t(TYPE_KEY.complaint) };
    case "journey":
      return {
        title: t("activity.journey.route", {
          from: item.journey.from.label,
          to: item.journey.destination.label,
        }),
        kind: t(TYPE_KEY.journey),
      };
    case "notification":
      return { title: item.notification.title, kind: t(TYPE_KEY.notification) };
  }
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-base font-semibold">{children}</h3>;
}

function Reference({ id }: { id: string }) {
  return (
    <p className="tnum font-mono text-sm break-all text-muted-foreground">
      {id}
    </p>
  );
}

function IncidentBody({ incident }: { incident: Incident }) {
  const t = useT();
  const lookup = useCategoryLookup();
  const evidence = useIncidentEvidence(incident.id);
  const complaints = useDemoStore((s) => s.complaints);
  const linked = useMemo(
    () =>
      complaints.find(
        (c) =>
          c.linkedIncidentId === incident.id &&
          c.citizenId === incident.citizenId,
      ),
    [complaints, incident.id, incident.citizenId],
  );
  const active = STATUS_META[incident.status].active;
  const liveEmergency = active && EMERGENCY_SOURCES.includes(incident.source);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={incident.status} size="md" />
        <Reference id={incident.id} />
      </div>

      {incident.sync === "queued" && (
        <Notice
          tone="high"
          icon={CloudOff}
          role="status"
          title={t("citizen.sos.queued")}
        >
          {t("citizen.sos.queuedBody")}
        </Notice>
      )}

      {liveEmergency && (
        <Button asChild variant="critical" size="xl" className="w-full">
          <Link href="/citizen/sos">
            {t("citizen.sos.viewActive")}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      )}

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label={t("activity.detail.category")}>
          <span className="inline-flex items-center gap-1.5">
            <CategoryIcon
              categoryId={incident.categoryId}
              className="text-muted-foreground"
            />
            {lookup(incident.categoryId)?.label ?? incident.title}
          </span>
        </Field>
        <Field label={t("activity.detail.reported")}>
          {formatDateTime(incident.createdAt)}
        </Field>
        <Field label={t("activity.detail.location")} className="sm:col-span-2">
          <span className="inline-flex items-start gap-1.5">
            <MapPin
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            {incident.location.address}
          </span>
        </Field>
      </dl>

      <div>
        <SubHeading>{t("activity.detail.description")}</SubHeading>
        <p className="text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">
          {incident.description}
        </p>
      </div>

      <div>
        <SubHeading>{t("activity.detail.timeline")}</SubHeading>
        <Timeline events={incident.timeline} citizenView />
      </div>

      {(incident.resolution || incident.cancelReason) && (
        <div className="rounded-xl border border-border bg-inset p-4">
          <SubHeading>{t("activity.detail.outcome")}</SubHeading>
          <p className="text-[15px] leading-relaxed">
            {incident.resolution ?? incident.cancelReason}
          </p>
        </div>
      )}

      {evidence.length > 0 && (
        <div>
          <SubHeading>{t("activity.detail.evidence")}</SubHeading>
          <ul className="space-y-1.5">
            {evidence.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 text-[15px] text-muted-foreground"
              >
                <Paperclip aria-hidden className="size-4 shrink-0" />
                <span className="min-w-0 truncate">{item.fileName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {linked && (
        <Button asChild variant="outline" size="xl" className="w-full">
          <Link href={`/citizen/complaints?id=${linked.id}`}>
            {t("activity.openComplaint")}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      )}

      <DemoRecordNote />
    </div>
  );
}

function ComplaintBody({ complaint }: { complaint: Complaint }) {
  const t = useT();
  const lookup = useCategoryLookup();
  const latest = complaint.updates[complaint.updates.length - 1];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <ComplaintStatusChip status={complaint.status} size="md" />
        <Reference id={complaint.id} />
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label={t("complaints.field.category")}>
          <span className="inline-flex items-center gap-1.5">
            <CategoryIcon
              categoryId={complaint.categoryId}
              className="text-muted-foreground"
            />
            {lookup(complaint.categoryId)?.label ?? complaint.categoryId}
          </span>
        </Field>
        <Field label={t("complaints.field.station")}>
          {stationById(complaint.stationId)?.name ?? complaint.department}
        </Field>
        <Field label={t("complaints.field.submitted")}>
          {formatDateTime(complaint.submittedAt)}
        </Field>
        {complaint.assignedAuthority && (
          <Field label={t("complaints.field.authority")}>
            {complaint.assignedAuthority}
          </Field>
        )}
      </dl>

      {latest && (
        <div className="rounded-xl border border-border bg-inset p-4">
          <SubHeading>{t("activity.detail.latest")}</SubHeading>
          <p className="text-[15px] leading-relaxed">{latest.note}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {latest.by} · {formatDateTime(latest.at)}
          </p>
        </div>
      )}

      <Button asChild size="xl" className="w-full">
        <Link href={`/citizen/complaints?id=${complaint.id}`}>
          {t("activity.openComplaint")}
          <ArrowRight aria-hidden />
        </Link>
      </Button>

      <DemoRecordNote />
    </div>
  );
}

function JourneyBody({ journey }: { journey: Journey }) {
  const t = useT();
  const contacts = useDemoStore((s) => s.contacts);
  const meta = JOURNEY_STATUS_META[journey.status];
  const shared = contacts
    .filter((c) => journey.contactIds.includes(c.id))
    .map((c) => c.name);
  return (
    <div className="space-y-5">
      <ToneChip tone={meta.tone} size="md" dot>
        {t(meta.label)}
      </ToneChip>

      <div className="h-44 overflow-hidden rounded-2xl border border-border">
        <JourneyMap journey={journey} />
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label={t("journey.from")}>{journey.from.label}</Field>
        <Field label={t("journey.destination")}>
          {journey.destination.label}
        </Field>
        <Field label={t("activity.detail.started")}>
          {formatDateTime(journey.startedAt)}
        </Field>
        <Field
          label={
            journey.endedAt
              ? t("activity.detail.ended")
              : t("activity.detail.expected")
          }
        >
          {formatDateTime(journey.endedAt ?? journey.expectedArrivalAt)}
        </Field>
        <Field label={t("activity.detail.duration")}>
          <span className="tnum">
            {t("journey.minutes", { n: journeyMinutes(journey) })}
          </span>
        </Field>
        <Field label={t("journey.interval")}>
          <span className="tnum">
            {t("journey.minutes", { n: journey.checkIntervalMin })}
          </span>
        </Field>
        <Field label={t("journey.sharedWith")} className="sm:col-span-2">
          {shared.length ? shared.join(", ") : t("journey.sharedWithNone")}
        </Field>
      </dl>

      {journey.status === "active" && (
        <Button asChild size="xl" className="w-full">
          <Link href="/citizen/journey">
            {t("activity.openJourney")}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      )}
      {journey.status !== "active" && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("activity.journey.ended")}
        </p>
      )}
    </div>
  );
}

function NotificationBody({ notification }: { notification: AppNotification }) {
  const t = useT();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "size-2.5 rounded-full",
            NOTIFICATION_DOT[notification.tone],
          )}
        />
        <time
          dateTime={new Date(notification.at).toISOString()}
          className="tnum text-sm text-muted-foreground"
        >
          {formatDateTime(notification.at)}
        </time>
      </div>
      {notification.body && (
        <p className="text-base leading-relaxed">{notification.body}</p>
      )}
      {notification.href && (
        <Button asChild size="xl" className="w-full">
          <Link href={notification.href}>
            {t("activity.open")}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      )}
    </div>
  );
}

/** Body of the detail view for any history entry. The caller renders the title. */
export function ActivityDetail({ item }: { item: ActivityItem }) {
  switch (item.type) {
    case "incident":
      return <IncidentBody incident={item.incident} />;
    case "complaint":
      return <ComplaintBody complaint={item.complaint} />;
    case "journey":
      return <JourneyBody journey={item.journey} />;
    case "notification":
      return <NotificationBody notification={item.notification} />;
  }
}
