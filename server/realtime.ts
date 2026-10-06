/**
 * Live updates over Server-Sent Events.
 *
 * A client first exchanges its bearer token for a short-lived, single-use ticket, then opens the
 * stream with it (EventSource cannot send headers, and tokens do not belong in URLs). On connect it
 * receives a snapshot of everything its role may see; afterwards only what changed for that viewer.
 */
import { randomBytes } from "node:crypto";
import type { ServerResponse } from "node:http";
import type { DemoData } from "@/data/demo";
import {
  COLLECTIONS,
  type CollectionName,
  type PlatformMeta,
  type StatePatch,
  type StateSnapshot,
} from "@/domain/collections";
import { redact, visible, type Session } from "./access";
import { config } from "./config";
import type { Platform } from "./platform";

interface Connection {
  id: number;
  session: Session;
  res: ServerResponse;
  /** What this viewer currently holds, by collection: key → the live record it was built from. */
  sent: Map<CollectionName, Map<string, unknown>>;
  /** For ordered lists, the exact sequence last sent. */
  lists: Map<CollectionName, unknown[]>;
  heartbeat: NodeJS.Timeout;
}

const TICKET_TTL_MS = 30_000;

export class RealtimeHub {
  private tickets = new Map<string, { session: Session; expires: number }>();
  private connections = new Map<number, Connection>();
  private nextId = 1;

  constructor(private readonly platform: Platform) {
    platform.onChange((prev, next) => this.publish(prev, next));
    platform.onReset(() => this.resnapshotAll());
    platform.onMeta(() => this.broadcast("meta", this.meta()));
  }

  get connectionCount() {
    return this.connections.size;
  }

  meta(): PlatformMeta {
    return {
      simulationPaused: this.platform.simulationPaused,
      demoMode: config.demoMode,
      serverTime: Date.now(),
    };
  }

  issueTicket(session: Session): string {
    const now = Date.now();
    for (const [key, value] of this.tickets)
      if (value.expires < now) this.tickets.delete(key);
    const ticket = randomBytes(24).toString("hex");
    this.tickets.set(ticket, { session, expires: now + TICKET_TTL_MS });
    return ticket;
  }

  /** Redeems a ticket. Each one works once. */
  redeem(ticket: string | undefined): Session | undefined {
    if (!ticket) return undefined;
    const entry = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    return entry && entry.expires >= Date.now() ? entry.session : undefined;
  }

  attach(session: Session, res: ServerResponse, origin: string | undefined) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...(origin
        ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
        : {}),
    });
    const connection: Connection = {
      id: this.nextId++,
      session,
      res,
      sent: new Map(),
      lists: new Map(),
      heartbeat: setInterval(() => res.write(": keep-alive\n\n"), 20_000),
    };
    this.connections.set(connection.id, connection);
    res.on("close", () => {
      clearInterval(connection.heartbeat);
      this.connections.delete(connection.id);
    });
    res.write("retry: 2000\n\n");
    this.sendSnapshot(connection);
  }

  private write(connection: Connection, event: string, data: unknown) {
    connection.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  private broadcast(event: string, data: unknown) {
    for (const connection of this.connections.values())
      this.write(connection, event, data);
  }

  private sendSnapshot(connection: Connection) {
    const state = this.platform.state as DemoData;
    const refs = visible(state, connection.session);
    const out = {} as StateSnapshot["state"];
    connection.sent.clear();
    connection.lists.clear();
    for (const c of COLLECTIONS) {
      const list = refs[c.name];
      out[c.name] = list.map((e) =>
        redact(state, connection.session, c.name, e),
      );
      if (c.order === "listed") connection.lists.set(c.name, list);
      else
        connection.sent.set(
          c.name,
          new Map(
            list.map((e) => [String((e as Record<string, unknown>)[c.key]), e]),
          ),
        );
    }
    this.write(connection, "snapshot", {
      state: out,
      meta: this.meta(),
    } satisfies StateSnapshot);
  }

  private resnapshotAll() {
    for (const connection of this.connections.values())
      this.sendSnapshot(connection);
  }

  /** Works out, per viewer, what changed in what they are entitled to see, and sends only that. */
  private publish(prev: DemoData, next: DemoData) {
    // Permissions decide both visibility and redaction, so a role change resends everything.
    if (prev.roles !== next.roles) {
      this.resnapshotAll();
      return;
    }
    for (const connection of this.connections.values()) {
      const refs = visible(next, connection.session);
      const patch: StatePatch = {};

      for (const c of COLLECTIONS) {
        const list = refs[c.name];

        if (c.order === "listed") {
          const last = connection.lists.get(c.name) ?? [];
          if (
            last.length === list.length &&
            last.every((e, i) => e === list[i])
          )
            continue;
          connection.lists.set(c.name, list);
          (patch.replace ??= {})[c.name] = list.map((e) =>
            redact(next, connection.session, c.name, e),
          );
          continue;
        }

        const sent = connection.sent.get(c.name) ?? new Map<string, unknown>();
        const current = new Map<string, unknown>();
        const upserts: unknown[] = [];
        for (const e of list) {
          const key = String((e as Record<string, unknown>)[c.key]);
          current.set(key, e);
          if (sent.get(key) !== e)
            upserts.push(redact(next, connection.session, c.name, e));
        }
        const removed = [...sent.keys()].filter((key) => !current.has(key));
        connection.sent.set(c.name, current);
        if (upserts.length) (patch.upsert ??= {})[c.name] = upserts;
        if (removed.length) (patch.remove ??= {})[c.name] = removed;
      }

      if (patch.replace || patch.upsert || patch.remove)
        this.write(connection, "patch", patch);
    }
  }

  close() {
    for (const connection of this.connections.values()) {
      clearInterval(connection.heartbeat);
      connection.res.end();
    }
    this.connections.clear();
  }
}
