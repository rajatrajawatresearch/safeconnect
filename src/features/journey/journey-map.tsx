"use client";

import { useMemo } from "react";
import { OpsMap } from "@/components/shared/ops-map";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import type { Journey, LatLng } from "@/types";

/**
 * The planned route of a journey with, while it is running, the citizen's estimated position.
 * The map shows only this journey: no incidents, units or other people.
 */
export function JourneyMap({
  journey,
  position,
  interactive = false,
  className,
}: {
  journey: Pick<Journey, "from" | "destination">;
  position?: LatLng;
  interactive?: boolean;
  className?: string;
}) {
  const t = useT();
  const { from, destination } = journey;
  const route = useMemo(
    () => ({
      from: { lat: from.lat, lng: from.lng },
      to: { lat: destination.lat, lng: destination.lng },
    }),
    [from.lat, from.lng, destination.lat, destination.lng],
  );
  const focus = useMemo(() => [route.from, route.to], [route]);
  const center = useMemo(
    () => ({
      lat: (route.from.lat + route.to.lat) / 2,
      lng: (route.from.lng + route.to.lng) / 2,
    }),
    [route],
  );

  return (
    <OpsMap
      center={center}
      zoom={13}
      route={route}
      focus={focus}
      me={position}
      interactive={interactive}
      showZoom={interactive}
      label={t("journey.map.label", {
        from: from.label,
        to: destination.label,
      })}
      className={cn("size-full", className)}
    />
  );
}
