/**
 * The collections that make up platform state, and how each is keyed and ordered.
 * Shared by the API server (what to persist and stream) and the browser (how to apply a patch).
 */
import type { DemoData } from "@/data/demo";

export type CollectionName =
  | "incidents"
  | "units"
  | "messages"
  | "evidence"
  | "complaints"
  | "journeys"
  | "contacts"
  | "sessions"
  | "notifications"
  | "escalations"
  | "audit"
  | "roles"
  | "staff"
  | "categories"
  | "escalationRules"
  | "slaPolicies"
  | "integrations"
  | "templates";

type Row = Record<string, unknown>;
const num = (row: Row, field: string) => Number(row[field] ?? 0);

export interface CollectionSpec {
  name: CollectionName;
  /** Field that identifies a record. */
  key: string;
  /**
   * `sorted`: order is derived from the data (newest first, and so on), so single records can be
   * streamed and re-sorted on arrival. `listed`: order is the list's own (configuration shown in a
   * set order), so a change streams the whole list.
   */
  order: "sorted" | "listed";
  compare?: (a: Row, b: Row) => number;
}

export const COLLECTIONS: CollectionSpec[] = [
  {
    name: "incidents",
    key: "id",
    order: "sorted",
    compare: (a, b) => num(b, "createdAt") - num(a, "createdAt"),
  },
  {
    name: "units",
    key: "id",
    order: "sorted",
    compare: (a, b) => String(a.callSign).localeCompare(String(b.callSign)),
  },
  {
    name: "messages",
    key: "id",
    order: "sorted",
    compare: (a, b) => num(a, "at") - num(b, "at"),
  },
  {
    name: "evidence",
    key: "id",
    order: "sorted",
    compare: (a, b) => num(b, "submittedAt") - num(a, "submittedAt"),
  },
  {
    name: "complaints",
    key: "id",
    order: "sorted",
    compare: (a, b) => num(b, "submittedAt") - num(a, "submittedAt"),
  },
  {
    name: "journeys",
    key: "id",
    order: "sorted",
    compare: (a, b) => num(b, "startedAt") - num(a, "startedAt"),
  },
  { name: "contacts", key: "id", order: "listed" },
  {
    name: "sessions",
    key: "id",
    order: "sorted",
    compare: (a, b) => num(b, "startedAt") - num(a, "startedAt"),
  },
  {
    name: "notifications",
    key: "id",
    order: "sorted",
    compare: (a, b) => num(b, "at") - num(a, "at"),
  },
  {
    name: "escalations",
    key: "id",
    order: "sorted",
    compare: (a, b) => num(b, "raisedAt") - num(a, "raisedAt"),
  },
  {
    name: "audit",
    key: "id",
    order: "sorted",
    compare: (a, b) => num(b, "at") - num(a, "at"),
  },
  { name: "roles", key: "key", order: "listed" },
  { name: "staff", key: "id", order: "listed" },
  { name: "categories", key: "id", order: "listed" },
  { name: "escalationRules", key: "id", order: "listed" },
  { name: "slaPolicies", key: "priority", order: "listed" },
  { name: "integrations", key: "id", order: "listed" },
  { name: "templates", key: "id", order: "listed" },
];

export const COLLECTION_BY_NAME = Object.fromEntries(
  COLLECTIONS.map((c) => [c.name, c]),
) as Record<CollectionName, CollectionSpec>;

/** The data fields of platform state: every collection plus the counters. */
export type PlatformData = DemoData;

/** What the server streams after a change. Collections that did not change are absent. */
export interface StatePatch {
  /** Whole-list replacement, used for `listed` collections. */
  replace?: Partial<Record<CollectionName, unknown[]>>;
  /** Records to insert or overwrite, used for `sorted` collections. */
  upsert?: Partial<Record<CollectionName, unknown[]>>;
  /** Keys of records the viewer no longer has (deleted, or no longer visible to them). */
  remove?: Partial<Record<CollectionName, string[]>>;
}

export interface StateSnapshot {
  state: Record<CollectionName, unknown[]>;
  meta: PlatformMeta;
}

export interface PlatformMeta {
  simulationPaused: boolean;
  demoMode: boolean;
  serverTime: number;
}

/** Applies a patch to a mutable copy of the collections (an immer draft in the browser). */
export function applyStatePatch(
  target: Record<string, unknown>,
  patch: StatePatch,
) {
  for (const spec of COLLECTIONS) {
    const replace = patch.replace?.[spec.name];
    if (replace) target[spec.name] = replace;

    const upsert = patch.upsert?.[spec.name] as Row[] | undefined;
    const remove = patch.remove?.[spec.name];
    if (!upsert?.length && !remove?.length) continue;

    let list = (target[spec.name] as Row[]) ?? [];
    if (remove?.length) {
      const gone = new Set(remove);
      list = list.filter((row) => !gone.has(String(row[spec.key])));
    }
    if (upsert?.length) {
      const incoming = new Map(
        upsert.map((row) => [String(row[spec.key]), row]),
      );
      list = list.map((row) => incoming.get(String(row[spec.key])) ?? row);
      const present = new Set(list.map((row) => String(row[spec.key])));
      for (const [key, row] of incoming) if (!present.has(key)) list.push(row);
      if (spec.compare) list = [...list].sort(spec.compare);
    }
    target[spec.name] = list;
  }
}
