"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { personaById } from "@/data/demo/people";
import { usePrefsStore } from "@/stores/prefs-store";

/**
 * Demo sign-in: become one of the seeded personas and land on that role's home screen.
 * In production this is replaced by a real authentication flow; nothing else depends on it.
 */
export function useSwitchPersona() {
  const router = useRouter();
  const setPersona = usePrefsStore((s) => s.setPersona);
  return useCallback(
    (personaId: string, href?: string) => {
      const persona = personaById(personaId);
      setPersona(persona.id);
      router.push(href ?? persona.home);
    },
    [router, setPersona],
  );
}
