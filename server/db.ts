/**
 * PostgreSQL access: connection pool, migrations, loading the platform state at start-up and
 * writing each change through.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type { DemoData } from "@/data/demo";
import { COLLECTIONS, type CollectionName } from "@/domain/collections";
import { emptyPlatformData } from "@/domain/platform-store";
import type { AuditEvent } from "@/types";
import { config } from "./config";

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

type Row = Record<string, unknown>;
type Queryable = Pick<pg.PoolClient, "query">;

const at = (ms: unknown) =>
  typeof ms === "number" && ms > 0 ? new Date(ms) : null;

/** Creates the database if it is missing. Needs a role allowed to create databases (the local superuser is). */
export async function ensureDatabase(): Promise<boolean> {
  const url = new URL(config.databaseUrl);
  const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!/^[a-zA-Z0-9_]+$/.test(name))
    throw new Error(`Refusing to create a database named "${name}".`);
  url.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    const found = await admin.query(
      "select 1 from pg_database where datname = $1",
      [name],
    );
    if (found.rowCount) return false;
    await admin.query(`create database "${name}"`);
    return true;
  } finally {
    await admin.end();
  }
}

export async function migrate(): Promise<string[]> {
  // Beside this file when run from source; one level up when run from the bundled build.
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = [join(here, "migrations"), join(here, "..", "migrations")].find((candidate) => existsSync(candidate));
  if (!dir) throw new Error("Cannot find the migrations folder.");
  await pool.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const done = new Set(
    (await pool.query("select name from schema_migrations")).rows.map(
      (r) => r.name as string,
    ),
  );
  const applied: string[] = [];
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (done.has(file)) continue;
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(readFileSync(join(dir, file), "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [
        file,
      ]);
      await client.query("commit");
      applied.push(file);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
  return applied;
}

/* ───────────────────────── Table mapping ───────────────────────── */

interface TableSpec {
  table: string;
  /** Real columns kept beside the JSON document, for indexing and reporting. */
  columns: Record<string, (e: Row) => unknown>;
  orderBy: string;
  limit?: number;
  /** Rows are never deleted when they age out of the in-memory window. */
  retain?: boolean;
}

const loc = (e: Row) => e.location as Row;

const TABLES: Record<Exclude<CollectionName, "audit">, TableSpec> = {
  incidents: {
    table: "incidents",
    orderBy: "created_at desc",
    columns: {
      status: (e) => e.status,
      priority: (e) => e.priority,
      category_id: (e) => e.categoryId,
      source: (e) => e.source,
      station_id: (e) => loc(e).stationId,
      district_id: (e) => loc(e).districtId,
      citizen_id: (e) => e.citizenId ?? null,
      lat: (e) => loc(e).lat,
      lng: (e) => loc(e).lng,
      created_at: (e) => at(e.createdAt),
      resolved_at: (e) => at(e.resolvedAt),
    },
  },
  units: {
    table: "units",
    orderBy: "call_sign asc",
    columns: {
      call_sign: (e) => e.callSign,
      station_id: (e) => e.stationId,
      status: (e) => e.status,
      current_incident_id: (e) => e.currentIncidentId ?? null,
    },
  },
  messages: {
    table: "messages",
    orderBy: "sent_at asc, id asc",
    columns: {
      incident_id: (e) => e.incidentId,
      channel: (e) => e.channel,
      sender_role: (e) => e.senderRole,
      sent_at: (e) => at(e.at),
    },
  },
  evidence: {
    table: "evidence",
    orderBy: "submitted_at desc",
    columns: {
      incident_id: (e) => e.incidentId,
      type: (e) => e.type,
      classification: (e) => e.classification,
      integrity: (e) => e.integrity,
      source: (e) => e.source,
      hash: (e) => e.hash,
      submitted_at: (e) => at(e.submittedAt),
    },
  },
  complaints: {
    table: "complaints",
    orderBy: "submitted_at desc",
    columns: {
      citizen_id: (e) => e.citizenId ?? null,
      station_id: (e) => e.stationId,
      status: (e) => e.status,
      kind: (e) => e.kind,
      submitted_at: (e) => at(e.submittedAt),
    },
  },
  journeys: {
    table: "journeys",
    orderBy: "started_at desc",
    columns: {
      citizen_id: (e) => e.citizenId,
      status: (e) => e.status,
      started_at: (e) => at(e.startedAt),
    },
  },
  contacts: {
    table: "emergency_contacts",
    orderBy: "ord asc",
    columns: { citizen_id: (e) => e.citizenId },
  },
  sessions: {
    table: "communication_sessions",
    orderBy: "started_at desc",
    columns: {
      incident_id: (e) => e.incidentId,
      type: (e) => e.type,
      status: (e) => e.status,
      started_at: (e) => at(e.startedAt),
    },
  },
  notifications: {
    table: "notifications",
    orderBy: "created_at desc",
    limit: 200,
    retain: true,
    columns: {
      kind: (e) => e.kind,
      tone: (e) => e.tone,
      citizen_id: (e) => e.citizenId ?? null,
      unit_id: (e) => e.unitId ?? null,
      incident_id: (e) => e.incidentId ?? null,
      created_at: (e) => at(e.at),
    },
  },
  escalations: {
    table: "escalations",
    orderBy: "raised_at desc",
    columns: {
      incident_id: (e) => e.incidentId,
      level: (e) => e.level,
      status: (e) => e.status,
      raised_at: (e) => at(e.raisedAt),
    },
  },
  roles: { table: "roles", orderBy: "ord asc", columns: {} },
  staff: {
    table: "staff_users",
    orderBy: "ord asc",
    columns: { role: (e) => e.role, status: (e) => e.status },
  },
  categories: {
    table: "incident_categories",
    orderBy: "ord asc",
    columns: { grp: (e) => e.group, enabled: (e) => e.enabled },
  },
  escalationRules: {
    table: "escalation_rules",
    orderBy: "ord asc",
    columns: { priority: (e) => e.priority, enabled: (e) => e.enabled },
  },
  slaPolicies: { table: "sla_policies", orderBy: "ord asc", columns: {} },
  integrations: {
    table: "integrations",
    orderBy: "ord asc",
    columns: { status: (e) => e.status },
  },
  templates: {
    table: "notification_templates",
    orderBy: "ord asc",
    columns: {},
  },
};

const ALL_TABLES = [
  ...Object.values(TABLES).map((t) => t.table),
  "audit_events",
  "platform_meta",
];
const AUDIT_WINDOW = 600;

/* ───────────────────────── Audit chain ───────────────────────── */

/** SHA-256 over the previous link and the entry's content: change or remove any row and every later link breaks. */
export function chainHash(
  previous: string,
  e: Omit<AuditEvent, "chainHash">,
): string {
  const content = JSON.stringify([
    e.id,
    e.at,
    e.actorName,
    e.actorRole,
    e.action,
    e.category,
    e.incidentId ?? "",
    e.entityId ?? "",
    e.detail,
  ]);
  return createHash("sha256").update(`${previous}|${content}`).digest("hex");
}

/** Recomputes the chain for a newest-first list (used for seed data, which arrives with placeholder values). */
export function rechain(newestFirst: AuditEvent[]): AuditEvent[] {
  let previous = "genesis";
  const out: AuditEvent[] = [];
  for (const event of [...newestFirst].reverse()) {
    const rest = { ...event } as Partial<AuditEvent>;
    delete rest.chainHash;
    previous = chainHash(previous, rest as Omit<AuditEvent, "chainHash">);
    out.push({ ...event, chainHash: previous });
  }
  return out.reverse();
}

const toAudit = (r: Row): AuditEvent => ({
  id: r.id as string,
  at: (r.at as Date).getTime(),
  actorName: r.actor_name as string,
  actorRole: r.actor_role as AuditEvent["actorRole"],
  action: r.action as string,
  category: r.category as AuditEvent["category"],
  incidentId: (r.incident_id as string | null) ?? undefined,
  entityId: (r.entity_id as string | null) ?? undefined,
  detail: r.detail as string,
  chainHash: r.chain_hash as string,
});

/** Walks the whole audit table in order and reports the first row whose chain value does not match. */
export async function verifyAuditChain(): Promise<{
  intact: boolean;
  checked: number;
  brokenAt?: string;
}> {
  const { rows } = await pool.query(
    "select * from audit_events order by seq asc",
  );
  let previous = "genesis";
  for (const row of rows) {
    const event = toAudit(row);
    const rest = { ...event } as Partial<AuditEvent>;
    delete rest.chainHash;
    previous = chainHash(previous, rest as Omit<AuditEvent, "chainHash">);
    if (previous !== event.chainHash)
      return { intact: false, checked: rows.length, brokenAt: event.id };
  }
  return { intact: true, checked: rows.length };
}

export interface AuditFilter {
  actor?: string;
  role?: string;
  incidentId?: string;
  category?: string;
  categories?: string[];
  search?: string;
  since?: number;
  limit?: number;
}

/** The audit log is queried straight from PostgreSQL, so it covers the full history, not the in-memory window. */
export async function queryAudit(f: AuditFilter): Promise<AuditEvent[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    args.push(value);
    where.push(sql.replace("?", `$${args.length}`));
  };
  if (f.actor) add("actor_name = ?", f.actor);
  if (f.role && f.role !== "all") add("actor_role = ?", f.role);
  if (f.incidentId) add("incident_id = ?", f.incidentId);
  if (f.category && f.category !== "all") add("category = ?", f.category);
  if (f.categories?.length) add("category = any(?)", f.categories);
  if (f.since) add("at >= ?", new Date(f.since));
  if (f.search?.trim()) {
    args.push(`%${f.search.trim().toLowerCase()}%`);
    const p = `$${args.length}`;
    where.push(
      `(lower(action) like ${p} or lower(detail) like ${p} or lower(actor_name) like ${p} or lower(coalesce(incident_id, '')) like ${p})`,
    );
  }
  args.push(Math.min(f.limit ?? 1000, 5000));
  const sql = `select * from audit_events ${where.length ? `where ${where.join(" and ")}` : ""} order by at desc, seq desc limit $${args.length}`;
  return (await pool.query(sql, args)).rows.map(toAudit);
}

/* ───────────────────────── Load ───────────────────────── */

export async function loadState(): Promise<{
  data: DemoData;
  simulationPaused: boolean;
} | null> {
  const meta = new Map(
    (await pool.query("select key, value from platform_meta")).rows.map((r) => [
      r.key as string,
      r.value,
    ]),
  );
  const counters = meta.get("counters") as
    | {
        seededAt: number;
        nextIncidentSeq: number;
        nextEvidenceSeq: number;
        nextComplaintSeq: number;
      }
    | undefined;
  if (!counters) return null;

  const data = emptyPlatformData();
  Object.assign(data, counters);
  const bag = data as unknown as Record<string, unknown[]>;
  for (const [name, spec] of Object.entries(TABLES)) {
    const { rows } = await pool.query(
      `select doc from ${spec.table} order by ${spec.orderBy}${spec.limit ? ` limit ${spec.limit}` : ""}`,
    );
    bag[name] = rows.map((r) => r.doc);
  }
  const audit = await pool.query(
    `select * from audit_events order by at desc, seq desc limit ${AUDIT_WINDOW}`,
  );
  data.audit = audit.rows.map(toAudit);
  const simulation = meta.get("simulation") as { paused?: boolean } | undefined;
  return { data, simulationPaused: Boolean(simulation?.paused) };
}

/* ───────────────────────── Write-through ───────────────────────── */

async function upsert(
  db: Queryable,
  spec: TableSpec,
  key: string,
  entity: Row,
  ord?: number,
) {
  const names = Object.keys(spec.columns);
  const cols = ["id", ...names, ...(ord === undefined ? [] : ["ord"]), "doc"];
  const values = [
    String(entity[key]),
    ...names.map((n) => spec.columns[n](entity)),
    ...(ord === undefined ? [] : [ord]),
    JSON.stringify(entity),
  ];
  const updates = cols
    .slice(1)
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  await db.query(
    `insert into ${spec.table} (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})
     on conflict (id) do update set ${updates}, updated_at = now()`,
    values,
  );
}

async function writeDiff(db: Queryable, prev: DemoData, next: DemoData) {
  const before = prev as unknown as Record<string, Row[]>;
  const after = next as unknown as Record<string, Row[]>;

  for (const collection of COLLECTIONS) {
    const a = before[collection.name];
    const b = after[collection.name];
    if (a === b) continue;

    if (collection.name === "audit") {
      const known = new Set(a.map((e) => e.id));
      // Newest entries are at the front; insert oldest first so `seq` follows the chain.
      for (const e of b.filter((x) => !known.has(x.id)).reverse()) {
        await db.query(
          `insert into audit_events (id, at, actor_name, actor_role, action, category, incident_id, entity_id, detail, chain_hash)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) on conflict (id) do nothing`,
          [
            e.id,
            at(e.at),
            e.actorName,
            e.actorRole,
            e.action,
            e.category,
            e.incidentId ?? null,
            e.entityId ?? null,
            e.detail,
            e.chainHash,
          ],
        );
      }
      continue;
    }

    const spec = TABLES[collection.name];
    const key = collection.key;
    if (collection.order === "listed") {
      // Small configuration lists: rewrite positions so the stored order matches what consoles show.
      for (let i = 0; i < b.length; i += 1)
        await upsert(db, spec, key, b[i], i);
    } else {
      const previous = new Map(a.map((e) => [String(e[key]), e]));
      for (const e of b)
        if (previous.get(String(e[key])) !== e) await upsert(db, spec, key, e);
    }
    if (!spec.retain) {
      const kept = new Set(b.map((e) => String(e[key])));
      const gone = a.map((e) => String(e[key])).filter((id) => !kept.has(id));
      if (gone.length)
        await db.query(`delete from ${spec.table} where id = any($1)`, [gone]);
    }
  }

  if (
    prev.seededAt !== next.seededAt ||
    prev.nextIncidentSeq !== next.nextIncidentSeq ||
    prev.nextEvidenceSeq !== next.nextEvidenceSeq ||
    prev.nextComplaintSeq !== next.nextComplaintSeq
  ) {
    await setMeta(db, "counters", {
      seededAt: next.seededAt,
      nextIncidentSeq: next.nextIncidentSeq,
      nextEvidenceSeq: next.nextEvidenceSeq,
      nextComplaintSeq: next.nextComplaintSeq,
    });
  }
}

export async function setMeta(db: Queryable, key: string, value: unknown) {
  await db.query(
    "insert into platform_meta (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value, updated_at = now()",
    [key, JSON.stringify(value)],
  );
}

/** Writes the difference between two states in one transaction. */
export async function persist(prev: DemoData, next: DemoData) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await writeDiff(client, prev, next);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Empties every table and writes a fresh dataset. Demo reset and first-run seeding. */
export async function replaceAll(data: DemoData) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`truncate ${ALL_TABLES.join(", ")} restart identity`);
    await writeDiff(client, emptyPlatformData(), data);
    await setMeta(client, "simulation", { paused: false });
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function tableCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const table of ALL_TABLES)
    out[table] = Number(
      (await pool.query(`select count(*)::int as n from ${table}`)).rows[0].n,
    );
  return out;
}
