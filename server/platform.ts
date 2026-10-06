/**
 * The authoritative platform state.
 *
 * The same command implementations the browser demo uses (`src/domain/platform-store`) run here
 * against an in-memory store. Commands are executed one at a time; each one's effect is written to
 * PostgreSQL in a single transaction before anyone is told about it, and rolled back in memory if
 * the write fails.
 *
 * This is a single-node design, which is right for a pilot and simple to reason about. Scaling out
 * means moving the queue and fan-out to a shared log (see the README).
 */
import { createStore, type StateCreator, type StoreApi } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";
import { buildDemoData, type DemoData } from "@/data/demo";
import {
  createPlatformState,
  setAuditChain,
  type DemoStore,
} from "@/domain/platform-store";
import {
  chainHash,
  loadState,
  persist,
  pool,
  rechain,
  replaceAll,
  setMeta,
} from "./db";

type Creator = StateCreator<
  DemoStore,
  [["zustand/immer", never]],
  [],
  DemoStore
>;
type ChangeListener = (prev: DemoStore, next: DemoStore) => void;

setAuditChain(chainHash);

function seed(): DemoData {
  const data = buildDemoData(Date.now());
  return { ...data, audit: rechain(data.audit) };
}

export class Platform {
  private queue: Promise<unknown> = Promise.resolve();
  private changeListeners = new Set<ChangeListener>();
  private resetListeners = new Set<() => void>();
  private metaListeners = new Set<() => void>();
  simulationPaused = false;

  private constructor(readonly store: StoreApi<DemoStore>) {}

  /** Loads the state from PostgreSQL, seeding the demonstration dataset into an empty database. */
  static async boot(): Promise<{ platform: Platform; seeded: boolean }> {
    let loaded = await loadState();
    let seeded = false;
    if (!loaded) {
      const data = seed();
      await replaceAll(data);
      loaded = { data, simulationPaused: false };
      seeded = true;
    }
    const store = createStore<DemoStore>()(
      immer(createPlatformState(loaded.data) as unknown as Creator),
    );
    const platform = new Platform(store);
    platform.simulationPaused = loaded.simulationPaused;
    return { platform, seeded };
  }

  get state(): DemoStore {
    return this.store.getState();
  }

  /**
   * Runs a command, persists what it changed, then notifies subscribers.
   * Resolves with the command's result once the change is durable.
   */
  commit<T>(run: (state: DemoStore) => T): Promise<T> {
    const task = this.queue.then(async () => {
      const prev = this.store.getState();
      let result: T;
      try {
        result = run(prev);
      } catch (error) {
        this.store.setState(prev, true);
        throw error;
      }
      const next = this.store.getState();
      if (next !== prev) {
        try {
          await persist(prev, next);
        } catch (error) {
          this.store.setState(prev, true);
          throw error;
        }
        for (const listener of this.changeListeners) listener(prev, next);
      }
      return result;
    });
    this.queue = task.catch(() => undefined);
    return task;
  }

  /** Demo only: wipes the database back to the starting dataset. */
  reset(): Promise<void> {
    const task = this.queue.then(async () => {
      const data = seed();
      await replaceAll(data);
      this.store.setState(data as DemoStore);
      this.simulationPaused = false;
      for (const listener of this.resetListeners) listener();
    });
    this.queue = task.catch(() => undefined);
    return task;
  }

  async setSimulationPaused(paused: boolean) {
    this.simulationPaused = paused;
    await setMeta(pool, "simulation", { paused });
    for (const listener of this.metaListeners) listener();
  }

  onChange(listener: ChangeListener) {
    this.changeListeners.add(listener);
  }
  onReset(listener: () => void) {
    this.resetListeners.add(listener);
  }
  onMeta(listener: () => void) {
    this.metaListeners.add(listener);
  }
}
