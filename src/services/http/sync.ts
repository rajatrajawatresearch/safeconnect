"use client";

import { create } from "zustand";
import { deployment } from "@/config/deployment";
import {
  COLLECTIONS,
  applyStatePatch,
  type PlatformMeta,
  type StatePatch,
  type StateSnapshot,
} from "@/domain/collections";
import { emptyPlatformData } from "@/domain/platform-store";
import { citizenLocation, reducedName } from "@/domain/queries";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Citizen, Incident, Location } from "@/types";
import { http, isOffline } from "./client";
import { apiBaseUrl } from "./config";

/**
 * Keeps the browser's store in step with the server.
 *
 * On sign-in the server sends a snapshot of everything this role may see, then a patch after every
 * change. Commands never touch the store directly — they go to the API and come back as patches —
 * with one exception: an SOS raised with no connection, which waits in a local outbox.
 */

interface ApiStatus {
  /** Persona whose snapshot the store currently holds. */
  readyFor: string | null;
  connected: boolean;
  /** The server could not be reached at all (as opposed to a dropped stream). */
  unreachable: boolean;
  /** Incremented before each snapshot is applied, so listeners can tell a reload from a change. */
  snapshots: number;
}

export const useApiStatus = create<ApiStatus>(() => ({
  readyFor: null,
  connected: false,
  unreachable: false,
  snapshots: 0,
}));

/* ───────────────────────── Applying server data ───────────────────────── */

function currentCollections(): Record<string, unknown> {
  const state = useDemoStore.getState() as unknown as Record<string, unknown>;
  return Object.fromEntries(COLLECTIONS.map((c) => [c.name, state[c.name]]));
}

/** Merges records into the store. Also used for the entity a command returns, so the UI need not wait for the stream. */
export function applyPatch(patch: StatePatch) {
  const next = currentCollections();
  applyStatePatch(next, patch);
  useDemoStore.setState(next);
}

function applyMeta(meta: PlatformMeta) {
  const prefs = usePrefsStore.getState();
  if (prefs.simulationPaused !== meta.simulationPaused)
    prefs.setSimulationPaused(meta.simulationPaused);
}

function applySnapshot(personaId: string, snapshot: StateSnapshot) {
  useApiStatus.setState((s) => ({ snapshots: s.snapshots + 1 }));
  useDemoStore.setState(snapshot.state as never);
  restoreQueued(personaId);
  applyMeta(snapshot.meta);
  useApiStatus.setState({
    readyFor: personaId,
    connected: true,
    unreachable: false,
  });
}

/* ───────────────────────── Offline SOS outbox ───────────────────────── */

const OUTBOX_KEY = "sanket-outbox-v1";

export interface SosRequest {
  silent?: boolean;
  categoryId?: string;
  location?: Location;
  note?: string;
  notifyContacts?: boolean;
}

interface Queued {
  localId: string;
  personaId: string;
  request: SosRequest;
  placeholder: Incident;
}

function readOutbox(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]") as Queued[];
  } catch {
    return [];
  }
}

function writeOutbox(items: Queued[]) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  } catch {
    // Without storage the request still shows as queued for this page view.
  }
}

/** Holds an SOS on the device until a connection exists, and shows it to the citizen as queued. */
export function queueSos(citizen: Citizen, request: SosRequest): Incident {
  const now = Date.now();
  const localId = `LOCAL-${now.toString(36)}`;
  const placeholder: Incident = {
    id: localId,
    source: request.silent ? "silent_sos" : "sos",
    categoryId: request.categoryId ?? "personal_danger",
    priority: "P1",
    status: "new",
    title: "Emergency",
    description: request.note ?? "SOS raised from the citizen app.",
    location: request.location ?? citizenLocation(citizen),
    citizenId: citizen.id,
    reporterName: reducedName(citizen.name),
    reporterPhoneMasked: citizen.phoneMasked,
    anonymous: false,
    peopleInDanger: true,
    createdAt: now,
    assignments: [],
    backupRequested: false,
    escalationLevel: 0,
    timeline: [
      {
        id: `${localId}-t1`,
        at: now,
        kind: "created",
        title: "SOS created",
        detail: "Waiting for a connection",
        citizenVisible: true,
      },
    ],
    notes: [],
    evidenceIds: [],
    handoff: { reportStatus: "not_started" },
    sync: "queued",
    silent: request.silent,
  };
  writeOutbox([
    ...readOutbox(),
    { localId, personaId: citizen.id, request, placeholder },
  ]);
  applyPatch({ upsert: { incidents: [placeholder] } });
  return placeholder;
}

export function discardQueued(localId: string): boolean {
  const items = readOutbox();
  if (!items.some((q) => q.localId === localId)) return false;
  writeOutbox(items.filter((q) => q.localId !== localId));
  applyPatch({ remove: { incidents: [localId] } });
  return true;
}

/** Puts anything still waiting in the outbox back on screen (after a reload with no connection). */
export function restoreQueued(personaId: string) {
  const mine = readOutbox().filter((q) => q.personaId === personaId);
  if (mine.length)
    applyPatch({ upsert: { incidents: mine.map((q) => q.placeholder) } });
}

let flushing = false;
/** Sends anything that was queued while offline. Safe to call often. */
export async function flushOutbox(personaId: string) {
  if (flushing) return;
  flushing = true;
  try {
    for (const item of readOutbox().filter((q) => q.personaId === personaId)) {
      try {
        const incident = await http<Incident>("POST", "/sos", item.request);
        writeOutbox(readOutbox().filter((q) => q.localId !== item.localId));
        applyPatch({
          remove: { incidents: [item.localId] },
          upsert: { incidents: [incident] },
        });
      } catch (error) {
        if (isOffline(error)) return;
        // The server refused it; keeping it would retry forever.
        writeOutbox(readOutbox().filter((q) => q.localId !== item.localId));
        applyPatch({ remove: { incidents: [item.localId] } });
      }
    }
  } finally {
    flushing = false;
  }
}

/* ───────────────────────── Stream ───────────────────────── */

/**
 * Opens the live stream for a persona and keeps it open, reconnecting as needed.
 * Returns a function that closes it.
 */
export function connect(personaId: string): () => void {
  let closed = false;
  let source: EventSource | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;

  if (useApiStatus.getState().readyFor !== personaId) {
    // Never show one persona the previous persona's data while the new snapshot is on its way.
    useApiStatus.setState((s) => ({
      readyFor: null,
      connected: false,
      snapshots: s.snapshots + 1,
    }));
    useDemoStore.setState(emptyPlatformData());
    restoreQueued(personaId);
  }

  const open = async () => {
    try {
      const { ticket } = await http<{ ticket: string }>(
        "POST",
        "/realtime/ticket",
      );
      if (closed) return;
      source = new EventSource(
        `${apiBaseUrl()}/realtime/stream?ticket=${ticket}`,
      );
      source.addEventListener("snapshot", (event) => {
        applySnapshot(
          personaId,
          JSON.parse((event as MessageEvent<string>).data) as StateSnapshot,
        );
        void flushOutbox(personaId);
      });
      source.addEventListener("patch", (event) =>
        applyPatch(
          JSON.parse((event as MessageEvent<string>).data) as StatePatch,
        ),
      );
      source.addEventListener("meta", (event) =>
        applyMeta(
          JSON.parse((event as MessageEvent<string>).data) as PlatformMeta,
        ),
      );
      source.onerror = () => {
        source?.close();
        source = null;
        if (closed) return;
        useApiStatus.setState({ connected: false });
        retry = setTimeout(open, 2000);
      };
    } catch (error) {
      if (closed) return;
      useApiStatus.setState({
        connected: false,
        unreachable: isOffline(error),
      });
      retry = setTimeout(open, 2500);
    }
  };
  void open();

  return () => {
    closed = true;
    source?.close();
    clearTimeout(retry);
    useApiStatus.setState({ connected: false });
  };
}

export const API_NAME = `${deployment.productName} server`;
