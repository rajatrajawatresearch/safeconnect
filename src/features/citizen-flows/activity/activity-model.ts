import { format, isSameDay, startOfDay, subDays } from "date-fns";
import type { TKey } from "@/lib/i18n";
import type {
  AppNotification,
  Complaint,
  Incident,
  IncidentSource,
  Journey,
} from "@/types";

/** One entry in the citizen's history. `at` is the moment it is filed under. */
export type ActivityItem =
  | { type: "incident"; id: string; at: number; incident: Incident }
  | { type: "complaint"; id: string; at: number; complaint: Complaint }
  | { type: "journey"; id: string; at: number; journey: Journey }
  | {
      type: "notification";
      id: string;
      at: number;
      notification: AppNotification;
    };

export type ActivityTab =
  | "all"
  | "emergencies"
  | "reports"
  | "journeys"
  | "notifications";

export const TABS: {
  id: ActivityTab;
  label: TKey;
  type: ActivityItem["type"] | null;
}[] = [
  { id: "all", label: "activity.tab.all", type: null },
  { id: "emergencies", label: "activity.tab.emergencies", type: "incident" },
  { id: "reports", label: "activity.tab.reports", type: "complaint" },
  { id: "journeys", label: "activity.tab.journeys", type: "journey" },
  {
    id: "notifications",
    label: "activity.tab.notifications",
    type: "notification",
  },
];

export const tabFromParam = (value: string | null): ActivityTab =>
  TABS.find((tab) => tab.id === value)?.id ?? "all";

/** How an incident the citizen raised is named on their own screens. */
export const SOURCE_KEY: Record<IncidentSource, TKey> = {
  sos: "activity.source.sos",
  silent_sos: "activity.source.silent_sos",
  report: "activity.source.report",
  journey: "activity.source.journey",
  call: "activity.source.call",
  tip: "activity.source.tip",
};

export function buildActivity(input: {
  incidents: Incident[];
  complaints: Complaint[];
  journeys: Journey[];
  notifications: AppNotification[];
}): ActivityItem[] {
  const items: ActivityItem[] = [
    ...input.incidents.map(
      (incident): ActivityItem => ({
        type: "incident",
        id: incident.id,
        at: incident.createdAt,
        incident,
      }),
    ),
    ...input.complaints.map(
      (complaint): ActivityItem => ({
        type: "complaint",
        id: complaint.id,
        at: complaint.submittedAt,
        complaint,
      }),
    ),
    ...input.journeys.map(
      (journey): ActivityItem => ({
        type: "journey",
        id: journey.id,
        at: journey.startedAt,
        journey,
      }),
    ),
    ...input.notifications.map(
      (notification): ActivityItem => ({
        type: "notification",
        id: notification.id,
        at: notification.at,
        notification,
      }),
    ),
  ];
  return items.sort((a, b) => b.at - a.at);
}

export interface DayGroup {
  key: string;
  /** Set for today and yesterday; other days use `label`. */
  relative: "today" | "yesterday" | null;
  label: string;
  items: ActivityItem[];
}

/** Items arrive newest first; consecutive items on the same calendar day share a heading. */
export function groupByDay(items: ActivityItem[], now: number): DayGroup[] {
  const yesterday = subDays(now, 1);
  const groups: DayGroup[] = [];
  for (const item of items) {
    const key = String(startOfDay(item.at).getTime());
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.items.push(item);
      continue;
    }
    groups.push({
      key,
      relative: isSameDay(item.at, now)
        ? "today"
        : isSameDay(item.at, yesterday)
          ? "yesterday"
          : null,
      label: format(item.at, "EEEE, d MMM yyyy"),
      items: [item],
    });
  }
  return groups;
}
