# Sanket — Public Safety Platform (prototype)

An integrated public-safety, emergency-response and police-operations platform for an Indian state
deployment: a web app for five kinds of user and an API server backed by PostgreSQL. One codebase
carries the whole chain — a citizen raises an SOS, a control-room operator evaluates it, a
dispatcher assigns a unit, a field officer responds, evidence and actions land on the incident
timeline, and command teams watch the picture across stations and districts.

> **Prototype / Demonstration Environment — Not connected to real emergency services.**
> All people, incidents, locations and identifiers are fictional. In a real emergency, call 112.

The demo uses neutral "Gujarat Public Safety" branding with a placeholder emblem. Nothing is tied
to one police organisation: the deployment profile, organisation tree, categories, response
targets and escalation policy are all data.

## Contents

- [How to run](#how-to-run)
- [A five-minute tour](#a-five-minute-tour)
- [Roles and demo personas](#roles-and-demo-personas)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Directory structure](#directory-structure)
- [How the demo simulation works](#how-the-demo-simulation-works)
- [The service boundary](#the-service-boundary)
- [Security considerations](#security-considerations)
- [Privacy considerations](#privacy-considerations)
- [Production limitations](#production-limitations)

Backend details — configuration, access rules, API reference, database schema — are in
[`docs/BACKEND.md`](docs/BACKEND.md).

## How to run

Requires Node.js 20.9 or newer.

### Full stack: web app + API + PostgreSQL

Needs PostgreSQL running locally (Homebrew: `brew install postgresql@16 && brew services start postgresql@16`).

```bash
npm install
npm run db:setup     # creates the "sanket" database, applies migrations, seeds it
npm run dev:full     # API on http://localhost:4000, web app on http://localhost:3000
```

Everything is now shared and persistent: raise an SOS on a phone and it appears in the control
room on another device; restart the server and nothing is lost.

### Stand-alone demo: browser only

```bash
npm install
npm run dev          # http://localhost:3000
```

No database or server. The same screens and the same rules run entirely in the browser, with data
kept in that browser's local storage. Useful for a quick look, or where nothing can be installed.

### Other commands

```bash
npm run lint         # ESLint (Next.js + React Compiler rules)
npm run build        # production build of the web app, with type check
npm run api:build    # bundles the API to server/dist/main.mjs
npm run db:status    # row counts and an audit-chain integrity check
npm run db:reset     # back to the starting dataset
npm run test:api     # 58 end-to-end API checks against a running server (resets demo data)
```

**On a phone or tablet:** with the servers running, open `http://<your-computer's-LAN-address>:3000`
from a device on the same Wi-Fi (the address is printed as "Network" when the web server starts).
The web app reaches the API on the same address, so nothing else needs setting. Allow incoming
connections for Node if your firewall asks.

No accounts or keys are needed for development. Map tiles come from OpenStreetMap and need an
internet connection; without one the map shows a neutral grid with all markers intact.

## A five-minute tour

The slim strip at the top of every screen is the **demo control**. It holds the role switcher,
pause/resume for the simulator, a simulated connection state (online / weak / offline), a button
that advances the active SOS one step, and "Reset demo".

1. **Citizen** (Aarav Shah) — open the home screen and press and hold the SOS button for three
   seconds. The emergency screen appears and its status steps fill in on their own: control room
   connected, operator assigned, unit assigned, responder en route with a live ETA.
2. **Operator** (Meera Joshi) — switch role. The same incident is in the live feed and on the map.
   Open it to see the timeline, the assisted-triage suggestion waiting for confirmation, chat with
   the citizen, internal notes, responders and the audit trail. Try the dispatch board and the map.
3. **Officer** (PSI Arjun Patel, unit GJ-AHD-17) — a critical assignment is waiting. Accept it,
   navigate, mark arrived, add evidence, complete the response and file the preliminary report.
4. **Supervisor** (Inspector Neha Desai) — the station dashboard: officers, units, open incidents,
   escalations and reports waiting for review.
5. **Command** (DCP Vikram Rao) — district and state overview, analytics, district comparison and
   resources.
6. **Admin** — roles and permissions, organisation, categories, response targets, the escalation
   policy, integrations, audit log.

With the full stack running, do it on two devices at once: the citizen app on a phone and the
control room on a laptop. Pause the simulator and every step is yours to perform by hand.

Useful extras: switch to citizen **Kavya Patel** to land directly on an emergency already in
progress; set the connection to **Offline** and raise an SOS to see it queue and deliver on
reconnect; press `Ctrl/Cmd + K` in any console for the command palette and global search; change
language (English, ગુજરાતી, हिन्दी) and theme (light, dark, system) from the top bar.

## Roles and demo personas

| Role switcher | Persona                     | Lands on            | What they do                                                                          |
| ------------- | --------------------------- | ------------------- | ------------------------------------------------------------------------------------- |
| Citizen       | Aarav Shah                  | `/citizen`          | SOS, silent SOS, reports, tips, complaints, journey safety, trusted contacts, privacy |
| Citizen       | Kavya Patel                 | `/citizen/sos`      | Same app, with an SOS already active                                                  |
| Officer       | PSI Arjun Patel · GJ-AHD-17 | `/officer`          | Accept or decline, navigate, update status, evidence, reports                         |
| Operator      | Meera Joshi                 | `/control`          | Receive, evaluate, classify, communicate, dispatch, escalate, resolve                 |
| Supervisor    | Inspector Neha Desai        | `/control/stations` | Station incidents, units, personnel, escalations, review                              |
| Command       | DCP Vikram Rao              | `/command`          | District and state operations, analytics, resources                                   |
| Admin         | System Administrator        | `/admin`            | Users, roles, organisation, policy, integrations, audit                               |

The data model also defines **Dispatcher** and **State Command** roles (visible in the role
builder). In the demo the operator persona carries dispatch permissions and the command persona
carries both the district and the state view.

Opening an area your current role is not permitted in shows a "restricted" screen instead of the
content — that is the access model working, with a shortcut to continue as a permitted persona.
The same applies inside an area: the operator persona does not hold the audit permission, so the
control room's Audit screen shows as restricted for her until the permission is granted in the role
builder. Changes made there take effect immediately, for every signed-in user.

## Features

**Citizen app** (`/citizen`) — mobile-first, three languages

- Press-and-hold SOS (three seconds, visible countdown, keyboard and two-tap alternatives), quick
  emergency types, silent SOS with a discreet screen
- Emergency screen: live status steps, operator and responder, ETA, map, chat, mock voice/video
  session, share media, trusted contacts, "I am safe" / cancel with a reason
- Offline: the request is queued on the device, said plainly, and delivered when the connection returns
- Guided eight-step reporting: emergency report, normal report or confidential tip
- Complaint tracking with status steps, updates and documents
- Journey safety with consent, check-ins, trusted contacts and stop-sharing
- Trusted contacts, nearby help map, safety centre, privacy centre with consent history and data
  download

**Field officer app** (`/officer`) — phone and tablet first

- On-duty home, new assignment card, accept or decline with a reason
- Response screen: navigation preview, ETA, contact citizen, control room channel, request backup,
  arrived, situation controlled, evidence capture, complete response
- Incident intelligence with minimal personal data; preliminary response reports and hand-off

**Control room** (`/control`) — desktop-first operations console

- Overview with live map, incident feed and key counts; multi-panel layout on large displays
- Incident queue and inspector: overview, timeline, communication, evidence, responders, notes,
  audit; call, video, assign, dispatch, backup, escalate, transfer, resolve
- Assisted triage and an operator assistant (summary, translation, missing information, duplicate
  hint) that only ever suggests
- Dispatch board with drag and drop, live operations map with filters and layers, unit management
- Communication centre (voice, video, chat, internal notes kept visibly separate), internal
  messages, complaints, digital evidence centre with integrity and access history, station
  dashboard, escalations, analytics, audit log, settings

**Command centre** (`/command`) — district and state

- Operational overview, major-incident monitoring, analytics (response, volume, resolution,
  categories, districts, unit utilisation, target compliance, escalation rate), district comparison,
  resources, "Historical incident density" map layer

**Administration** (`/admin`)

- Users, role builder with grouped permissions, organisation hierarchy, incident categories,
  response targets, configurable escalation policy, inter-agency integration adapters,
  notification templates and localisation, audit log

**Backend** (`server/`)

- REST API for every command, with the acting user taken from a signed token
- Permissions and record ownership enforced on the server; each role is sent only the data it may see
- Live updates to every connected device over Server-Sent Events
- PostgreSQL persistence with one transaction per command
- Append-only audit trail chained with SHA-256, verifiable end to end

**Across the product**

- Role switcher, command palette and grouped global search, notification centre with toasts
- Light, dark and system themes; responsive from 320px to large command displays
- Loading, empty, error, offline and restricted states; reduced-motion support; keyboard access

## Tech stack

| Concern       | Choice                                                                  |
| ------------- | ----------------------------------------------------------------------- |
| Web framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict)       |
| Styling       | Tailwind CSS v4 with design tokens in `src/app/globals.css`             |
| Components    | shadcn/ui on Radix primitives, Lucide icons                             |
| Client state  | Zustand (+ immer) as the live cache; TanStack Query for one-off queries |
| Forms         | React Hook Form + Zod                                                   |
| Charts, maps  | Recharts; Leaflet + react-leaflet on OpenStreetMap tiles (no API key)   |
| API server    | Node.js 20, Fastify 5, TypeScript, Zod validation, JWT sessions         |
| Database      | PostgreSQL 16 (plain SQL migrations, `pg` driver)                       |
| Realtime      | Server-Sent Events with per-viewer patches                              |

Why a TypeScript API: the domain model and every business rule are written once
(`src/domain/`) and run unchanged in the browser demo and on the server, so the two cannot drift.
The HTTP contract is ordinary REST and JSON, so a later move to ASP.NET Core or another stack
would not touch the web app.

## Architecture

```
            ┌────────────────────────── web app (src/app, src/features) ─────────────────────┐
            │  citizen     officer     control room     command     admin                    │
            └──────┬──────────────────────────┬──────────────────────────────────────────────┘
          live reads (hooks)          commands and queries
                   │                          │
        ┌──────────▼──────────┐   ┌───────────▼────────────┐
        │ store (live cache)  │   │ service contracts      │   src/services/contracts.ts
        └──────────▲──────────┘   └─────┬───────────┬──────┘
                   │              full stack    stand-alone
                   │                    │           │
                   │   ┌────────────────▼───┐   ┌───▼──────────────────────┐
                   │   │ HTTP services      │   │ in-browser services      │
                   │   └────────────────┬───┘   │ run the rules locally    │
                   │ SSE snapshot       │ REST  └──────────────────────────┘
                   │ and patches        │
        ┌──────────┴────────────────────▼─────────────────────────────────┐
        │ API server (server/)                                            │
        │  token → validate → permission + ownership → command            │
        │  authoritative state  ──write-through──▶  PostgreSQL            │
        │  per-viewer projection ──▶ live stream        simulator (demo)  │
        └──────────────────────────────────────────────────────────────────┘
                 rules shared by both sides:  src/domain/
```

- **Domain model** — `src/types/index.ts` defines every entity: users and roles, permissions,
  organisation, units and officers, incidents with assignments and timelines, communication,
  evidence with access records, complaints, journeys, notifications, escalations, audit events and
  analytics shapes.
- **Rules, written once** — `src/domain/platform-store.ts` holds every command that can change
  state; `queries.ts`, `simulator.ts` and `collections.ts` hold the shared read rules, the event
  simulator and the stream format. The browser demo and the API server both import them.
- **Service boundary** — screens call `services.*` and read from the store. They do not know
  whether a server is involved.
- **API server** — verifies the token, validates the body, checks permission and ownership, runs
  the command, writes the change to PostgreSQL in one transaction, then streams each viewer only
  what changed for them.
- **Role areas** — each area (`/citizen`, `/officer`, `/control`, `/command`, `/admin`) is wrapped
  by one `AppShell` that provides navigation for every screen size and enforces which roles may
  enter.
- **Deployment profile** — `src/config/deployment.ts` holds product name, organisation, state, ID
  prefix and map defaults. Organisation, categories, response targets and escalation policy are
  data that the admin console edits.

`docs/BACKEND.md` covers the server in depth. `docs/CONVENTIONS.md` documents how screens are
built. `docs/MASTER_BUILD_PROMPT.md` is the original brief.

## Directory structure

```
server/                   API server
  main.ts                 start-up: database, state, routes, simulator
  routes.ts               every endpoint, with validation and permission checks
  access.ts               sessions, permissions, what each role may see
  platform.ts             authoritative state and the commit queue
  realtime.ts             live stream: snapshot and per-viewer patches
  db.ts                   pool, migrations, load, write-through, audit chain
  migrations/             SQL schema
  scripts/db.ts           db:setup, db:reset, db:status
  tests/api-e2e.mjs       end-to-end API test
src/
  app/                    routes: / (landing), citizen, officer, control, command, admin
  domain/                 rules shared by browser and server: commands, queries, simulator
  components/
    ui/                   shadcn primitives
    shared/               chips, timers, timeline, map, chat, call screen, states, panels
    layout/               app shell, demo banner, command palette, notifications, API link
  features/               one folder per feature (citizen, sos, officer, incidents, dispatch,
                          units, communications, evidence, complaints, stations, escalations,
                          command, analytics, admin, audit, simulation, landing, …)
  services/               contracts.ts (interfaces), http/ (API), mock/ (in-browser), index.ts
  stores/                 demo-store.ts (live cache), prefs-store.ts (language, persona, privacy)
  hooks/                  useSession, useNow, useAction, useT, live read hooks
  data/demo/              seed data: incidents, units, people, organisation, categories, analytics
  config/                 deployment profile, navigation, status and priority metadata
  lib/                    formatting, geography, i18n dictionaries, utilities
  types/                  the domain model
docs/                     backend guide, conventions and the original brief
```

## How the demo simulation works

The simulator stands in for the outside world — other operators, officers in the field, new calls.
With the full stack it runs inside the API server, once, for everyone; in the stand-alone demo it
runs in the browser. The behaviour is the same.

- **Seed** — the starting dataset is 26 incidents (about half open), 16 units, 18 evidence items,
  9 complaints, staff, roles, policies and an audit trail, all timestamped relative to the moment
  of seeding. "Reset demo" reseeds. (The stand-alone demo also reseeds by itself when its saved
  data is more than three hours old; the database is never reset automatically.)
- **Scripted response** — an incident raised from the citizen app is marked for automation. The
  simulator acknowledges it after about 2.5 s, confirms triage and assigns the nearest available
  unit, has the officer accept and set off, and marks arrival when the ETA elapses. Anything done by
  hand from another role simply takes the place of that step.
- **Ambient activity** — roughly every half minute one quiet event happens: a new incident, an
  acknowledgement, a unit going en route, an ETA change, a resolution. The number of open incidents
  is capped so the board never becomes chaotic.
- **Escalation policy** — the enabled rules from the admin console are evaluated against open
  incidents and raise real escalations when a threshold is passed.
- **Operator stand-in** — when a citizen sends a chat message on a scripted incident and nobody
  answers, the operator replies.
- **Controls** — "Pause simulation" stops all of the above (for every connected device, with the
  full stack) so every step can be performed by hand. "Advance active SOS" moves the current
  emergency one step. The connection switch makes this browser slow (weak) or cut off (offline); an
  SOS raised offline is queued on the device and delivered on reconnect.

The simulator lives in `src/domain/simulator.ts`. It is switched off entirely when the API runs
with `DEMO_MODE=false`.

In development builds the browser console exposes `window.__sanket` (the `demo` and `prefs` stores
and `services`) for inspecting state or scripting a flow. It is not present in production builds.

## The service boundary

Screens depend only on the interfaces in `src/services/contracts.ts` (`IncidentService`,
`SOSService`, `DispatchService`, `UnitService`, `EvidenceService`, `CommunicationService`,
`ComplaintService`, `JourneyService`, `NotificationService`, `AuditService`, `AuthService`,
`AnalyticsService`, plus contacts, search, admin and demo controls). `src/services/index.ts` picks
the implementation:

| Setting                                             | Implementation  | Where the rules run    |
| --------------------------------------------------- | --------------- | ---------------------- |
| `NEXT_PUBLIC_API_PORT` or `NEXT_PUBLIC_API_URL` set | `services/http` | API server, PostgreSQL |
| neither                                             | `services/mock` | this browser           |

To move to a different backend (for example ASP.NET Core), implement the same REST routes listed
in `docs/BACKEND.md` and the stream format in `src/domain/collections.ts`; the web app does not
change. To replace the demo sign-in, change `signIn` in `src/services/http/client.ts` and the
`/auth/login` route. To add real media, give `CommunicationService.createTransport()` a WebRTC
transport — `SecureSession` renders whatever it provides.

## Security considerations

Enforced by the API server:

- **Identity from the token** — every action is attributed to the signed-in user from a verified
  JWT. Nothing in a request body can change who acted.
- **Role-based access, least privilege** — each command checks an explicit permission
  (`incident.dispatch`, `evidence.restricted`, `admin.roles`, …) against the live role table, and
  record ownership where a permission is not enough. The administrator configures the platform and
  has no access to incidents or evidence.
- **Data minimisation on the wire** — each role is sent only what it may see. A citizen's browser
  never receives staff notes, the audit trail or anyone else's records; restricted evidence arrives
  blanked for roles without the permission.
- **Auditability** — every command is recorded with who, what, when and which incident, in an
  append-only table chained with SHA-256 and verifiable end to end.
- **Evidence handling** — originals are never edited; every view, refused attempt and export
  request is logged; exports require the permission and a verified second factor.
- **Sensitive data masking** — staff see shortened names and masked phone numbers.
- **Account status** — suspending a user in the admin console blocks their next request.

Not yet production-grade, and required before real use: a real identity provider (demo mode signs
in a persona without a password, and the second factor accepts any six digits), TLS, secret
management, rate limiting and abuse prevention, real cryptographic digests of evidence files, and
an independent security review. See the table at the end of `docs/BACKEND.md`.

## Privacy considerations

- **Not a surveillance tool** — a citizen's location is read only when they raise an emergency,
  file a report or start a shared journey, and sharing can be stopped. The demo never calls the
  browser's location, camera or microphone APIs; positions are fictional.
- **Clear consent** — the privacy centre shows each permission, explains emergency location
  sharing in plain language, and keeps a consent history.
- **Confidential tips** store no identity — on the server too — and cannot be traced back or
  followed up.
- **Silent SOS** is a display mode. It records nothing covertly.
- **Human decisions** — assisted triage suggests a category and priority with its reasoning; an
  operator confirms. Nothing automated determines an enforcement action.
- **No profiling** — analytics describe incidents, places and response performance. There is no
  demographic profiling, no risk scoring of people or communities, and the density layer is
  labelled as historical incident density, not prediction.
- **Staff access** is role-based, scoped, enforced by the server and audited.

## Production limitations

- No connection to emergency services, telecom networks, SMS, police record systems or any
  government system. Integrations are placeholders.
- Sign-in is a demo: pick a persona, no password. The second factor is a placeholder.
- The API is a single process holding state in memory and writing through to PostgreSQL. It is
  sized for a pilot; run one instance per database.
- Voice and video are a simulated interface; no media is captured or transmitted.
- Uploads record a file's name, type and size only; the file itself is not stored, and the digest
  shown for evidence is a placeholder. (The audit chain's SHA-256 values are real.)
- Trend and distribution charts use seeded aggregates; live counts come from the database.
- Response targets and escalation policies are demonstration values, not official service levels.
- Complaints and reports are demonstration records, not FIRs or statutory filings.
- Translations cover the citizen app and shared navigation; staff consoles are English-first. The
  safety centre's step-by-step guidance is English only, and a chat message a citizen sends in
  Gujarati or Hindi reaches the operator untranslated (only seeded messages show the translation
  affordance).
- Map tiles require internet access and are subject to OpenStreetMap's tile usage policy; a
  deployment would host tiles or license a provider.
