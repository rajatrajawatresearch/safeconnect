"use client";

import { useMemo } from "react";
import { RestrictedState } from "@/components/shared/states";
import {
  useCitizenActiveSos,
  useCitizenIncidents,
} from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import type { Citizen } from "@/types";
import { SosActive } from "./sos-active";
import { SosClosure } from "./sos-closure";
import { SosDiscreet } from "./sos-discreet";
import { SosQueued } from "./sos-queued";
import { SosTrigger } from "./sos-trigger";
import { findUnseenClosure, useSosUi } from "./sos-ui-store";

/**
 * One route, five faces. Which one shows is decided entirely by the citizen's incident record:
 * nothing open → the trigger; raised offline → queued; open → the live emergency (or its discreet
 * variant); just ended → a closure summary until it is dismissed.
 */
function SosForCitizen({ citizen }: { citizen: Citizen }) {
  const active = useCitizenActiveSos(citizen.id);
  const incidents = useCitizenIncidents(citizen.id);
  const discreet = useSosUi((s) => s.discreet);
  const dismissed = useSosUi((s) => s.dismissed);
  const closed = useMemo(
    () => findUnseenClosure(incidents, dismissed),
    [incidents, dismissed],
  );

  if (active) {
    if (active.sync === "queued") return <SosQueued incident={active} />;
    // An SOS raised silently opens in the discreet view; the citizen can switch either way.
    return (discreet[active.id] ?? Boolean(active.silent)) ? (
      <SosDiscreet incident={active} />
    ) : (
      <SosActive incident={active} citizen={citizen} />
    );
  }
  if (closed) return <SosClosure incident={closed} />;
  return <SosTrigger citizen={citizen} />;
}

export function SosScreen() {
  const { citizen } = useSession();
  if (!citizen)
    return (
      <RestrictedState description="This screen is for the citizen app. Switch to a citizen from the demo role menu." />
    );
  return <SosForCitizen citizen={citizen} />;
}
