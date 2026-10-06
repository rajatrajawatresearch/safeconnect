"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuditRetention = "1y" | "3y" | "7y" | "10y";

export const RETENTION_OPTIONS: { value: AuditRetention; label: string }[] = [
  { value: "1y", label: "1 year" },
  { value: "3y", label: "3 years" },
  { value: "7y", label: "7 years" },
  { value: "10y", label: "10 years" },
];

export const retentionLabel = (value: AuditRetention) =>
  RETENTION_OPTIONS.find((o) => o.value === value)?.label ?? value;

interface AdminSettingsState {
  /** How long audit entries are kept before archival. A demonstration value, not a statutory period. */
  auditRetention: AuditRetention;
  /** When on, exporting the audit log asks for a stated purpose, which is written to the log. */
  exportApproval: boolean;
  setAuditRetention: (value: AuditRetention) => void;
  setExportApproval: (value: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {
  auditRetention: "7y" as AuditRetention,
  exportApproval: true,
};

/**
 * Platform settings that have no slice in the demo store. They belong to this browser, like the
 * rest of the demo, and are read by the audit log (retention notice, export step).
 */
export const useAdminSettings = create<AdminSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setAuditRetention: (auditRetention) => set({ auditRetention }),
      setExportApproval: (exportApproval) => set({ exportApproval }),
      reset: () => set(DEFAULTS),
    }),
    { name: "sanket-admin-settings-v1" },
  ),
);
