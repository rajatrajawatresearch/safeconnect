import type { AnalyticsOverview, DistrictSummary } from "@/types";
import { DISTRICTS } from "./geo";

/** Aggregated demo figures. Counts describe incidents and places, never people or communities. */

const HOURLY = [
  9, 6, 4, 3, 3, 5, 11, 19, 27, 31, 29, 33, 36, 30, 28, 32, 38, 44, 49, 46, 41,
  34, 24, 15,
];
const HOURLY_CRITICAL = [
  1, 1, 0, 0, 0, 0, 1, 1, 2, 2, 1, 2, 3, 2, 1, 2, 3, 4, 5, 4, 4, 3, 2, 1,
];

const TREND_DAYS = [
  "23 Sep",
  "24 Sep",
  "25 Sep",
  "26 Sep",
  "27 Sep",
  "28 Sep",
  "29 Sep",
  "30 Sep",
  "1 Oct",
  "2 Oct",
  "3 Oct",
  "4 Oct",
  "5 Oct",
  "6 Oct",
];
const TREND_RESPONSE = [
  9.4, 9.1, 8.8, 9.6, 10.2, 9.9, 8.7, 8.4, 8.1, 8.6, 9.3, 8.9, 8.2, 7.8,
];
const TREND_OPENED = [
  612, 598, 640, 701, 742, 688, 624, 607, 633, 655, 728, 760, 694, 418,
];
const TREND_RESOLVED = [
  588, 590, 611, 668, 706, 690, 631, 598, 640, 637, 702, 731, 688, 381,
];
const TREND_RESOLUTION = [
  48, 47, 46, 51, 55, 52, 46, 44, 43, 45, 50, 49, 44, 42,
];

const DISTRICT_FIGURES: Record<
  string,
  Omit<DistrictSummary, "districtId" | "name" | "center">
> = {
  "d-ahd": {
    active: 13,
    critical: 3,
    resolvedToday: 381,
    avgResponseMin: 7.8,
    unitsAvailable: 5,
    unitsTotal: 16,
    slaPct: 91,
    escalations: 2,
  },
  "d-srt": {
    active: 11,
    critical: 2,
    resolvedToday: 342,
    avgResponseMin: 8.4,
    unitsAvailable: 31,
    unitsTotal: 96,
    slaPct: 89,
    escalations: 1,
  },
  "d-vad": {
    active: 6,
    critical: 1,
    resolvedToday: 148,
    avgResponseMin: 8.1,
    unitsAvailable: 22,
    unitsTotal: 58,
    slaPct: 92,
    escalations: 0,
  },
  "d-rjk": {
    active: 5,
    critical: 1,
    resolvedToday: 121,
    avgResponseMin: 9.2,
    unitsAvailable: 17,
    unitsTotal: 44,
    slaPct: 87,
    escalations: 1,
  },
  "d-gnr": {
    active: 3,
    critical: 0,
    resolvedToday: 64,
    avgResponseMin: 10.6,
    unitsAvailable: 14,
    unitsTotal: 30,
    slaPct: 90,
    escalations: 0,
  },
  "d-bvn": {
    active: 4,
    critical: 0,
    resolvedToday: 77,
    avgResponseMin: 12.3,
    unitsAvailable: 12,
    unitsTotal: 34,
    slaPct: 84,
    escalations: 0,
  },
  "d-jam": {
    active: 2,
    critical: 0,
    resolvedToday: 58,
    avgResponseMin: 11.8,
    unitsAvailable: 13,
    unitsTotal: 29,
    slaPct: 86,
    escalations: 0,
  },
  "d-jnd": {
    active: 3,
    critical: 1,
    resolvedToday: 61,
    avgResponseMin: 13.1,
    unitsAvailable: 9,
    unitsTotal: 31,
    slaPct: 81,
    escalations: 1,
  },
  "d-kch": {
    active: 2,
    critical: 0,
    resolvedToday: 49,
    avgResponseMin: 16.4,
    unitsAvailable: 15,
    unitsTotal: 40,
    slaPct: 78,
    escalations: 0,
  },
  "d-msn": {
    active: 2,
    critical: 0,
    resolvedToday: 52,
    avgResponseMin: 11.2,
    unitsAvailable: 10,
    unitsTotal: 26,
    slaPct: 88,
    escalations: 0,
  },
  "d-and": {
    active: 3,
    critical: 0,
    resolvedToday: 55,
    avgResponseMin: 10.9,
    unitsAvailable: 8,
    unitsTotal: 24,
    slaPct: 89,
    escalations: 0,
  },
  "d-brc": {
    active: 2,
    critical: 0,
    resolvedToday: 44,
    avgResponseMin: 12.7,
    unitsAvailable: 9,
    unitsTotal: 25,
    slaPct: 85,
    escalations: 0,
  },
};

export const DISTRICT_SUMMARIES: DistrictSummary[] = DISTRICTS.map((d) => ({
  districtId: d.id,
  name: d.name,
  center: d.center,
  ...DISTRICT_FIGURES[d.id],
}));

export const ANALYTICS: AnalyticsOverview = {
  hourly: HOURLY.map((incidents, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    incidents,
    critical: HOURLY_CRITICAL[h],
  })),
  trend: TREND_DAYS.map((day, i) => ({
    day,
    responseMin: TREND_RESPONSE[i],
    targetMin: 9,
    opened: TREND_OPENED[i],
    resolved: TREND_RESOLVED[i],
    resolutionMin: TREND_RESOLUTION[i],
  })),
  categories: [
    { category: "Traffic", count: 1840 },
    { category: "Public safety", count: 1422 },
    { category: "Immediate safety", count: 1105 },
    { category: "Cyber and financial", count: 968 },
    { category: "Emergency assistance", count: 742 },
    { category: "Crime information", count: 311 },
  ],
  districts: DISTRICT_SUMMARIES,
  resource: [
    { label: "PCR vans", available: 38, engaged: 64, offDuty: 19 },
    { label: "Patrol SUVs", available: 34, engaged: 50, offDuty: 13 },
    { label: "Motorcycles", available: 63, engaged: 58, offDuty: 26 },
    { label: "Women's help units", available: 13, engaged: 20, offDuty: 6 },
    { label: "Traffic interceptors", available: 17, engaged: 24, offDuty: 8 },
  ],
  sla: [
    { stage: "Acknowledgement", pct: 96, targetLabel: "P1 within 15 sec" },
    { stage: "Dispatch", pct: 91, targetLabel: "P1 within 60 sec" },
    { stage: "Arrival", pct: 84, targetLabel: "P1 within 8 min" },
    { stage: "Resolution", pct: 88, targetLabel: "P1 within 60 min" },
  ],
  unitUtilisation: [
    { unit: "GJ-AHD-23", pct: 86 },
    { unit: "GJ-AHD-17", pct: 81 },
    { unit: "GJ-AHD-15", pct: 78 },
    { unit: "GJ-AHD-04", pct: 74 },
    { unit: "GJ-AHD-09", pct: 71 },
    { unit: "GJ-AHD-12", pct: 66 },
    { unit: "GJ-AHD-06", pct: 58 },
    { unit: "GJ-AHD-11", pct: 52 },
    { unit: "GJ-AHD-25", pct: 47 },
    { unit: "GJ-AHD-01", pct: 44 },
  ],
  escalationRatePct: 3.4,
  activeVsResolved: [
    { label: "00–04", active: 4, resolved: 22 },
    { label: "04–08", active: 3, resolved: 38 },
    { label: "08–12", active: 7, resolved: 106 },
    { label: "12–16", active: 9, resolved: 119 },
    { label: "16–20", active: 13, resolved: 96 },
    { label: "20–24", active: 0, resolved: 0 },
  ],
};
