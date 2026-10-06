# Backend

The API server in `server/`: Node.js 20, TypeScript, Fastify 5, PostgreSQL 16.

- [Running it](#running-it)
- [Configuration](#configuration)
- [How it works](#how-it-works)
- [Access control](#access-control)
- [Live updates](#live-updates)
- [Audit trail](#audit-trail)
- [Database](#database)
- [API reference](#api-reference)
- [Testing](#testing)
- [What a production deployment still needs](#what-a-production-deployment-still-needs)

## Running it

PostgreSQL must be running locally. With Homebrew: `brew install postgresql@16 && brew services start postgresql@16`.

```bash
npm run db:setup     # creates the "sanket" database, applies migrations, seeds it if empty
npm run dev:full     # API on :4000 and the web app on :3000, connected to each other
```

Other commands:

| Command             | What it does                                                                           |
| ------------------- | -------------------------------------------------------------------------------------- |
| `npm run api:dev`   | API only, restarting on change                                                         |
| `npm run api:start` | API only, no watcher                                                                   |
| `npm run api:build` | Bundles the API to `server/dist/main.mjs` (run with `node server/dist/main.mjs`)       |
| `npm run db:status` | Row counts and an audit-chain check                                                    |
| `npm run db:reset`  | Wipes back to the starting dataset. Stop the API first, or use "Reset demo" in the app |
| `npm run test:api`  | End-to-end API test against a running server (resets demo data)                        |

Run **one** API process per database. The server keeps the authoritative state in memory and
writes through to PostgreSQL; two processes on one database would overwrite each other.

## Configuration

Environment variables, all optional in development:

| Variable                | Default                                      | Purpose                                                                              |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | `postgres://<os user>@localhost:5432/sanket` | PostgreSQL connection                                                                |
| `API_PORT` / `API_HOST` | `4000` / `0.0.0.0`                           | Where the API listens                                                                |
| `JWT_SECRET`            | a development-only value                     | Token signing key. **Required** when `NODE_ENV=production`                           |
| `TOKEN_TTL_SECONDS`     | `28800` (8 h)                                | Session length                                                                       |
| `DEMO_MODE`             | on                                           | Persona sign-in, simulator and presenter controls. Set `false` to turn all three off |
| `CORS_ORIGINS`          | any origin                                   | Comma-separated list of allowed web origins                                          |
| `LOG_LEVEL`             | `warn`                                       | Fastify/pino log level                                                               |

The web app finds the API through one of:

| Variable                        | Meaning                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_PORT=4000`     | API is on the same host as the page, on this port. Used by `dev:full`; lets a phone on the LAN work with no extra setup |
| `NEXT_PUBLIC_API_URL=https://…` | API at a full URL                                                                                                       |
| neither                         | The app runs as the stand-alone browser demo and never calls a server                                                   |

These two are read when the web app is built. For a production build that uses the API, set one of
them for `npm run build` as well, for example `NEXT_PUBLIC_API_URL=https://api.example.gov.in npm run build`.

## How it works

```
 browser ──HTTP command──▶ routes.ts ── verify token, validate body
                              │
                              ▼
                        platform.commit()         one command at a time
                              │  1. run the command (src/domain/platform-store)
                              │  2. write the difference to PostgreSQL in one transaction
                              │  3. on failure: roll the in-memory state back
                              ▼
                        realtime.ts ── per viewer: what changed that this role may see
                              │
 browser ◀──SSE patch─────────┘
```

**One implementation of the rules.** Every command (`createIncident`, `assignUnit`,
`respondToAssignment`, `resolveIncident`, …) is written once, in `src/domain/platform-store.ts`.
The browser demo runs it against a local store; the server runs the same code against its
authoritative store. The two cannot drift.

**Write-through persistence.** After a command runs, the server diffs the state before and after
(by object identity, which immer makes cheap), upserts only the records that changed and commits.
The HTTP response is sent after the transaction commits.

**Single node by design.** Commands are serialized through one queue, which makes them atomic
without row locks and is ample for a pilot. Scaling out is covered at the end of this document.

**The simulator** (`src/domain/simulator.ts`) runs inside the server in demo mode: it walks
app-raised incidents along the response chain, evaluates the escalation policy and adds an ambient
event about every half minute. It never runs with `DEMO_MODE=false`.

## Access control

Enforced in `server/access.ts` and `server/routes.ts`, independent of anything the client does.

1. **Identity comes from the token.** The `actor` recorded for every action is derived from the
   verified JWT. A client cannot act as someone else, and a citizen's reports are tied to the
   signed-in citizen, never to an id in the request body.
2. **Permissions are checked per command** against the live role table, so a change made in the
   role builder applies to the very next request. Examples: `incident.classify` to acknowledge or
   triage, `unit.assign` to assign, `incident.resolve` to resolve, `evidence.export` plus a verified
   second factor to request an export, `admin.roles` to edit roles.
3. **Ownership is checked** where a permission alone is not enough: a citizen may only cancel or
   message on their own incident; an officer may only act for their own unit and upload evidence
   to an incident their unit is on.
4. **Data is reduced before it leaves the server.** The same projection is used for the stream and
   for command responses:

| Role                                      | Receives                                                                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Citizen                                   | Own incidents (without staff notes, triage, internal timeline entries), citizen-channel messages, own uploads, complaints, journeys, contacts, notifications; the unit assigned to their open emergency |
| Officer                                   | Incidents assigned to their unit in full; other open incidents with reporter details withheld; messages and evidence for their own incidents                                                            |
| Operator, dispatcher, supervisor, command | The operational picture. Restricted evidence arrives blanked unless the role holds `evidence.restricted`. Full audit only with `audit.view`; otherwise just the trail of incidents                      |
| Administrator                             | Configuration, staff and the audit log. No incidents, messages or evidence                                                                                                                              |

A confidential tip is stored with no citizen id and is audited under "system".

## Live updates

Server-Sent Events, in `server/realtime.ts`.

1. `POST /realtime/ticket` with the bearer token returns a single-use ticket valid for 30 seconds.
2. `GET /realtime/stream?ticket=…` opens the stream. (EventSource cannot send headers, and
   long-lived tokens do not belong in URLs.)
3. The first event is `snapshot`: everything the role may see. After every change the server sends
   each viewer a `patch` containing only what changed _for them_ — including records that have just
   become visible (a unit assigned to a citizen's emergency) or stopped being visible.
4. A role-permission change resends a snapshot to everyone, since it alters what may be seen.

The browser reconnects by itself and the server resends a snapshot on reconnect. An SOS raised
with no connection is held in a local outbox and delivered when the stream returns.

## Audit trail

`audit_events` is append-only: a trigger rejects any `UPDATE` or `DELETE`. Each row stores
`chain_hash = SHA-256(previous chain_hash | row content)`, so altering or removing any row breaks
every later link. `GET /audit/verify` (or `npm run db:status`) walks the table and reports the
first broken link.

The audit screen queries PostgreSQL directly (`GET /audit`), so it covers the full history and not
only the recent window held in memory.

Demo reset uses `TRUNCATE`, which bypasses the row trigger by design; it is only reachable in demo mode.

## Database

Migrations are plain SQL in `server/migrations/`, applied in name order and recorded in
`schema_migrations`. Add a new numbered file to change the schema.

Each aggregate is one row. Fields that queries and reports need are real, indexed columns; the full
record sits beside them as JSONB (`doc`).

| Table                                                                                                                       | Key columns besides `doc`                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `incidents`                                                                                                                 | status, priority, category_id, source, station_id, district_id, citizen_id, lat, lng, created_at, resolved_at |
| `units`                                                                                                                     | call_sign, station_id, status, current_incident_id                                                            |
| `messages`                                                                                                                  | incident_id, channel, sender_role, sent_at                                                                    |
| `evidence`                                                                                                                  | incident_id, type, classification, integrity, source, hash, submitted_at                                      |
| `complaints`                                                                                                                | citizen_id, station_id, status, kind, submitted_at                                                            |
| `journeys`, `emergency_contacts`                                                                                            | citizen_id, status, started_at                                                                                |
| `communication_sessions`                                                                                                    | incident_id, type, status, started_at                                                                         |
| `notifications`, `escalations`                                                                                              | kind/tone or level/status, timestamps                                                                         |
| `roles`, `staff_users`, `incident_categories`, `escalation_rules`, `sla_policies`, `integrations`, `notification_templates` | configuration, with `ord` preserving display order                                                            |
| `audit_events`                                                                                                              | seq, at, actor, action, category, incident_id, entity_id, detail, chain_hash                                  |
| `platform_meta`                                                                                                             | counters (next incident number, …) and simulator state                                                        |

Example report straight from SQL:

```sql
select priority, count(*) filter (where status not in ('resolved','closed','cancelled')) as open,
       round(avg(extract(epoch from (resolved_at - created_at)) / 60)) as avg_minutes_to_resolve
from incidents group by priority order by priority;
```

## API reference

All routes except `/health`, `/auth/personas` and `/auth/login` need `Authorization: Bearer <token>`.
Errors are JSON: `{ "code": "forbidden" | "not_found" | "invalid" | "unauthorized" | "conflict", "message": "…" }`.

**Session**

| Route                                             | Purpose                                    |
| ------------------------------------------------- | ------------------------------------------ |
| `GET /health`                                     | Liveness and counts                        |
| `GET /auth/personas` · `POST /auth/login`         | Demo sign-in as a persona (demo mode only) |
| `GET /auth/session` · `POST /auth/session/extend` | Session details; a fresh token             |
| `POST /auth/mfa/verify`                           | Second-factor placeholder (any six digits) |
| `POST /realtime/ticket` · `GET /realtime/stream`  | Live stream                                |

**Incidents and dispatch**

| Route                                                                         | Needs                                                 |
| ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| `POST /sos`                                                                   | citizen                                               |
| `POST /incidents`                                                             | `incident.create` (citizens: reports and tips only)   |
| `POST /incidents/:id/acknowledge` · `/triage`                                 | `incident.classify`                                   |
| `POST /incidents/:id/notes`                                                   | `incident.note` and a part in the incident            |
| `POST /incidents/:id/escalate` · `POST /escalations/:id/status`               | `incident.escalate`                                   |
| `POST /incidents/:id/transfer`                                                | `incident.transfer`                                   |
| `POST /incidents/:id/resolve` · `/close`                                      | `incident.resolve`                                    |
| `POST /incidents/:id/cancel`                                                  | the citizen who raised it                             |
| `GET /incidents/:id/recommended-units`                                        | `unit.assign`, `unit.view`, or a unit on the incident |
| `POST /incidents/:id/units` · `/units/:unitId/release`                        | `unit.assign`                                         |
| `POST /incidents/:id/backup`                                                  | `incident.dispatch`, or a unit on the incident        |
| `POST /incidents/:id/units/:unitId/accept` · `/reject` · `/arrive` · `/stage` | that unit's officer, or `incident.dispatch`           |
| `POST /incidents/:id/units/:unitId/complete` · `/report`                      | that unit's officer, or `incident.resolve`            |
| `POST /units/:id/status`                                                      | that unit's officer, or `unit.status.update`          |

**Communication and evidence**

| Route                                                     | Needs                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `POST /incidents/:id/messages`                            | `communication.citizen` or `communication.internal`, and a part in the incident     |
| `POST /incidents/:id/sessions` · `POST /sessions/:id/end` | a part in the incident (staff: not on a silent SOS)                                 |
| `POST /evidence`                                          | `evidence.upload` and a part in the incident                                        |
| `POST /evidence/:id/view`                                 | `evidence.view` (+ `evidence.restricted` for restricted items; refusals are logged) |
| `POST /evidence/:id/export`                               | `evidence.export` and a verified second factor                                      |

**Citizen records**

| Route                                                                         | Needs                    |
| ----------------------------------------------------------------------------- | ------------------------ |
| `POST /complaints` · `POST /complaints/:id/information`                       | citizen (own)            |
| `POST /complaints/:id/status`                                                 | `complaint.update`       |
| `POST /journeys` · `/journeys/:id/check-in` · `/complete` · `/stop` · `/help` | citizen (own)            |
| `POST /contacts` · `PATCH /contacts/:id` · `DELETE /contacts/:id`             | citizen (own)            |
| `POST /notifications/read`                                                    | any signed-in user (own) |

**Oversight and administration**

| Route                                                                                      | Needs                                                               |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `GET /audit`                                                                               | `audit.view`, or `?incidentId=` for an incident the caller can open |
| `GET /audit/verify`                                                                        | `audit.view`                                                        |
| `GET /analytics/overview?scope=station\|district\|state`                                   | the matching `analytics.*` permission                               |
| `GET /analytics/density`                                                                   | any `analytics.*` permission                                        |
| `GET /search?q=`                                                                           | any signed-in user; results limited by role                         |
| `PUT /admin/roles/:role/permissions`                                                       | `admin.roles` (system roles are fixed)                              |
| `PUT /admin/users/:id` · `POST /admin/users/:id/status`                                    | `admin.users`                                                       |
| `PATCH /admin/categories/:id` · `/admin/sla/:priority` · `/admin/templates/:id`            | `admin.configuration`                                               |
| `PUT` / `DELETE /admin/escalation-rules/:id`                                               | `admin.configuration`                                               |
| `POST /admin/integrations/:id/status`                                                      | `admin.integrations`                                                |
| `POST /demo/reset` · `/demo/advance` · `/demo/request-assignment` · `PUT /demo/simulation` | demo mode only                                                      |

## Testing

`npm run test:api` signs in as six personas and checks 58 things against a running server:
sign-in and 401s, what each role receives, permission refusals, validation, the SOS chain appearing
on other users' streams, chat separation, tip anonymity, role changes taking effect, suspension,
database-backed audit queries and the hash chain.

## What a production deployment still needs

This backend is real, but it is a pilot-grade foundation, not a finished government system.

| Area                   | Today                                             | Needed                                                                                                         |
| ---------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Identity               | Persona sign-in without a password (demo mode)    | Government SSO / directory, real second factor, device binding                                                 |
| Scale and availability | One process, in-memory state, serialized commands | Shared event log (Kafka / NATS), per-aggregate transactions, several API nodes, Redis for presence and fan-out |
| Media                  | Voice and video are a simulated screen            | WebRTC with TURN/SFU, signalled through the API; telephony for the emergency number                            |
| Evidence files         | Metadata only; the stored digest is a placeholder | Object storage with write-once retention, server-side SHA-256 at ingestion, signed download URLs               |
| Analytics              | Trend charts use seeded aggregates                | A reporting store fed by the incident event stream                                                             |
| Location               | Fictional positions                               | Device location with consent, routing and ETA service, jurisdiction lookup (PostGIS)                           |
| Notifications          | In-app only                                       | Push and SMS providers with delivery receipts                                                                  |
| Integrations           | Placeholders                                      | Agency adapters under signed agreements                                                                        |
| Operations             | Local process                                     | TLS, secrets management, backups, monitoring, rate limiting, security review and penetration test              |
