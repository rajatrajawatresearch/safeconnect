"use client";

import { ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { OpsMap } from "@/components/shared/ops-map";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/use-t";
import { roadKm } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { Incident, LatLng, Unit } from "@/types";
import { directionsUrl, useUnitPosition } from "./use-officer";

/** Live position of the unit and the road distance left to the incident. */
export function useRouteProgress(unit: Unit, incident: Incident) {
  const live = useUnitPosition(unit);
  const position: LatLng = live ?? unit.position;
  const km = roadKm(position, incident.location);
  return { position, km };
}

/**
 * The run from the unit to the incident. The line is a straight guide, not turn-by-turn routing;
 * "Open in maps" hands the two points to an external directions page.
 */
export function RouteMap({
  unit,
  incident,
  interactive = false,
  showRoute = true,
  className,
}: {
  unit: Unit;
  incident: Incident;
  /** `false` is a still preview that never traps a scrolling thumb. */
  interactive?: boolean;
  showRoute?: boolean;
  className?: string;
}) {
  const { position } = useRouteProgress(unit, incident);
  const { lat, lng } = incident.location;
  // Frame the whole run from where it started, so the view holds still while the unit moves.
  const origin = unit.routeFrom ?? unit.position;
  const focus = useMemo(
    () => [
      { lat: origin.lat, lng: origin.lng },
      { lat, lng },
    ],
    [origin.lat, origin.lng, lat, lng],
  );
  const units = useMemo(() => [unit], [unit]);
  const incidents = useMemo(() => [incident], [incident]);
  const route = useMemo(
    () => (showRoute ? { from: position, to: { lat, lng } } : undefined),
    [showRoute, position, lat, lng],
  );

  return (
    <OpsMap
      className={className}
      units={units}
      incidents={incidents}
      route={route}
      focus={focus}
      interactive={interactive}
      showZoom={interactive}
      label={`Route from unit ${unit.callSign} to ${incident.location.area}`}
    />
  );
}

/** External directions for the same two points. Leaves the app, so it opens in a new tab. */
export function OpenInMapsLink({
  from,
  to,
  size = "xl",
  variant = "outline",
  className,
}: {
  from: LatLng;
  to: LatLng;
  size?: "lg" | "xl" | "2xl";
  variant?: "outline" | "secondary" | "default";
  className?: string;
}) {
  const t = useT();
  return (
    <Button asChild variant={variant} size={size} className={cn(className)}>
      <a
        href={directionsUrl(from, to)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink aria-hidden />
        {t("officer.openInMaps")}
        <span className="sr-only"> (opens OpenStreetMap in a new tab)</span>
      </a>
    </Button>
  );
}
