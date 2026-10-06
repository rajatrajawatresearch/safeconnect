"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type {
  DensityCell,
  DistrictSummary,
  Facility,
  Incident,
  LatLng,
  Station,
  Unit,
} from "@/types";

export type MapSelection = {
  type: "incident" | "unit" | "station" | "facility" | "district";
  id: string;
};

export interface OpsMapProps {
  center?: LatLng;
  zoom?: number;
  incidents?: Incident[];
  /** En-route units animate towards their incident, so pass the matching incidents too. */
  units?: Unit[];
  stations?: Station[];
  facilities?: Facility[];
  /** Historical incident density by place. Label it as such wherever it is shown. */
  density?: DensityCell[];
  /** State view: one sized bubble per district instead of individual markers. */
  districts?: DistrictSummary[];
  /** The viewer's own position (citizen or officer). */
  me?: LatLng;
  route?: { from: LatLng; to: LatLng };
  /** Points to keep in frame; the view re-fits whenever they change. */
  focus?: LatLng[];
  selected?: MapSelection | null;
  onSelect?: (selection: MapSelection) => void;
  /** `false` renders a still preview with no pan or zoom. */
  interactive?: boolean;
  showZoom?: boolean;
  label?: string;
  className?: string;
}

const Inner = dynamic(() => import("./ops-map-inner"), {
  ssr: false,
  loading: () => (
    <div
      aria-busy="true"
      aria-label="Loading map"
      className="map-ground size-full animate-pulse"
    />
  ),
});

/**
 * Leaflet map on OpenStreetMap tiles — no API key. Markers are themed HTML, and the ground pattern
 * keeps the view readable if tiles cannot load. Give the wrapper a height via `className`.
 */
export function OpsMap({ className, ...props }: OpsMapProps) {
  return (
    <div
      className={cn(
        "map-ground relative isolate min-h-40 overflow-hidden",
        className,
      )}
    >
      <Inner {...props} />
    </div>
  );
}

const LEGEND: {
  cls: string;
  shape: "round" | "square" | "place";
  label: string;
}[] = [
  { cls: "bg-critical", shape: "round", label: "Critical incident" },
  { cls: "bg-high", shape: "round", label: "High priority" },
  { cls: "bg-normal", shape: "round", label: "Normal incident" },
  { cls: "bg-resolved", shape: "square", label: "Available unit" },
  { cls: "bg-high", shape: "square", label: "Busy unit" },
  {
    cls: "bg-card border border-input",
    shape: "place",
    label: "Station, hospital, fire station",
  },
];

export function MapLegend({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground",
        className,
      )}
      aria-label="Map legend"
    >
      {LEGEND.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "size-2.5",
              item.cls,
              item.shape === "round" ? "rounded-full" : "rounded-[3px]",
            )}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
