"use client";

import { ChevronRight, UserRound } from "lucide-react";
import Link from "next/link";
import {
  MEDIA_KIND_META,
  MediaPicker,
  type PickedMedia,
} from "@/components/shared/media-picker";
import { IntegrityChip, ToneChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/features/citizen/responsive-sheet";
import { useSosContacts } from "@/features/citizen/use-citizen-data";
import { useAction } from "@/hooks/use-action";
import { useIncidentEvidence } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { formatBytes, formatTime } from "@/lib/format";
import { services } from "@/services";
import type { Incident } from "@/types";

/** Photos, video or audio the citizen sends to the control room during the emergency. */
export function ShareMediaSheet({
  incident,
  open,
  onOpenChange,
}: {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { actor } = useSession();
  const evidence = useIncidentEvidence(incident.id);
  const mine = evidence.filter((e) => e.source === "citizen");
  const upload = useAction(services.evidence.upload, {
    success: t("citizen.sos.mediaSent"),
  });

  const send = (media: PickedMedia) =>
    void upload.run(
      {
        incidentId: incident.id,
        type: media.kind,
        title: `${MEDIA_KIND_META[media.kind].label} shared during the emergency`,
        fileName: media.name,
        sizeBytes: media.sizeBytes,
        durationSec: media.durationSec,
        source: "citizen",
        device: "Citizen app",
      },
      actor,
    );

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("citizen.sos.shareMedia")}
      description={t("citizen.sos.shareMediaBody")}
    >
      <div aria-busy={upload.pending}>
        <MediaPicker onPick={send} kinds={["photo", "video", "audio"]} />
      </div>

      <h3 className="mt-5 text-sm font-semibold text-muted-foreground">
        {t("citizen.sos.shared")}
      </h3>
      {upload.pending && (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {t("citizen.home.sending")}
        </p>
      )}
      {mine.length === 0 && !upload.pending ? (
        <p className="mt-2 rounded-xl border border-dashed border-border px-3.5 py-4 text-sm text-muted-foreground">
          {t("citizen.sos.nothingShared")}
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {mine.map((item) => {
            const Icon = MEDIA_KIND_META[item.type].icon;
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.fileName}
                  </p>
                  <p className="tnum text-xs text-muted-foreground">
                    {formatBytes(item.sizeBytes)} ·{" "}
                    {formatTime(item.submittedAt)}
                  </p>
                  <p className="mt-1.5">
                    <IntegrityChip value={item.integrity} />
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ResponsiveSheet>
  );
}

/** Who was told about this SOS, said plainly — including that the demo places no call or SMS. */
export function TrustedContactSheet({
  citizenId,
  queued,
  open,
  onOpenChange,
}: {
  citizenId: string;
  /** The SOS has not left the device yet, so nobody has been told. */
  queued?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { contacts, allowed } = useSosContacts(citizenId);
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("citizen.sos.trustedContact")}
      description={
        !allowed
          ? t("citizen.sos.contactsOff")
          : contacts.length === 0
            ? t("citizen.sos.contactsNone")
            : queued
              ? t("citizen.sos.contactsQueued")
              : t("citizen.sos.contactsNotified")
      }
      footer={
        <Button asChild size="xl" variant="outline">
          <Link href={allowed ? "/citizen/contacts" : "/citizen/privacy"}>
            {t(
              allowed
                ? "citizen.sos.manageContacts"
                : "citizen.sos.openPrivacy",
            )}
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      }
    >
      {contacts.length > 0 && (
        <ul className="space-y-2">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <UserRound aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{contact.name}</p>
                <p className="text-sm text-muted-foreground">
                  {contact.relation} ·{" "}
                  <span className="tnum font-mono text-[13px]">
                    {contact.phoneMasked}
                  </span>
                </p>
              </div>
              <ToneChip tone={queued ? "medium" : "resolved"} dot>
                {t(
                  queued
                    ? "citizen.sos.contactWaiting"
                    : "citizen.sos.contactTold",
                )}
              </ToneChip>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
        {t("citizen.sos.contactsDemo")}
      </p>
    </ResponsiveSheet>
  );
}
