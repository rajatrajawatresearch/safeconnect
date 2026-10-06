"use client";

import {
  ChevronDown,
  FileText,
  History,
  MapPin,
  MessagesSquare,
  Paperclip,
  PhoneOff,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { useState } from "react";
import { MEDIA_KIND_META } from "@/components/shared/media-picker";
import { Field } from "@/components/shared/page";
import { RestrictedState } from "@/components/shared/states";
import {
  ClassificationChip,
  IntegrityChip,
  SensitiveBadge,
  ToneChip,
} from "@/components/shared/status-chips";
import { Timeline } from "@/components/shared/timeline";
import { RelativeTime } from "@/components/shared/timers";
import { SOURCE_LABEL } from "@/config/incident";
import { STATIONS } from "@/data/demo/geo";
import { useAction } from "@/hooks/use-action";
import {
  useIncidentEvidence,
  useIncidentMessages,
  useLiveSession,
} from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import {
  formatBytes,
  formatCoords,
  formatDateTime,
  formatDuration,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { Evidence, Incident, Location, RoleKey } from "@/types";
import { CardHeading, OfficerCard } from "./officer-ui";

const LOCATION_SOURCE: Record<Location["source"], string> = {
  device_emergency: "From the citizen's device when the emergency was raised",
  citizen_entered: "Entered by the citizen in the report",
  operator_entered: "Entered by the operator from the call",
  unit_reported: "Reported by a unit on the ground",
};

const ROLE_LABEL: Record<RoleKey, string> = {
  citizen: "Citizen",
  operator: "Control room",
  dispatcher: "Dispatch",
  officer: "Field officer",
  supervisor: "Supervisor",
  command: "Command",
  state_command: "State command",
  admin: "Admin",
};

/**
 * What the assistant drafted at triage. It is advice for a human: the operator confirms priority
 * and category, and the officer treats the summary as a starting point, not as fact.
 */
export function AssistantSummary({
  incident,
  className,
}: {
  incident: Incident;
  className?: string;
}) {
  const t = useT();
  const ai = incident.ai;
  if (!ai) return null;
  return (
    <OfficerCard
      className={cn("border-dashed p-4 shadow-none", className)}
      aria-labelledby={`ai-${incident.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id={`ai-${incident.id}`}
          className="flex items-center gap-2 text-[15px] font-semibold"
        >
          <Sparkles aria-hidden className="size-4 text-primary" />
          {t("officer.assistantSummary")}
        </h2>
        <ToneChip tone="neutral" variant="outline">
          Advisory
        </ToneChip>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed">{ai.summary}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">
          Why it suggested {ai.suggestedPriority}:
        </span>{" "}
        {ai.reason}
      </p>
      {ai.missingInfo.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[13px] font-medium">Still unknown</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] leading-relaxed text-muted-foreground">
            {ai.missingInfo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {ai.translationOf && (
        <p className="mt-2.5 text-[13px] text-muted-foreground">
          Translated from {ai.translationOf.language}. Original:{" "}
          <span className="text-foreground">“{ai.translationOf.original}”</span>
        </p>
      )}
      <p className="mt-3 border-t border-border/70 pt-2.5 text-xs leading-relaxed text-muted-foreground">
        {ai.confirmedBy
          ? `Priority and category confirmed by ${ai.confirmedBy.name}. `
          : "Not yet confirmed by an operator. "}
        {t("officer.advisory")}
      </p>
    </OfficerCard>
  );
}

/** What was reported, and the little a responder may know about who reported it. */
export function DescriptionCard({
  incident,
  className,
}: {
  incident: Incident;
  className?: string;
}) {
  const t = useT();
  return (
    <OfficerCard
      className={cn("p-4", className)}
      aria-labelledby={`desc-${incident.id}`}
    >
      <CardHeading
        id={`desc-${incident.id}`}
        icon={FileText}
        title={t("officer.description")}
      />
      <p className="mt-3 text-sm leading-relaxed">{incident.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-3">
        <Field label="Reported by">
          {incident.anonymous ? "Anonymous" : incident.reporterName}
        </Field>
        <Field label="Phone">
          <span className="tnum font-mono text-[13px]">
            {incident.reporterPhoneMasked ?? "Not shared"}
          </span>
        </Field>
        <Field label="Raised through">{SOURCE_LABEL[incident.source]}</Field>
        <Field label="People in danger">
          {incident.peopleInDanger === undefined
            ? "Not stated"
            : incident.peopleInDanger
              ? "Yes"
              : "No"}
        </Field>
      </dl>
      <SensitiveBadge label="Reduced citizen details" className="mt-3" />
    </OfficerCard>
  );
}

function LocationCard({ incident }: { incident: Incident }) {
  const t = useT();
  const { location } = incident;
  const station = STATIONS.find((s) => s.id === location.stationId);
  return (
    <OfficerCard className="p-4" aria-labelledby={`loc-${incident.id}`}>
      <CardHeading
        id={`loc-${incident.id}`}
        icon={MapPin}
        title={t("officer.location")}
      />
      <p className="mt-3 text-base leading-snug font-medium">
        {location.address}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Landmark">{location.landmark ?? "None given"}</Field>
        <Field label="Area">{location.area}</Field>
        <Field label="Coordinates">
          <span className="tnum font-mono text-[13px]">
            {formatCoords(location)}
          </span>
        </Field>
        <Field label="Station area">{station?.name ?? "Unassigned"}</Field>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {LOCATION_SOURCE[location.source]}
        {location.accuracyM
          ? ` · accurate to about ${location.accuracyM} m`
          : ""}
        .
      </p>
    </OfficerCard>
  );
}

/** Whether, how and how recently the citizen has been in touch. */
export function CitizenCommsCard({
  incident,
  className,
}: {
  incident: Incident;
  className?: string;
}) {
  const t = useT();
  const { can } = useSession();
  const thread = useIncidentMessages(incident.id, "citizen");
  const live = useLiveSession(incident.id);
  const lastFromCitizen = [...thread]
    .reverse()
    .find((m) => m.senderRole === "citizen");
  const lastToCitizen = [...thread]
    .reverse()
    .find((m) => m.senderRole !== "citizen" && m.senderRole !== "system");

  return (
    <OfficerCard
      className={cn("p-4", className)}
      aria-labelledby={`comms-${incident.id}`}
    >
      <CardHeading
        id={`comms-${incident.id}`}
        icon={MessagesSquare}
        title={t("officer.citizenComms")}
        action={
          live ? (
            <ToneChip tone="resolved" dot>
              {live.type === "video" ? "Video" : "Voice"} session live
            </ToneChip>
          ) : (
            <ToneChip tone="neutral" dot>
              No live session
            </ToneChip>
          )
        }
      />
      {!can("communication.citizen") ? (
        <RestrictedState
          compact
          className="py-5"
          description="Your role does not include citizen communication."
        />
      ) : (
        <>
          {incident.silent && (
            <p
              role="note"
              className="mt-3 flex items-center gap-2 rounded-xl bg-high-soft px-3 py-2.5 text-sm font-medium text-high-fg"
            >
              <PhoneOff aria-hidden className="size-4 shrink-0" />
              {t("officer.chatOnly")}
            </p>
          )}
          {!incident.citizenId && (
            <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
              This incident was not raised from the citizen app, so there is no
              in-app conversation. Ask the control room to relay messages.
            </p>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Last message from citizen">
              {lastFromCitizen ? (
                <RelativeTime at={lastFromCitizen.at} />
              ) : (
                "None yet"
              )}
            </Field>
            <Field label="Last reply to citizen">
              {lastToCitizen ? (
                <RelativeTime at={lastToCitizen.at} />
              ) : (
                "None yet"
              )}
            </Field>
          </dl>
          {lastFromCitizen && (
            <blockquote className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-sm leading-relaxed">
              “{lastFromCitizen.text}”
              {lastFromCitizen.translated && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Translated by the assistant from{" "}
                  {lastFromCitizen.translated.language.replace(
                    " (original)",
                    "",
                  )}
                  .
                </span>
              )}
            </blockquote>
          )}
        </>
      )}
    </OfficerCard>
  );
}

function NotesCard({ incident }: { incident: Incident }) {
  const t = useT();
  const { persona } = useSession();
  const notes = [...incident.notes].sort((a, b) => b.at - a.at);
  return (
    <OfficerCard className="p-4" aria-labelledby={`notes-${incident.id}`}>
      <CardHeading
        id={`notes-${incident.id}`}
        icon={StickyNote}
        title={t("officer.controlNotes")}
        description="Internal. Includes field notes from responding units."
      />
      {notes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No notes on this incident yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-xl border border-dashed border-border bg-inset px-3 py-2.5"
            >
              <p className="text-sm leading-relaxed">{note.text}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {note.author.id === persona.id ? "You" : note.author.name}
                <span className="text-subtle">
                  {" "}
                  · {ROLE_LABEL[note.author.role]}
                </span>{" "}
                · <RelativeTime at={note.at} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </OfficerCard>
  );
}

function EvidenceItem({ item }: { item: Evidence }) {
  const { actor } = useSession();
  const [open, setOpen] = useState(false);
  const logView = useAction(services.evidence.logView);
  const kind = MEDIA_KIND_META[item.type];
  const Icon = kind.icon;
  const panelId = `ev-${item.id}`;

  const toggle = () => {
    // Opening the record is an access, and every access goes on the evidence log.
    if (!open) void logView.run(item.id, actor);
    setOpen((v) => !v);
  };

  return (
    <li className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-14 w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted/50"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {item.title}
          </span>
          <span className="tnum mt-0.5 block truncate font-mono text-xs text-muted-foreground">
            {item.id}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {kind.label} · {formatBytes(item.sizeBytes)}
            {item.durationSec ? ` · ${formatDuration(item.durationSec)}` : ""}
            {" · "}
            <RelativeTime at={item.submittedAt} />
          </span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <IntegrityChip value={item.integrity} />
            <ClassificationChip value={item.classification} />
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div id={panelId} className="border-t border-border/70 px-3 py-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Uploaded by">
              {item.uploadedByName}
              <span className="font-normal text-muted-foreground">
                {" "}
                · {ROLE_LABEL[item.uploadedByRole]}
              </span>
            </Field>
            <Field label="Captured">{formatDateTime(item.capturedAt)}</Field>
            <Field label="File">{item.fileName}</Field>
            <Field label="Device">{item.device ?? "Not recorded"}</Field>
            <Field label="Retention" className="col-span-2">
              {item.retention}
            </Field>
            <Field
              label={`Digest · ${item.hashAlgorithm}`}
              className="col-span-2"
            >
              <span className="font-mono text-xs font-normal break-all">
                {item.hash}
              </span>
            </Field>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            The original is preserved unchanged. This view has been added to the
            access log. Media previews are not stored in the demo.
          </p>
        </div>
      )}
    </li>
  );
}

/** Evidence linked to an incident. Restricted items stay locked unless the role allows them. */
export function EvidenceList({
  incidentId,
  className,
}: {
  incidentId: string;
  className?: string;
}) {
  const { can } = useSession();
  const evidence = useIncidentEvidence(incidentId);

  if (!can("evidence.view"))
    return (
      <RestrictedState
        compact
        className={cn("py-5", className)}
        description="Your role does not include viewing evidence."
      />
    );
  if (evidence.length === 0)
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No evidence linked to this incident yet.
      </p>
    );

  return (
    <ul className={cn("space-y-2.5", className)}>
      {evidence.map((item) =>
        item.classification === "restricted" && !can("evidence.restricted") ? (
          <li
            key={item.id}
            className="rounded-xl border border-dashed border-border bg-inset"
          >
            <RestrictedState
              compact
              className="py-5"
              title="Restricted evidence"
              description={
                <>
                  <span className="tnum font-mono text-xs">{item.id}</span>
                  <br />
                  Your role does not permit access.
                </>
              }
            />
          </li>
        ) : (
          <EvidenceItem key={item.id} item={item} />
        ),
      )}
    </ul>
  );
}

/**
 * Everything the responding officer may know about an incident: what was reported, where, how the
 * citizen can be reached, internal notes, linked evidence and the record so far. Read-only.
 */
export function IncidentIntel({
  incident,
  omit = [],
  className,
}: {
  incident: Incident;
  /** Sections the screen already shows somewhere more prominent. */
  omit?: ("description" | "summary" | "comms")[];
  className?: string;
}) {
  const t = useT();
  const evidenceCount = incident.evidenceIds.length;
  return (
    <section
      aria-label={t("officer.intelligence")}
      className={cn("grid items-start gap-4", className)}
    >
      {!omit.includes("description") && <DescriptionCard incident={incident} />}
      {!omit.includes("summary") && <AssistantSummary incident={incident} />}
      <LocationCard incident={incident} />
      {!omit.includes("comms") && <CitizenCommsCard incident={incident} />}
      <NotesCard incident={incident} />
      <OfficerCard className="p-4" aria-labelledby={`evl-${incident.id}`}>
        <CardHeading
          id={`evl-${incident.id}`}
          icon={Paperclip}
          title={t("officer.evidence")}
          description={
            evidenceCount > 0
              ? `${evidenceCount} ${evidenceCount === 1 ? "item" : "items"} linked. Opening one is logged.`
              : undefined
          }
        />
        <EvidenceList incidentId={incident.id} className="mt-3" />
      </OfficerCard>
      <OfficerCard className="p-4" aria-labelledby={`tl-${incident.id}`}>
        <CardHeading
          id={`tl-${incident.id}`}
          icon={History}
          title={t("officer.timeline")}
          description="Newest first."
        />
        <Timeline
          events={incident.timeline}
          newestFirst
          dense
          className="mt-4"
        />
      </OfficerCard>
    </section>
  );
}
