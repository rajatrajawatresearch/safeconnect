"use client";

import {
  Bell,
  Camera,
  Database,
  Download,
  Eye,
  History,
  LocateFixed,
  MapPin,
  Mic,
  Route,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { BlankState, RestrictedState } from "@/components/shared/states";
import { ToneChip } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deployment } from "@/config/deployment";
import { useCitizenIncidents } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { formatDateTime, formatTime } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { usePrefsStore, type PrivacyKey } from "@/stores/prefs-store";
import type { Citizen, Incident } from "@/types";
import { useCitizenComplaints, useCitizenContacts } from "./use-citizen-data";

const card = "rounded-2xl border border-border bg-card shadow-card";

interface PermissionRow {
  key: PrivacyKey;
  icon: LucideIcon;
  labelKey: TKey;
  bodyKey: TKey;
  /** Sharing that cannot work while the device permission for location is off. */
  needsLocation?: boolean;
}

const DEVICE: PermissionRow[] = [
  {
    key: "location",
    icon: MapPin,
    labelKey: "citizen.privacy.location",
    bodyKey: "citizen.privacy.locationBody",
  },
  {
    key: "camera",
    icon: Camera,
    labelKey: "citizen.privacy.camera",
    bodyKey: "citizen.privacy.cameraBody",
  },
  {
    key: "microphone",
    icon: Mic,
    labelKey: "citizen.privacy.microphone",
    bodyKey: "citizen.privacy.microphoneBody",
  },
  {
    key: "notifications",
    icon: Bell,
    labelKey: "citizen.privacy.notifications",
    bodyKey: "citizen.privacy.notificationsBody",
  },
];

const SHARING: PermissionRow[] = [
  {
    key: "emergencyContacts",
    icon: Users,
    labelKey: "citizen.privacy.emergencyContacts",
    bodyKey: "citizen.privacy.emergencyContactsBody",
  },
  {
    key: "emergencyLocationSharing",
    icon: LocateFixed,
    labelKey: "citizen.privacy.emergencyLocation",
    // The exact wording the brief requires for this consent.
    bodyKey: "citizen.privacy.emergencySharing",
    needsLocation: true,
  },
  {
    key: "journeySharing",
    icon: Route,
    labelKey: "citizen.privacy.journeySharing",
    bodyKey: "citizen.privacy.journeySharingBody",
    needsLocation: true,
  },
];

const LABEL: Record<PrivacyKey, TKey> = Object.fromEntries(
  [...DEVICE, ...SHARING].map((row) => [row.key, row.labelKey]),
) as Record<PrivacyKey, TKey>;

const INFORMATION: { icon: LucideIcon; titleKey: TKey; bodyKey: TKey }[] = [
  {
    icon: Database,
    titleKey: "citizen.privacy.info.collected",
    bodyKey: "citizen.privacy.info.collectedBody",
  },
  {
    icon: MapPin,
    titleKey: "citizen.privacy.info.location",
    bodyKey: "citizen.privacy.info.locationBody",
  },
  {
    icon: Eye,
    titleKey: "citizen.privacy.info.who",
    bodyKey: "citizen.privacy.info.whoBody",
  },
  {
    icon: ScrollText,
    titleKey: "citizen.privacy.info.audit",
    bodyKey: "citizen.privacy.info.auditBody",
  },
];

/** The citizen's copy of an incident: what they raised and what they were shown, nothing internal. */
function exportIncident(incident: Incident) {
  return {
    id: incident.id,
    source: incident.source,
    category: incident.categoryId,
    title: incident.title,
    description: incident.description,
    status: incident.status,
    raisedAt: new Date(incident.createdAt).toISOString(),
    endedAt: incident.resolvedAt
      ? new Date(incident.resolvedAt).toISOString()
      : null,
    location: {
      address: incident.location.address,
      area: incident.location.area,
      lat: incident.location.lat,
      lng: incident.location.lng,
      source: incident.location.source,
    },
    outcome: incident.resolution ?? incident.cancelReason ?? null,
    timeline: incident.timeline
      .filter((event) => event.citizenVisible)
      .map((event) => ({
        at: new Date(event.at).toISOString(),
        title: event.title,
        detail: event.detail ?? null,
      })),
  };
}

function PermissionList({
  rows,
  privacy,
  onChange,
}: {
  rows: PermissionRow[];
  privacy: Record<PrivacyKey, boolean>;
  onChange: (row: PermissionRow, granted: boolean) => void;
}) {
  const t = useT();
  return (
    <ul className={cn(card, "divide-y divide-border/70 overflow-hidden")}>
      {rows.map((row) => {
        const id = `privacy-${row.key}`;
        const paused =
          row.needsLocation && privacy[row.key] && !privacy.location;
        return (
          <li key={row.key}>
            <label
              htmlFor={id}
              className="flex min-h-18 cursor-pointer items-start gap-3.5 px-4 py-4 sm:px-5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
                <row.icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium">
                  {t(row.labelKey)}
                </span>
                <span
                  id={`${id}-body`}
                  className="mt-0.5 block text-sm leading-relaxed text-muted-foreground"
                >
                  {t(row.bodyKey)}
                </span>
                {paused && (
                  <span className="mt-2 block">
                    <ToneChip
                      tone="medium"
                      className="h-auto py-1 whitespace-normal"
                    >
                      {t("citizen.privacy.paused")}
                    </ToneChip>
                  </span>
                )}
              </span>
              <Switch
                id={id}
                className="mt-2.5"
                checked={privacy[row.key]}
                aria-describedby={`${id}-body`}
                onCheckedChange={(granted) => onChange(row, granted)}
              />
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function Privacy({ citizen }: { citizen: Citizen }) {
  const t = useT();
  const { actor } = useSession();
  const privacy = usePrefsStore((s) => s.privacy);
  const setPrivacy = usePrefsStore((s) => s.setPrivacy);
  const consentHistory = usePrefsStore((s) => s.consentHistory);
  const incidents = useCitizenIncidents(citizen.id);
  const { all: complaints } = useCitizenComplaints(citizen.id);
  const contacts = useCitizenContacts(citizen.id);
  const [preparing, setPreparing] = useState(false);
  const [downloadedAt, setDownloadedAt] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const change = (row: PermissionRow, granted: boolean) => {
    setPrivacy(row.key, granted);
    toast(
      t(granted ? "citizen.privacy.turnedOn" : "citizen.privacy.turnedOff", {
        name: t(row.labelKey),
      }),
    );
  };

  const download = () => {
    setPreparing(true);
    try {
      const now = Date.now();
      const payload = {
        exportedAt: new Date(now).toISOString(),
        notice: `${deployment.productName} demonstration data. This file was built in your browser; nothing was sent to a server.`,
        profile: {
          id: citizen.id,
          name: citizen.name,
          phoneMasked: citizen.phoneMasked,
          email: citizen.email,
          city: citizen.city,
          area: citizen.area,
          preferredLanguage: citizen.preferredLanguage,
          verified: citizen.verified,
        },
        incidents: incidents.map(exportIncident),
        complaints,
        contacts,
        consents: {
          current: privacy,
          history: consentHistory.map((record) => ({
            permission: record.key,
            granted: record.granted,
            at: new Date(record.at).toISOString(),
          })),
        },
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${deployment.productName.toLowerCase()}-my-data-${format(now, "yyyy-MM-dd")}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setDownloadedAt(now);
      toast.success(t("citizen.privacy.downloaded"));
      // Requests for a copy of personal data are themselves recorded. Offline, the export still works.
      services.audit
        .record(
          {
            action: "Personal data export downloaded",
            category: "access",
            detail: `${incidents.length} incidents, ${complaints.length} complaints, ${contacts.length} contacts`,
            entityId: citizen.id,
          },
          actor,
        )
        .catch(() => undefined);
    } catch {
      toast.error(t("citizen.privacy.downloadFailed"));
    } finally {
      setPreparing(false);
    }
  };

  const history = showAll ? consentHistory : consentHistory.slice(0, 5);
  const counts: { labelKey: TKey; n: number }[] = [
    { labelKey: "citizen.privacy.count.incidents", n: incidents.length },
    { labelKey: "citizen.privacy.count.complaints", n: complaints.length },
    { labelKey: "citizen.privacy.count.contacts", n: contacts.length },
    { labelKey: "citizen.privacy.count.consents", n: consentHistory.length },
  ];

  return (
    <PageContainer width="wide">
      <PageHeader
        title={t("citizen.privacy.title")}
        description={t("citizen.privacy.description")}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="privacy-device">
            <h2 id="privacy-device" className="mb-3 text-lg font-semibold">
              {t("citizen.privacy.deviceTitle")}
            </h2>
            <PermissionList rows={DEVICE} privacy={privacy} onChange={change} />
          </section>
          <section aria-labelledby="privacy-sharing">
            <h2 id="privacy-sharing" className="mb-3 text-lg font-semibold">
              {t("citizen.privacy.sharingTitle")}
            </h2>
            <PermissionList
              rows={SHARING}
              privacy={privacy}
              onChange={change}
            />
          </section>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 md:items-start lg:grid-cols-1">
          <section
            aria-labelledby="privacy-download"
            className={cn(card, "p-5")}
          >
            <h2 id="privacy-download" className="text-lg font-semibold">
              {t("citizen.privacy.downloadTitle")}
            </h2>
            <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
              {t("citizen.privacy.downloadBody")}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-center min-[400px]:grid-cols-4">
              {counts.map((item) => (
                <div
                  key={item.labelKey}
                  className="flex min-w-0 flex-col-reverse rounded-xl bg-inset px-1 py-2.5"
                >
                  <dt className="mt-0.5 truncate text-xs text-muted-foreground">
                    {t(item.labelKey)}
                  </dt>
                  <dd className="tnum text-xl font-semibold">{item.n}</dd>
                </div>
              ))}
            </dl>
            <Button
              size="xl"
              className="mt-4 w-full"
              disabled={preparing}
              onClick={download}
            >
              <Download aria-hidden />
              {t("citizen.privacy.download")}
            </Button>
            <p
              role="status"
              className="mt-3 text-[13px] leading-relaxed text-muted-foreground"
            >
              {downloadedAt
                ? t("citizen.privacy.downloadedAt", {
                    time: formatTime(downloadedAt),
                  })
                : t("citizen.privacy.downloadNote")}
            </p>
          </section>

          <section aria-labelledby="privacy-history" className={card}>
            <div className="px-5 pt-5 pb-3">
              <h2 id="privacy-history" className="text-lg font-semibold">
                {t("citizen.privacy.historyTitle")}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t("citizen.privacy.historyBody")}
              </p>
            </div>
            {consentHistory.length === 0 ? (
              <BlankState
                compact
                icon={History}
                title={t("citizen.privacy.historyEmpty")}
                description={t("citizen.privacy.historyEmptyBody")}
              />
            ) : (
              <>
                <ol className="divide-y divide-border/70 border-t border-border/70">
                  {history.map((record) => (
                    <li
                      key={record.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium">
                          {t(LABEL[record.key])}
                        </p>
                        <p
                          className="text-sm text-muted-foreground"
                          title={formatDateTime(record.at)}
                        >
                          <RelativeTime at={record.at} friendly />
                        </p>
                      </div>
                      <ToneChip
                        tone={record.granted ? "resolved" : "neutral"}
                        dot
                      >
                        {t(
                          record.granted
                            ? "citizen.privacy.allowed"
                            : "citizen.privacy.withdrawn",
                        )}
                      </ToneChip>
                    </li>
                  ))}
                </ol>
                {consentHistory.length > 5 && (
                  <div className="border-t border-border/70 p-2">
                    <Button
                      variant="ghost"
                      size="xl"
                      className="w-full"
                      aria-expanded={showAll}
                      onClick={() => setShowAll((v) => !v)}
                    >
                      {t(
                        showAll
                          ? "citizen.privacy.showFewer"
                          : "citizen.privacy.showAll",
                        { count: consentHistory.length },
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>

          <section
            aria-labelledby="privacy-info"
            className={cn(card, "p-5 md:col-span-2 lg:col-span-1")}
          >
            <h2 id="privacy-info" className="text-lg font-semibold">
              {t("citizen.privacy.infoTitle")}
            </h2>
            <dl className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              {INFORMATION.map((item) => (
                <div key={item.titleKey}>
                  <dt className="flex items-center gap-2.5 text-[15px] font-medium">
                    <item.icon
                      aria-hidden
                      className="size-5 shrink-0 text-muted-foreground"
                    />
                    {t(item.titleKey)}
                  </dt>
                  <dd className="mt-1 pl-[1.875rem] text-sm leading-relaxed text-muted-foreground">
                    {t(item.bodyKey)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}

export function PrivacyScreen() {
  const { citizen } = useSession();
  if (!citizen)
    return (
      <RestrictedState description="This screen is for the citizen app. Switch to a citizen from the demo role menu." />
    );
  return <Privacy citizen={citizen} />;
}
