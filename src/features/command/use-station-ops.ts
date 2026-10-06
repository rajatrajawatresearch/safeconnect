"use client";

import { useMemo } from "react";
import { ACTIVE_STATUSES } from "@/config/incident";
import { STATIONS } from "@/data/demo/geo";
import type { AvailabilityRow } from "@/features/analytics/panels";
import { useIncidents, useUnits } from "@/hooks/use-demo-data";
import { useDemoStore } from "@/stores/demo-store";
import type { Station, Unit, UnitStatus, VehicleType } from "@/types";

const ENGAGED: UnitStatus[] = ["assigned", "en_route", "on_scene"];

/** Splits units into the three groups command works with. Unavailable counts with off duty. */
export function unitBuckets(units: Unit[]) {
  const available = units.filter((u) => u.status === "available").length;
  const engaged = units.filter((u) => ENGAGED.includes(u.status)).length;
  return {
    available,
    engaged,
    offDuty: units.length - available - engaged,
    total: units.length,
  };
}

export interface StationOps {
  station: Station;
  active: number;
  critical: number;
  unitsAvailable: number;
  unitsEngaged: number;
  unitsOffDuty: number;
  unitsTotal: number;
  /** Mean minutes from creation to arrival, or null when no unit has arrived yet. */
  avgResponseMin: number | null;
  escalationsOpen: number;
}

/** One row per station in the district, computed from the live store. */
export function useStationOps(districtId: string): StationOps[] {
  const incidents = useIncidents();
  const units = useUnits();
  const escalations = useDemoStore((s) => s.escalations);
  return useMemo(
    () =>
      STATIONS.filter((s) => s.districtId === districtId).map((station) => {
        const mine = incidents.filter(
          (i) => i.location.stationId === station.id,
        );
        const active = mine.filter((i) => ACTIVE_STATUSES.includes(i.status));
        const arrived = mine.filter((i) => i.arrivedAt !== undefined);
        const ids = new Set(mine.map((i) => i.id));
        const buckets = unitBuckets(
          units.filter((u) => u.stationId === station.id),
        );
        return {
          station,
          active: active.length,
          critical: active.filter((i) => i.priority === "P1").length,
          unitsAvailable: buckets.available,
          unitsEngaged: buckets.engaged,
          unitsOffDuty: buckets.offDuty,
          unitsTotal: buckets.total,
          avgResponseMin: arrived.length
            ? arrived.reduce(
                (total, i) =>
                  total + ((i.arrivedAt as number) - i.createdAt) / 60_000,
                0,
              ) / arrived.length
            : null,
          escalationsOpen: escalations.filter(
            (e) => e.status === "open" && ids.has(e.incidentId),
          ).length,
        };
      }),
    [incidents, units, escalations, districtId],
  );
}

const VEHICLE_LABEL: Record<VehicleType, string> = {
  "PCR van": "PCR vans",
  "Patrol SUV": "Patrol SUVs",
  Motorcycle: "Motorcycles",
  "Women's help unit": "Women's help units",
  "Traffic interceptor": "Traffic interceptors",
};

/** Live availability by vehicle type, in the same shape the analytics overview uses. */
export function vehicleAvailability(units: Unit[]): AvailabilityRow[] {
  return (Object.keys(VEHICLE_LABEL) as VehicleType[])
    .map((vehicle) => {
      const buckets = unitBuckets(units.filter((u) => u.vehicle === vehicle));
      return {
        label: VEHICLE_LABEL[vehicle],
        available: buckets.available,
        engaged: buckets.engaged,
        offDuty: buckets.offDuty,
      };
    })
    .filter((row) => row.available + row.engaged + row.offDuty > 0);
}

/** Live availability by station, for the station-wise chart. */
export const stationAvailability = (rows: StationOps[]): AvailabilityRow[] =>
  rows.map((r) => ({
    label: r.station.area,
    available: r.unitsAvailable,
    engaged: r.unitsEngaged,
    offDuty: r.unitsOffDuty,
  }));
