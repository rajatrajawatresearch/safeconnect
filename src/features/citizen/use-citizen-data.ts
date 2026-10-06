"use client";

import { useMemo } from "react";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Complaint, EmergencyContact, LanguageCode } from "@/types";

/**
 * Whether an SOS may carry the device position.
 * Both the device permission and the emergency-sharing consent have to be on.
 */
export function useEmergencySharing(): boolean {
  return usePrefsStore(
    (s) => s.privacy.location && s.privacy.emergencyLocationSharing,
  );
}

/** Trusted contacts that belong to one citizen, in the order they were added. */
export function useCitizenContacts(
  citizenId: string | undefined,
): EmergencyContact[] {
  const all = useDemoStore((s) => s.contacts);
  return useMemo(
    () => (citizenId ? all.filter((c) => c.citizenId === citizenId) : []),
    [all, citizenId],
  );
}

/** Contacts that are told when this citizen raises an SOS, honouring the privacy switch. */
export function useSosContacts(citizenId: string | undefined): {
  contacts: EmergencyContact[];
  /** False when the citizen has switched emergency contacts off in the privacy centre. */
  allowed: boolean;
} {
  const mine = useCitizenContacts(citizenId);
  const allowed = usePrefsStore((s) => s.privacy.emergencyContacts);
  return useMemo(
    () => ({
      contacts: allowed ? mine.filter((c) => c.notifyOnSos) : [],
      allowed,
    }),
    [mine, allowed],
  );
}

const CLOSED: Complaint["status"][] = ["resolved", "closed"];

export function useCitizenComplaints(citizenId: string | undefined): {
  all: Complaint[];
  openCount: number;
} {
  const complaints = useDemoStore((s) => s.complaints);
  return useMemo(() => {
    const all = citizenId
      ? complaints.filter((c) => c.citizenId === citizenId)
      : [];
    return {
      all,
      openCount: all.filter((c) => !CLOSED.includes(c.status)).length,
    };
  }, [complaints, citizenId]);
}

/** "Rekha, Dev and Mahesh" — first names only, joined the way the chosen language joins a list. */
export function joinNames(
  contacts: EmergencyContact[],
  language: LanguageCode = "en",
): string {
  const names = contacts.map((c) => c.name.split(" ")[0]);
  return new Intl.ListFormat(language, {
    style: "long",
    type: "conjunction",
  }).format(names);
}
