"use client";

import { create, type StateCreator, type StoreApi, type UseBoundStore } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { buildDemoData, type DemoData } from "@/data/demo";
import { createPlatformState, emptyPlatformData, type DemoStore } from "@/domain/platform-store";
import { API_MODE } from "@/services/http/config";

export * from "@/domain/platform-store";

const MIN = 60_000;
/** A persisted demo older than this is discarded so "42 seconds ago" never reads as yesterday. */
const STALE_AFTER = 3 * 60 * MIN;

type Creator = StateCreator<DemoStore, [["zustand/immer", never]], [], DemoStore>;
const creator = (data: DemoData) => createPlatformState(data) as unknown as Creator;

/**
 * The browser's live cache of platform data.
 *
 * Stand-alone demo: seeded here, changed by the commands in `domain/platform-store`, and saved to
 * localStorage. With the API (`NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_API_PORT`): starts empty and is
 * filled and kept current by the server's snapshot and patch stream — commands go over HTTP instead.
 */
export const useDemoStore: UseBoundStore<StoreApi<DemoStore>> = API_MODE
  ? create<DemoStore>()(immer(creator(emptyPlatformData())))
  : create<DemoStore>()(
      persist(immer(creator(buildDemoData(Date.now()))), {
        name: "sanket-demo-v1",
        // Bump whenever the seed changes shape or content so browsers reseed instead of mixing data.
        version: 2,
        // A stale or older-version snapshot is dropped and the demo reseeds itself.
        migrate: () => buildDemoData(Date.now()) as unknown as DemoStore,
        merge: (persisted, current) => {
          const saved = persisted as Partial<DemoData> | undefined;
          if (!saved?.seededAt || Date.now() - saved.seededAt > STALE_AFTER) return current;
          return { ...current, ...saved };
        },
      }),
    );
