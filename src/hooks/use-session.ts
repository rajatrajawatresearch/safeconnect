"use client";

import { useMemo } from "react";
import { CITIZENS, personaById } from "@/data/demo/people";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import type { ActorRef, Citizen, Permission, Persona, RoleKey } from "@/types";

export interface Session {
  persona: Persona;
  /** Pass this to every service command so the audit trail records who acted. */
  actor: ActorRef;
  role: RoleKey;
  /** Present only when the persona is a citizen. */
  citizen?: Citizen;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
}

/** Who is using the app right now (the persona chosen in the demo role switcher) and what they may do. */
export function useSession(): Session {
  const personaId = usePrefsStore((s) => s.personaId);
  const roles = useDemoStore((s) => s.roles);
  return useMemo(() => {
    const persona = personaById(personaId);
    const permissions =
      roles.find((r) => r.key === persona.role)?.permissions ?? [];
    return {
      persona,
      actor: { id: persona.id, name: persona.name, role: persona.role },
      role: persona.role,
      citizen: CITIZENS.find((c) => c.id === persona.id),
      permissions,
      can: (permission: Permission) => permissions.includes(permission),
    };
  }, [personaId, roles]);
}
