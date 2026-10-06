"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEmergencySharing } from "@/features/citizen/use-citizen-data";
import { useAction } from "@/hooks/use-action";
import { useCitizenActiveSos } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { citizenLocation, services } from "@/services";
import type { Citizen, Location } from "@/types";

export interface RaiseSosOptions {
  silent?: boolean;
  /** One of the quick-action categories. Omitted for a plain SOS. */
  categoryId?: string;
  note?: string;
}

/**
 * What an SOS carries when the citizen has switched live location off: the area they registered,
 * marked as entered by them rather than read from the device.
 */
export function savedAreaLocation(citizen: Citizen): Location {
  return {
    ...citizenLocation(citizen, "saved-area"),
    lat: citizen.home.lat,
    lng: citizen.home.lng,
    address: `${citizen.area}, ${citizen.city}`,
    landmark: undefined,
    source: "citizen_entered",
    accuracyM: undefined,
  };
}

/**
 * Raises an emergency for the signed-in citizen and opens the emergency screen.
 * Never raises a second one while an emergency is already open.
 */
export function useRaiseSos() {
  const { citizen } = useSession();
  const router = useRouter();
  const t = useT();
  const active = useCitizenActiveSos(citizen?.id);
  const shareLive = useEmergencySharing();
  const trigger = useAction(services.sos.trigger);

  const raise = async (options: RaiseSosOptions = {}): Promise<boolean> => {
    if (!citizen || trigger.pending) return false;
    if (active) {
      toast(t("citizen.sos.alreadyActive"));
      router.push("/citizen/sos");
      return false;
    }
    const incident = await trigger.run({
      citizen,
      silent: options.silent,
      categoryId: options.categoryId,
      note: options.note,
      // With sharing on the service reads the device position at this moment and not before.
      location: shareLive ? undefined : savedAreaLocation(citizen),
    });
    if (!incident) return false;
    if (incident.sync === "queued") toast.warning(t("citizen.sos.queued"));
    // A silent SOS gives no audible or visible confirmation beyond the screen changing.
    else if (!options.silent) toast.success(t("citizen.sos.activated"));
    router.push("/citizen/sos");
    return true;
  };

  return { raise, pending: trigger.pending, active, shareLive };
}
