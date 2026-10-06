import {
  Bike,
  Car,
  CarFront,
  ShieldUser,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { STATIONS } from "@/data/demo/geo";
import type { Unit, UnitStatus, VehicleType } from "@/types";

export const VEHICLE_ICON: Record<VehicleType, LucideIcon> = {
  "PCR van": Truck,
  "Patrol SUV": Car,
  Motorcycle: Bike,
  "Women's help unit": ShieldUser,
  "Traffic interceptor": CarFront,
};

export const UNIT_STATUSES: UnitStatus[] = [
  "available",
  "assigned",
  "en_route",
  "on_scene",
  "unavailable",
  "off_duty",
];

/** Statuses a dispatcher may set by hand. The engaged ones follow the incident. */
export const MANUAL_STATUSES: UnitStatus[] = [
  "available",
  "unavailable",
  "off_duty",
];

export const isUnitStatus = (value: string | null): value is UnitStatus =>
  value !== null && (UNIT_STATUSES as string[]).includes(value);

/** A unit is engaged while it is tied to an incident. */
export const isEngaged = (unit: Unit) =>
  unit.status === "assigned" ||
  unit.status === "en_route" ||
  unit.status === "on_scene" ||
  unit.currentIncidentId !== null;

/** "Navrangpura PS" — the short form used in dense rows. */
export function stationShort(stationId: string): string {
  const station = STATIONS.find((s) => s.id === stationId);
  return station ? `${station.area} PS` : "Station not set";
}

export const AVAILABILITY_LABEL: Record<UnitStatus, string> = {
  available: "Ready to be assigned",
  assigned: "Assigned, waiting for the officer to accept",
  en_route: "Engaged, travelling to an incident",
  on_scene: "Engaged at an incident",
  unavailable: "Temporarily unavailable",
  off_duty: "Off duty",
};
