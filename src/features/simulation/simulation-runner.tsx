"use client";

import { useEffect } from "react";
import { createSimulator } from "@/domain/simulator";
import { API_MODE } from "@/services/http/config";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";

/**
 * Runs the event simulator for the stand-alone demo (see `domain/simulator` for what it does).
 * With the API, the server runs the one simulator for everybody and this component stays idle.
 */
const simulator = createSimulator({
  getState: () => useDemoStore.getState(),
  isOffline: () => usePrefsStore.getState().connectivity === "offline",
});

export function SimulationRunner() {
  const paused = usePrefsStore((s) => s.simulationPaused);
  const connectivity = usePrefsStore((s) => s.connectivity);

  // Anything raised while offline is delivered as soon as a connection exists again.
  useEffect(() => {
    if (API_MODE) return;
    if (connectivity !== "offline") useDemoStore.getState().syncQueued();
  }, [connectivity]);

  useEffect(() => {
    if (API_MODE || paused) return;
    simulator.start();
    const id = setInterval(() => simulator.tick(), 1000);
    return () => clearInterval(id);
  }, [paused]);

  return null;
}
