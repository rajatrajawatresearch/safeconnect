"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { deployment } from "@/config/deployment";
import { districtById } from "@/data/demo/geo";
import { useSession } from "@/hooks/use-session";

export type CommandScope = "district" | "state";

/** The district whose incidents and units are live in the demonstration store. */
export const HOME_DISTRICT_ID = "d-ahd";

/** The chosen scope follows the commander from page to page for the length of the visit. */
const useScopeChoice = create<{
  choice: CommandScope | null;
  setChoice: (choice: CommandScope) => void;
}>((set) => ({ choice: null, setChoice: (choice) => set({ choice }) }));

export interface CommandScopeState {
  scope: CommandScope;
  setScope: (scope: CommandScope) => void;
  districtId: string;
  districtName: string;
  stateName: string;
  /** Name of whatever is in scope right now: the district or the state. */
  scopeName: string;
  options: { value: CommandScope; label: string }[];
}

/** District or state. State command starts on the state view; everyone else on their district. */
export function useCommandScope(): CommandScopeState {
  const { role, persona } = useSession();
  const choice = useScopeChoice((s) => s.choice);
  const setScope = useScopeChoice((s) => s.setChoice);
  const districtId = persona.districtId ?? HOME_DISTRICT_ID;
  const scope: CommandScope =
    choice ?? (role === "state_command" ? "state" : "district");

  return useMemo(() => {
    const districtName =
      districtById(districtId)?.name ?? deployment.primaryCity;
    const stateName = deployment.stateName;
    return {
      scope,
      setScope,
      districtId,
      districtName,
      stateName,
      scopeName: scope === "state" ? stateName : districtName,
      options: [
        { value: "district", label: `${districtName} (district)` },
        { value: "state", label: `${stateName} (state)` },
      ],
    };
  }, [scope, setScope, districtId]);
}
