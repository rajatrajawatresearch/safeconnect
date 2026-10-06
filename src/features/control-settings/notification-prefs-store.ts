"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NotificationKind } from "@/types";

/** Alert kinds a console user may silence. Critical incidents are not among them on purpose. */
export type AlertKey =
  | "incident"
  | "assignment"
  | "backup"
  | "escalation"
  | "evidence"
  | "complaint"
  | "system";

export const ALERT_OPTIONS: {
  key: AlertKey;
  label: string;
  description: string;
}[] = [
  {
    key: "incident",
    label: "New incidents",
    description: "High, medium and normal incidents entering the queue.",
  },
  {
    key: "assignment",
    label: "Assignment changes",
    description: "A unit accepts, declines or is released.",
  },
  {
    key: "backup",
    label: "Backup requests",
    description: "An officer or operator asks for another unit.",
  },
  {
    key: "escalation",
    label: "Escalations",
    description: "An incident is raised to a supervisor or to command.",
  },
  {
    key: "evidence",
    label: "New evidence",
    description: "A photo, video, audio clip or document is added.",
  },
  {
    key: "complaint",
    label: "Complaints",
    description: "A complaint or a confidential tip arrives or changes.",
  },
  {
    key: "system",
    label: "Shift notices",
    description: "Shift changes and platform messages.",
  },
];

const DEFAULT_ALERTS: Record<AlertKey, boolean> = {
  incident: true,
  assignment: true,
  backup: true,
  escalation: true,
  evidence: true,
  complaint: true,
  system: true,
};

interface NotificationPrefsState {
  alerts: Record<AlertKey, boolean>;
  setAlert: (key: AlertKey, enabled: boolean) => void;
  resetNotificationPrefs: () => void;
}

/** Alert preferences for this workstation. Kept in the browser, like the other console preferences. */
export const useNotificationPrefs = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      alerts: DEFAULT_ALERTS,
      setAlert: (key, enabled) =>
        set((s) => ({ alerts: { ...s.alerts, [key]: enabled } })),
      resetNotificationPrefs: () => set({ alerts: DEFAULT_ALERTS }),
    }),
    { name: "sanket-console-alerts-v1" },
  ),
);

const KIND_TO_ALERT: Partial<Record<NotificationKind, AlertKey>> = {
  incident: "incident",
  assignment: "assignment",
  backup: "backup",
  escalation: "escalation",
  evidence: "evidence",
  complaint: "complaint",
  system: "system",
};

/**
 * Whether a notification of this kind should raise a banner on this workstation.
 * Critical incidents, SOS and journey alerts always do.
 */
export function alertAllowed(kind: NotificationKind): boolean {
  const key = KIND_TO_ALERT[kind];
  return key ? useNotificationPrefs.getState().alerts[key] : true;
}
