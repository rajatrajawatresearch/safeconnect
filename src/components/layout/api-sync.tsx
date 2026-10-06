"use client";

import { useEffect } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { API_MODE } from "@/services/http/config";
import { connect, flushOutbox, restoreQueued } from "@/services/http/sync";
import { usePrefsStore } from "@/stores/prefs-store";

/**
 * Holds the live connection to the API for whoever is signed in. Switching persona in the demo
 * signs in again and swaps the stream; setting the demo connection to "offline" drops it.
 * Renders nothing, and does nothing at all in the stand-alone demo.
 */
export function ApiSync() {
  const mounted = useMounted();
  const personaId = usePrefsStore((s) => s.personaId);
  const offline = usePrefsStore((s) => s.connectivity === "offline");

  useEffect(() => {
    if (!API_MODE || !mounted) return;
    if (offline) {
      // No connection: there is nothing to load, but an SOS waiting to be sent must stay visible.
      restoreQueued(personaId);
      return;
    }
    const disconnect = connect(personaId);
    // Anything raised while the phone itself had no signal goes out when the browser reports it is back.
    const onOnline = () => void flushOutbox(personaId);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      disconnect();
    };
  }, [mounted, personaId, offline]);

  return null;
}
