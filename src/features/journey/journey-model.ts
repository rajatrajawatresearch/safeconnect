import { z } from "zod";
import { deployment } from "@/config/deployment";
import type { Tone } from "@/config/incident";
import { AREAS } from "@/data/demo/geo";
import { distanceKm, etaMinutesBetween, lerp } from "@/lib/geo";
import type { TKey } from "@/lib/i18n";
import type {
  Citizen,
  Journey,
  JourneyStatus,
  LatLng,
  Location,
} from "@/types";

const MIN = 60_000;

export const DURATION_OPTIONS = [10, 15, 20, 30, 45, 60] as const;
export const INTERVAL_OPTIONS = [5, 10, 15, 30] as const;

/** `from` value meaning "where the citizen is now" rather than a named area. */
export const FROM_CURRENT = "current";

export const JOURNEY_STATUS_META: Record<
  JourneyStatus,
  { label: TKey; tone: Tone }
> = {
  active: { label: "journey.status.active", tone: "normal" },
  completed: { label: "journey.status.completed", tone: "resolved" },
  stopped: { label: "journey.status.stopped", tone: "neutral" },
  help_requested: { label: "journey.status.help_requested", tone: "critical" },
};

/** Validation messages are translation keys; `FieldError` resolves them. */
export const startJourneySchema = z
  .object({
    from: z.string(),
    destination: z.string().min(1, "journey.error.destination" satisfies TKey),
    durationMin: z.number().int().min(5).max(180),
    intervalMin: z.number().int().min(1).max(60),
    contactIds: z.array(z.string()),
    consent: z
      .boolean()
      .refine((v) => v, "journey.error.consent" satisfies TKey),
  })
  .superRefine((v, ctx) => {
    if (v.destination && v.destination === v.from)
      ctx.addIssue({
        code: "custom",
        path: ["destination"],
        message: "journey.error.samePlace" satisfies TKey,
      });
  });

export type StartJourneyValues = z.infer<typeof startJourneySchema>;

type Place = Journey["from"];

export function fromPlace(citizen: Citizen, from: string): Place {
  const area = AREAS[from];
  return area
    ? { label: area.name, lat: area.lat, lng: area.lng }
    : { label: citizen.area, ...citizen.home };
}

export function destinationPlace(key: string): Place | null {
  const area = AREAS[key];
  return area ? { label: area.name, lat: area.lat, lng: area.lng } : null;
}

/** Road-time estimate rounded up to the nearest offered option, so the default is never optimistic. */
export function suggestDuration(
  from: LatLng,
  to: LatLng,
): {
  estimateMin: number;
  option: number;
} {
  // City traffic on a personal trip is slower than an emergency run.
  const estimateMin = etaMinutesBetween(from, to, 18);
  const option =
    DURATION_OPTIONS.find((d) => d >= estimateMin) ??
    DURATION_OPTIONS[DURATION_OPTIONS.length - 1];
  return { estimateMin, option };
}

export interface JourneyClock {
  elapsedSec: number;
  /** Seconds until the expected arrival; negative once it has passed. */
  remainingSec: number;
  late: boolean;
  /** 0 → 1 share of the planned time that has gone by. */
  progress: number;
  nextCheckAt: number;
  /** Seconds until the next safety check; negative once it is overdue. */
  checkInSec: number;
  checkOverdue: boolean;
}

export function journeyClock(journey: Journey, now: number): JourneyClock {
  const total = Math.max(1, journey.expectedArrivalAt - journey.startedAt);
  const elapsed = Math.max(0, now - journey.startedAt);
  const nextCheckAt = journey.lastCheckInAt + journey.checkIntervalMin * MIN;
  return {
    elapsedSec: elapsed / 1000,
    remainingSec: (journey.expectedArrivalAt - now) / 1000,
    late: now > journey.expectedArrivalAt,
    progress: Math.min(1, elapsed / total),
    nextCheckAt,
    checkInSec: (nextCheckAt - now) / 1000,
    checkOverdue: now >= nextCheckAt,
  };
}

/**
 * Estimated position along the planned route. The demo has no device feed, so the point moves with
 * the clock and stops just short of the destination until the citizen says they have arrived.
 */
export function journeyPosition(journey: Journey, now: number): LatLng {
  const total = Math.max(1, journey.expectedArrivalAt - journey.startedAt);
  const t = Math.max(0, now - journey.startedAt) / total;
  return lerp(journey.from, journey.destination, Math.min(0.97, t));
}

/** A full location record for an SOS raised mid-journey: the route position and the station that covers it. */
export function locationOnRoute(position: LatLng, journey: Journey): Location {
  const nearest = Object.values(AREAS).reduce((best, area) =>
    distanceKm(area, position) < distanceKm(best, position) ? area : best,
  );
  return {
    ...position,
    address: `On the way to ${journey.destination.label}, near ${nearest.name}, ${deployment.primaryCity}`,
    area: nearest.name,
    districtId: "d-ahd",
    stationId: nearest.stationId,
    source: "device_emergency",
    accuracyM: 25,
  };
}

export const journeyMinutes = (journey: Journey): number =>
  Math.max(
    1,
    Math.round(
      ((journey.endedAt ?? journey.expectedArrivalAt) - journey.startedAt) /
        MIN,
    ),
  );
