"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PERSONA_ID } from "@/data/demo/people";
import type { Connectivity, LanguageCode, Timestamp } from "@/types";

export type PrivacyKey =
  | "location"
  | "camera"
  | "microphone"
  | "notifications"
  | "emergencyContacts"
  | "emergencyLocationSharing"
  | "journeySharing";

export interface ConsentRecord {
  id: string;
  key: PrivacyKey;
  granted: boolean;
  at: Timestamp;
}

interface PrefsState {
  language: LanguageCode;
  personaId: string;
  simulationPaused: boolean;
  connectivity: Connectivity;
  sidebarCollapsed: boolean;
  privacy: Record<PrivacyKey, boolean>;
  consentHistory: ConsentRecord[];
  /** Staff session security demo: when the current console session was last verified. */
  mfaVerifiedAt: Timestamp | null;

  setLanguage: (language: LanguageCode) => void;
  setPersona: (personaId: string) => void;
  setSimulationPaused: (paused: boolean) => void;
  setConnectivity: (connectivity: Connectivity) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPrivacy: (key: PrivacyKey, granted: boolean) => void;
  setMfaVerified: (at: Timestamp | null) => void;
  resetPrefs: () => void;
}

const DEFAULT_PRIVACY: Record<PrivacyKey, boolean> = {
  location: true,
  camera: false,
  microphone: false,
  notifications: true,
  emergencyContacts: true,
  emergencyLocationSharing: true,
  journeySharing: false,
};

/** Preferences that belong to this browser: language, demo persona, privacy choices. */
export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      language: "en",
      personaId: DEFAULT_PERSONA_ID,
      simulationPaused: false,
      connectivity: "online",
      sidebarCollapsed: false,
      privacy: DEFAULT_PRIVACY,
      consentHistory: [],
      mfaVerifiedAt: null,

      setLanguage: (language) => set({ language }),
      setPersona: (personaId) => set({ personaId }),
      setSimulationPaused: (simulationPaused) => set({ simulationPaused }),
      setConnectivity: (connectivity) => set({ connectivity }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setPrivacy: (key, granted) =>
        set((s) => ({
          privacy: { ...s.privacy, [key]: granted },
          consentHistory: [
            { id: `${key}-${Date.now()}`, key, granted, at: Date.now() },
            ...s.consentHistory,
          ].slice(0, 40),
        })),
      setMfaVerified: (mfaVerifiedAt) => set({ mfaVerifiedAt }),
      resetPrefs: () =>
        set({
          privacy: DEFAULT_PRIVACY,
          consentHistory: [],
          connectivity: "online",
          simulationPaused: false,
          mfaVerifiedAt: null,
        }),
    }),
    { name: "sanket-prefs-v1" },
  ),
);
