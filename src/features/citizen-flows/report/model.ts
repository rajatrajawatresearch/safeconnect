import { startOfDay } from "date-fns";
import {
  CalendarClock,
  Camera,
  ClipboardCheck,
  EyeOff,
  FileText,
  MapPin,
  MessageCircle,
  ShieldQuestion,
  Siren,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { z } from "zod";
import { deployment } from "@/config/deployment";
import { PRIORITY_META, type Tone } from "@/config/incident";
import { AREAS } from "@/data/demo/geo";
import { formatDateTime } from "@/lib/format";
import { offsetPoint } from "@/lib/geo";
import type { TKey } from "@/lib/i18n";
import type {
  Complaint,
  IncidentCategory,
  IncidentPriority,
  Location,
} from "@/types";

/* ───────────────────────── Kinds ───────────────────────── */

export type ReportKind = "emergency" | "report" | "tip";

export const REPORT_KINDS: ReportKind[] = ["emergency", "report", "tip"];

/** `?type=` values accepted in the URL. */
export function kindFromParam(value: string | null): ReportKind | null {
  return REPORT_KINDS.includes(value as ReportKind)
    ? (value as ReportKind)
    : null;
}

export const KIND_META: Record<
  ReportKind,
  {
    icon: LucideIcon;
    tone: Tone;
    title: TKey;
    body: TKey;
    points: [TKey, TKey];
    submit: TKey;
    doneTitle: TKey;
    next: [TKey, TKey, TKey];
  }
> = {
  emergency: {
    icon: Siren,
    tone: "high",
    title: "report.kind.emergency.title",
    body: "report.kind.emergency.body",
    points: ["report.kind.emergency.point1", "report.kind.emergency.point2"],
    submit: "report.submit.emergency",
    doneTitle: "report.done.emergency.title",
    next: [
      "report.done.emergency.next1",
      "report.done.emergency.next2",
      "report.done.emergency.next3",
    ],
  },
  report: {
    icon: FileText,
    tone: "normal",
    title: "report.kind.report.title",
    body: "report.kind.report.body",
    points: ["report.kind.report.point1", "report.kind.report.point2"],
    submit: "report.submit.report",
    doneTitle: "report.done.report.title",
    next: [
      "report.done.report.next1",
      "report.done.report.next2",
      "report.done.report.next3",
    ],
  },
  tip: {
    icon: EyeOff,
    tone: "neutral",
    title: "report.kind.tip.title",
    body: "report.kind.tip.body",
    points: ["report.kind.tip.point1", "report.kind.tip.point2"],
    submit: "report.submit.tip",
    doneTitle: "report.done.tip.title",
    next: [
      "report.done.tip.next1",
      "report.done.tip.next2",
      "report.done.tip.next3",
    ],
  },
};

/* ───────────────────────── Form schema ───────────────────────── */

export const INVOLVED_TAGS = [
  "vehicle",
  "multiple",
  "weapon",
  "ongoing",
] as const;
export type InvolvedTag = (typeof INVOLVED_TAGS)[number];

export const MAX_MEDIA = 6;
export const DESCRIPTION_MAX = 800;

/** Validation messages are translation keys; `FieldError` resolves them in the current language. */
const key = (k: TKey) => k;

const mediaSchema = z.object({
  name: z.string(),
  kind: z.enum(["photo", "video", "audio", "document"]),
  sizeBytes: z.number(),
  durationSec: z.number().optional(),
});

/**
 * Unanswered choices are modelled as "" so that every rule reports as an ordinary, continuable
 * issue. That keeps the cross-field rules below running even while an earlier step is incomplete.
 */
export const reportSchema = z
  .object({
    categoryId: z.string().min(1, key("report.error.category")),
    description: z
      .string()
      .trim()
      .min(10, key("report.error.description"))
      .max(DESCRIPTION_MAX, key("report.error.tooLong")),
    danger: z
      .enum(["yes", "no", "unsure", ""])
      .refine((v) => v !== "", key("report.error.danger")),
    locationMode: z
      .enum(["current", "area", ""])
      .refine((v) => v !== "", key("report.error.where")),
    /** True once the device position has been read for the "current location" option. */
    located: z.boolean(),
    areaKey: z.string(),
    landmark: z.string().trim().max(80, key("report.error.tooLong")),
    whenMode: z.enum(["now", "today", "custom"]),
    /** "HH:mm", optional, for "earlier today". */
    whenTime: z.string(),
    /** `datetime-local` value for "pick a date and time". */
    whenCustom: z.string(),
    involved: z.string().trim().max(600, key("report.error.tooLong")),
    involvedTags: z.array(z.enum(INVOLVED_TAGS)),
    media: z.array(mediaSchema).max(MAX_MEDIA, key("report.error.media")),
    contact: z.enum(["call", "chat", "none"]),
  })
  .superRefine((v, ctx) => {
    if (v.locationMode === "area" && !AREAS[v.areaKey])
      ctx.addIssue({
        code: "custom",
        path: ["areaKey"],
        message: key("report.error.area"),
      });
    if (v.locationMode === "current" && !v.located)
      ctx.addIssue({
        code: "custom",
        path: ["locationMode"],
        message: key("report.error.locating"),
      });

    const now = Date.now();
    if (v.whenMode === "today" && v.whenTime) {
      const at = timeToday(v.whenTime, now);
      if (at === null || at > now + 60_000)
        ctx.addIssue({
          code: "custom",
          path: ["whenTime"],
          message: key("report.error.future"),
        });
    }
    if (v.whenMode === "custom") {
      const at = v.whenCustom ? new Date(v.whenCustom).getTime() : Number.NaN;
      if (Number.isNaN(at))
        ctx.addIssue({
          code: "custom",
          path: ["whenCustom"],
          message: key("report.error.whenRequired"),
        });
      else if (at > now + 60_000)
        ctx.addIssue({
          code: "custom",
          path: ["whenCustom"],
          message: key("report.error.future"),
        });
    }
  });

/** What the form holds while it is being filled in: choices may still be unanswered (""). */
export type ReportValues = z.input<typeof reportSchema>;
/** What comes out of validation: every required choice has been made. */
export type ReportData = z.output<typeof reportSchema>;
export type ReportField = keyof ReportValues;

export function defaultReportValues(
  kind: ReportKind,
  categoryId: string,
): ReportValues {
  return {
    categoryId,
    description: "",
    danger: "",
    locationMode: "",
    located: false,
    areaKey: "",
    landmark: "",
    whenMode: "now",
    whenTime: "",
    whenCustom: "",
    involved: "",
    involvedTags: [],
    media: [],
    contact: kind === "tip" ? "none" : "chat",
  };
}

/* ───────────────────────── Steps ───────────────────────── */

export type StepId =
  | "what"
  | "danger"
  | "where"
  | "when"
  | "involved"
  | "evidence"
  | "contact"
  | "review";

export const STEPS: {
  id: StepId;
  title: TKey;
  short: TKey;
  icon: LucideIcon;
  /** Fields validated before the citizen may continue past this step. */
  fields: ReportField[];
}[] = [
  {
    id: "what",
    title: "report.step.what",
    short: "report.stepShort.what",
    icon: ShieldQuestion,
    fields: ["categoryId", "description"],
  },
  {
    id: "danger",
    title: "report.step.danger",
    short: "report.stepShort.danger",
    icon: TriangleAlert,
    fields: ["danger"],
  },
  {
    id: "where",
    title: "report.step.where",
    short: "report.stepShort.where",
    icon: MapPin,
    fields: ["locationMode", "located", "areaKey", "landmark"],
  },
  {
    id: "when",
    title: "report.step.when",
    short: "report.stepShort.when",
    icon: CalendarClock,
    fields: ["whenMode", "whenTime", "whenCustom"],
  },
  {
    id: "involved",
    title: "report.step.involved",
    short: "report.stepShort.involved",
    icon: Users,
    fields: ["involved", "involvedTags"],
  },
  {
    id: "evidence",
    title: "report.step.evidence",
    short: "report.stepShort.evidence",
    icon: Camera,
    fields: ["media"],
  },
  {
    id: "contact",
    title: "report.step.contact",
    short: "report.stepShort.contact",
    icon: MessageCircle,
    fields: ["contact"],
  },
  {
    id: "review",
    title: "report.step.review",
    short: "report.stepShort.review",
    icon: ClipboardCheck,
    fields: [],
  },
];

export const LAST_STEP = STEPS.length - 1;

/* ───────────────────────── Derivations ───────────────────────── */

/** Today's date at "HH:mm", or null when the text is not a time. */
function timeToday(hhmm: string, now: number): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const at = new Date(now);
  at.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return at.getTime();
}

/** When the incident happened, as epoch ms, from the citizen's answer on the "When?" step. */
export function resolveOccurredAt(
  values: Pick<ReportValues, "whenMode" | "whenTime" | "whenCustom">,
  now: number,
): number {
  if (values.whenMode === "today") {
    const exact = values.whenTime ? timeToday(values.whenTime, now) : null;
    if (exact !== null) return Math.min(exact, now);
    // No time given: record the middle of the day so far rather than pretending to precision.
    const dayStart = startOfDay(now).getTime();
    return Math.round((dayStart + now) / 2);
  }
  if (values.whenMode === "custom") {
    const at = new Date(values.whenCustom).getTime();
    return Number.isNaN(at) ? now : Math.min(at, now);
  }
  return now;
}

/**
 * Where it happened, from the "choose an area" answer. A recognised landmark nudges the point so
 * reports at different landmarks in the same area do not sit on one spot.
 */
export function areaLocation(
  areaKey: string,
  landmarkText: string,
): Location | null {
  const area = AREAS[areaKey];
  if (!area) return null;
  const landmark = landmarkText.trim() || undefined;
  const point =
    landmark && area.landmarks.includes(landmark)
      ? offsetPoint(area, 0.0014, landmark)
      : { lat: area.lat, lng: area.lng };
  return {
    ...point,
    address: `${landmark ? `${landmark}, ` : ""}${area.name}, ${deployment.primaryCity}`,
    area: area.name,
    landmark,
    districtId: "d-ahd",
    stationId: area.stationId,
    source: "citizen_entered",
  };
}

/** Category default, raised to at least High when the citizen says someone is in danger. */
export function resolvePriority(
  category: IncidentCategory | undefined,
  danger: ReportValues["danger"],
): IncidentPriority {
  const base = category?.defaultPriority ?? "P3";
  return danger === "yes" && PRIORITY_META[base].rank > PRIORITY_META.P2.rank
    ? "P2"
    : base;
}

export const peopleInDanger = (
  danger: ReportValues["danger"],
): boolean | undefined =>
  danger === "yes" ? true : danger === "no" ? false : undefined;

const TAG_TEXT: Record<InvolvedTag, string> = {
  vehicle: "vehicle involved",
  multiple: "more than one person",
  weapon: "weapon seen",
  ongoing: "still happening when reported",
};

const CONTACT_TEXT: Record<Complaint["contactPreference"], string> = {
  call: "phone call",
  chat: "in-app message",
  none: "do not contact",
};

/**
 * The record staff read. Incidents carry a single description, so the answers that have no field of
 * their own are appended in plain English, which is the working language of the consoles.
 */
export function composeDescription(
  values: ReportValues,
  now: number,
  opts: { includeContact: boolean },
): string {
  const lines = [values.description.trim()];
  const involved = values.involved.trim();
  if (involved) lines.push(`Involved: ${involved}`);
  if (values.involvedTags.length)
    lines.push(
      `Noted: ${values.involvedTags.map((tag) => TAG_TEXT[tag]).join(", ")}.`,
    );
  lines.push(
    values.whenMode === "now"
      ? "Happened: just before the report."
      : values.whenMode === "today"
        ? `Happened: earlier today${values.whenTime ? `, around ${values.whenTime}` : ""}.`
        : `Happened: ${formatDateTime(resolveOccurredAt(values, now))}.`,
  );
  if (opts.includeContact)
    lines.push(`Contact preference: ${CONTACT_TEXT[values.contact]}.`);
  return lines.join("\n");
}

/** A short heading for the complaint list, taken from the first sentence of the description. */
export function makeTitle(description: string, fallback: string): string {
  const first =
    description
      .trim()
      .split(/[\n.!?।]/)[0]
      ?.trim() ?? "";
  if (first.length < 6) return fallback;
  return first.length > 72 ? `${first.slice(0, 69).trimEnd()}…` : first;
}

/** "Aarav Shah" → "Aarav S." — the reduced name staff roles are allowed to see. */
export function reducedName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}
