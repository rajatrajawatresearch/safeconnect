import { MEDIA_KIND_META } from "@/components/shared/media-picker";
import { stationById } from "@/data/demo/geo";
import { services } from "@/services";
import type { ActorRef, Citizen, IncidentCategory, Location } from "@/types";
import {
  composeDescription,
  makeTitle,
  peopleInDanger,
  reducedName,
  resolveOccurredAt,
  resolvePriority,
  type ReportData,
  type ReportKind,
} from "./model";

/**
 * A confidential tip is filed under this actor so that no name reaches the incident, the complaint,
 * the evidence log or the audit trail.
 */
const CONFIDENTIAL_SOURCE: ActorRef = {
  id: "confidential-source",
  name: "Confidential source",
  role: "citizen",
};

export interface SubmitInput {
  kind: ReportKind;
  values: ReportData;
  location: Location;
  citizen: Citizen;
  actor: ActorRef;
  category: IncidentCategory | undefined;
}

export interface SubmitResult {
  kind: ReportKind;
  /** What the citizen is shown: the incident id for an emergency report, otherwise the complaint id. */
  reference: string;
  incidentId?: string;
  complaintId?: string;
  stationName: string;
  /** Attachments that could not be added after the record itself was created. */
  failedUploads: number;
  danger: boolean;
}

/** Records created by an attempt that later failed, so a retry continues instead of duplicating. */
export interface SubmitProgress {
  incidentId?: string;
}

export async function submitReport(
  input: SubmitInput,
  progress: SubmitProgress,
): Promise<SubmitResult> {
  const { kind, values, location, citizen, actor, category } = input;
  const now = Date.now();
  const occurredAt = resolveOccurredAt(values, now);
  const priority = resolvePriority(category, values.danger);
  const danger = peopleInDanger(values.danger);
  const stationName = stationById(location.stationId)?.name ?? "Police station";
  const documents = values.media.map((m) => ({
    name: m.name,
    kind: m.kind,
    sizeBytes: m.sizeBytes,
  }));
  const base = { kind, stationName, danger: danger === true };

  if (kind === "emergency") {
    if (!progress.incidentId) {
      const incident = await services.incidents.create(
        {
          source: "report",
          categoryId: values.categoryId,
          priority,
          description: composeDescription(values, now, {
            includeContact: true,
          }),
          location,
          citizenId: citizen.id,
          reporterName: reducedName(citizen.name),
          reporterPhoneMasked: citizen.phoneMasked,
          peopleInDanger: danger,
          auto: true,
        },
        actor,
      );
      progress.incidentId = incident.id;
    }
    const incidentId = progress.incidentId;
    const uploads = await Promise.allSettled(
      values.media.map((m) =>
        services.evidence.upload(
          {
            incidentId,
            type: m.kind,
            title: `${MEDIA_KIND_META[m.kind].label} shared with the report`,
            fileName: m.name,
            sizeBytes: m.sizeBytes,
            durationSec: m.durationSec,
            source: "citizen",
            device: "Citizen app",
          },
          actor,
        ),
      ),
    );
    return {
      ...base,
      reference: incidentId,
      incidentId,
      failedUploads: uploads.filter((u) => u.status === "rejected").length,
    };
  }

  const description = composeDescription(values, now, {
    includeContact: false,
  });
  const title = makeTitle(values.description, category?.label ?? "Report");
  const place = { address: location.address, area: location.area };

  if (kind === "report") {
    const complaint = await services.complaints.submit(
      {
        kind: "report",
        citizenId: citizen.id,
        anonymous: false,
        categoryId: values.categoryId,
        title,
        description,
        stationId: location.stationId,
        location: place,
        occurredAt,
        contactPreference: values.contact,
        documents,
      },
      actor,
    );
    return {
      ...base,
      reference: complaint.id,
      complaintId: complaint.id,
      failedUploads: 0,
    };
  }

  // Confidential tip: an operational record for the control room plus an information-desk entry,
  // neither of which carries the citizen's id, name or phone number.
  if (!progress.incidentId) {
    const incident = await services.incidents.create(
      {
        source: "tip",
        categoryId: values.categoryId,
        priority,
        description,
        location,
        reporterName: CONFIDENTIAL_SOURCE.name,
        anonymous: true,
        peopleInDanger: danger,
      },
      CONFIDENTIAL_SOURCE,
    );
    progress.incidentId = incident.id;
  }
  const complaint = await services.complaints.submit(
    {
      kind: "confidential_tip",
      citizenId: undefined,
      anonymous: true,
      categoryId: values.categoryId,
      title,
      description,
      stationId: location.stationId,
      location: place,
      occurredAt,
      contactPreference: "none",
      documents,
      linkedIncidentId: progress.incidentId,
    },
    CONFIDENTIAL_SOURCE,
  );
  return {
    ...base,
    reference: complaint.id,
    incidentId: progress.incidentId,
    complaintId: complaint.id,
    failedUploads: 0,
  };
}
