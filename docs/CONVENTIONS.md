# Frontend conventions

How screens in this repository are built. Read this before adding or changing a screen.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind CSS v4 · shadcn/ui
(`radix-nova` style, Radix primitives via the `radix-ui` package) · lucide-react 1.x · Zustand 5 +
immer · TanStack Query 5 · React Hook Form + Zod 4 · Recharts 3 · Leaflet + react-leaflet 5 ·
`motion` 14 (`import { motion } from "motion/react"`) · date-fns 4 · sonner (toasts).

`next` here has breaking changes from older versions — check `node_modules/next/dist/docs/` rather
than memory. In client pages read route state with `useSearchParams()` / `useParams()` /
`useRouter()` from `next/navigation`.

## Where things live

```
src/app/<area>/<route>/page.tsx   thin route file: renders one screen component
src/features/<feature>/           screens and feature-only components
src/components/shared/            cross-feature building blocks (do not fork these)
src/components/layout/            app shell, demo banner, palette, notifications
src/components/ui/                shadcn primitives
src/hooks/                        useSession, useNow, useAction, useT, read hooks
src/services/                     service contracts; http/ (API) and mock/ (in-browser) implementations
src/domain/                       rules shared by browser and server: commands, queries, simulator
server/                           API server (see docs/BACKEND.md)
src/stores/                       demo-store (mock database + realtime cache), prefs-store
src/data/demo/                    seed data            src/config/   tokens, nav, deployment
src/types/                        the domain model     src/lib/      format, geo, i18n, utils
```

A route file is two lines:

```tsx
import { UnitsScreen } from "@/features/units/units-screen";
export default function Page() {
  return <UnitsScreen />;
}
```

Screens are client components (`"use client"`). The shell (`AppShell`) renders children only after
mount inside a `<Suspense>` boundary, so screens may read the store, the clock and
`useSearchParams()` freely.

## Layout contract

`AppShell` is a fixed viewport-height frame; `<main>` scrolls. So:

- Ordinary page: `<PageContainer width="narrow|wide|full"><PageHeader …/>…</PageContainer>`.
- Full-bleed page (map, board, multi-panel console): root element `className="flex h-full min-h-0 …"`
  and scroll inside your own panels (`min-h-0 overflow-y-auto scroll-thin`).
- Never use `100vh`/`h-screen` inside a page; the demo banner and bars already take space.
- Mobile shows a bottom navigation bar below `<main>`; you do not need bottom padding for it.

## Data

**Reads** come from the realtime store through hooks in `src/hooks/use-demo-data.ts`
(`useIncidents`, `useActiveIncidents`, `useIncident`, `useUnits`, `useUnit`, `useOpsStats`,
`useCitizenActiveSos`, `useCitizenIncidents`, `useOfficerWork`, `useIncidentMessages`,
`useIncidentEvidence`, `useLiveSession`, `useNotifications`, `useCategories`,
`useCategoryLookup`) or `useDemoStore((s) => s.<slice>)`.

Zustand rule: **a selector must return a stable reference.** Select the raw slice and derive with
`useMemo`. `useDemoStore((s) => s.evidence.filter(…))` causes an infinite render loop.

Static reference data (stations, districts, facilities, officers, personas, org tree, density) is
imported from `@/data/demo`.

**Writes** go through `services` (`import { services } from "@/services"`), wrapped in `useAction`
for the pending flag and failure toast. Never call store actions from a component.

The app runs in two modes with the same screens: stand-alone (commands run in the browser against
the local store) and full stack (commands go to the API in `server/`, and the store is filled from
its live stream). A screen that goes through `services` and the read hooks works in both; one that
calls a store action directly works only in the first. A new command is added in three places:
`src/domain/platform-store.ts` (the rule), `src/services/contracts.ts` + both implementations, and
a route in `server/routes.ts` with its permission check.

```tsx
const { actor } = useSession();
const assign = useAction(services.dispatch.assignUnit, {
  success: "Unit assigned",
});
<Button
  disabled={assign.pending}
  onClick={() => assign.run(incident.id, unit.id, actor)}
>
  Assign unit
</Button>;
```

Every command takes the `actor` so the audit log is complete. Services reject with
`ServiceError("offline")` when the demo connection is set to offline — `useAction` shows the toast.

**One-off queries** (`services.analytics.*`, `services.audit.query`, `services.dispatch.recommendUnits`,
`services.search.search`, `services.auth.getSession`) go through TanStack Query so loading and error
states are real:

```tsx
const q = useQuery({
  queryKey: ["analytics", scope],
  queryFn: () => services.analytics.getOverview(scope),
});
if (q.isPending) return <ChartSkeleton />;
if (q.isError)
  return (
    <ErrorState
      offline={q.error instanceof ServiceError && q.error.code === "offline"}
      onRetry={() => q.refetch()}
    />
  );
```

## Time

Never call `Date.now()` / `new Date()` during render. Use `useNow()` (ticks each second; pass a
step such as `useNow(30_000)` for coarse labels) or the ready-made components in
`components/shared/timers.tsx`: `ResponseTimer`, `RelativeTime`, `EtaCountdown`, `ClockStamp`.
Format with `src/lib/format.ts`.

## Who is using the app

`const { persona, actor, role, citizen, can } = useSession();`
`can("evidence.restricted")` checks a permission; gate sensitive UI on it and show
`<RestrictedState />` otherwise. The demo role switcher changes `persona`.

## Design system

Tokens are defined in `src/app/globals.css`. Use them — never raw hex and never Tailwind palette
colours (`red-500`, `slate-200`, …).

| Purpose                                          | Classes                                                                                                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Page background / raised surface / inset surface | `bg-background` / `bg-card` / `bg-inset`                                                                                          |
| Text                                             | `text-foreground`, `text-muted-foreground`, `text-subtle` (tertiary)                                                              |
| Lines                                            | `border-border`, `border-input` (stronger)                                                                                        |
| Brand / interactive                              | `bg-primary text-primary-foreground`, `text-primary`, `bg-accent text-accent-foreground`                                          |
| Severity (five tones only)                       | `critical`, `high`, `medium`, `normal`, `resolved` — each has `bg-<tone>`, `bg-<tone>-soft`, `text-<tone>-fg`, `border-<tone>/35` |
| Elevation                                        | `shadow-card`, `shadow-raised` (nothing else)                                                                                     |

- **Status is always drawn with the shared chips** (`components/shared/status-chips.tsx`):
  `PriorityBadge`, `StatusChip`, `UnitStatusChip`, `OfficerStageChip`, `ComplaintStatusChip`,
  `ClassificationChip`, `IntegrityChip`, `ToneChip`, `SensitiveBadge`. Tone → class maps live in
  `TONE` (`src/config/incident.ts`) together with all label/meta maps (`PRIORITY_META`,
  `STATUS_META`, `UNIT_STATUS_META`, `COMPLAINT_STATUS_META`, `DISPATCH_COLUMNS`, …).
- **Red means critical.** It is not a brand colour and not a generic "danger button" colour. At most
  one solid-red element per view. Destructive-but-ordinary actions use `variant="destructive"`.
- **Surfaces:** use `Panel` / `PanelHeader` (`components/shared/page.tsx`). Console radius
  `rounded-xl`; citizen and officer cards `rounded-2xl`. Hairline borders, no heavy shadows, no
  gradients, no glass blur as decoration.
- **Type:** Geist via `font-sans`; ids, hashes and clocks in `font-mono`; any number that changes
  gets `tnum`. Page title `text-2xl font-semibold tracking-tight`; panel title `text-sm
font-semibold`; body `text-sm`; secondary `text-xs|text-[13px] text-muted-foreground`.
  Citizen screens run one step larger (`text-base` body, `text-lg` section titles).
- **No all-caps labels, no tracked-out eyebrows, no decorative numbering.** Sentence case everywhere.
- **Density:** citizen = spacious and warm; officer = large and action-first; control room = dense
  but ordered; command = analytical. Do not reuse a desktop layout shrunk down — build the mobile
  variant (cards, bottom sheets, sticky action bars).
- **Buttons:** console `size="default|lg"` (32/36px). Citizen and officer primary actions
  `size="xl"` (48px) or `"2xl"` (56px); every touch target at least 44px. Variants: `default`,
  `outline`, `secondary`, `ghost`, `destructive`, `critical` (emergency only), `success`.
- **Motion:** only in answer to an action or to mark one state change. No entrance animations on
  every card. Reduced motion is handled globally.
- **Icons:** lucide only. Icon-only buttons need `aria-label`; decorative icons get `aria-hidden`.

## Copy

Plain verbs, sentence case, no filler. A button says what happens ("Assign unit", not "Submit");
the toast repeats it ("Unit assigned"). Errors say what happened and what to do. Empty states say
what the emptiness means.

Product truths the copy must respect:

- This is a demonstration. Nothing may imply a live connection to emergency services, telecom or SMS.
- Complaints here are **not** FIRs or statutory filings. Say "complaint" or "report".
- AI is an assistant: it _suggests_ with a reason; an operator _confirms_. Never "AI decided".
- Density maps are labelled **"Historical incident density"** — never prediction, risk scores or
  anything about people or communities.
- Citizens are never told to confront anyone.
- Staff see reduced citizen details (masked phone, shortened name) — do not un-mask in UI.

## Responsive

Design for 320, 375, 430, 768, 1024, 1280, 1440 and 1920px. No horizontal page overflow: put
`min-w-0` on flex children, `truncate` long ids, let chip rows `flex-wrap`.

- Tables: real `<table>` from `md` up; a card list below `md` (or an explicit
  `overflow-x-auto` region for genuinely tabular data).
- Detail views: side panel from `lg`/`xl`; `Sheet`/`Drawer` below. `useIsMd()`, `useIsLg()`,
  `useIsXl()`, `useIs2xl()` are in `src/hooks/use-mounted.ts`.
- Dialog content must scroll inside (`max-h-[85dvh] overflow-y-auto`) so nothing clips on phones.

## Accessibility

Semantic elements (`button`, `nav`, `table`, `dl`), a label for every input, visible focus (the
default ring), `role="status"`/`aria-live` for things that update, dialogs only through the shadcn
primitives, and never colour alone to carry meaning (chips always include text).

## States

Every list and detail needs all three: empty (`EmptyState` for "all clear", `BlankState` for
neutral), loading (`ListSkeleton`, `CardGridSkeleton`, `ChartSkeleton`) and error (`ErrorState`
with retry). Restricted content uses `RestrictedState`.

## Lint rules that bite (React Compiler rules are on)

- No `setState` called synchronously inside `useEffect` — derive the value, or key the component.
- No reading or writing `ref.current` during render.
- No `Date.now()`, `new Date()` or `Math.random()` during render.
- No component created during render. Pick icons from a static map
  (`const Icon = MAP[key]` is fine); a _function call_ that returns a component must be rendered
  with `createElement`.
- Hook dependency arrays must be complete.

## Shared building blocks

| Import                               | What it is                                                             |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `@/components/shared/page`           | `PageContainer`, `PageHeader`, `Panel`, `PanelHeader`, `Field`, `Kbd`  |
| `@/components/shared/states`         | `EmptyState`, `BlankState`, `ErrorState`, `RestrictedState`, skeletons |
| `@/components/shared/stat-card`      | `StatCard` metric tile                                                 |
| `@/components/shared/status-chips`   | all status chips (see above)                                           |
| `@/components/shared/timers`         | `ResponseTimer`, `RelativeTime`, `EtaCountdown`, `ClockStamp`          |
| `@/components/shared/timeline`       | `Timeline` for `incident.timeline` (`citizenView` filters)             |
| `@/components/shared/incident-row`   | `IncidentRow` queue/feed item                                          |
| `@/components/shared/ops-map`        | `OpsMap` (Leaflet, no SSR) and `MapLegend`                             |
| `@/components/shared/chat-thread`    | `ChatThread` — `channel="citizen"` or `"internal"`                     |
| `@/components/shared/secure-session` | `SecureSession` mock voice/video screen                                |
| `@/components/shared/media-picker`   | `MediaPicker`, `PickedMediaList`, `PickedMedia`                        |
| `@/components/shared/category-icon`  | `CategoryIcon`, `CATEGORY_ICONS`                                       |
| `@/components/shared/emblem`         | `Emblem`, `Wordmark`                                                   |
| `@/features/sos/use-hold-to-confirm` | press-and-hold confirmation hook                                       |

shadcn primitives available in `@/components/ui`: alert-dialog, avatar, badge, button, card,
checkbox, collapsible, command, dialog, drawer, dropdown-menu, input, input-group, label, popover,
progress, radio-group, scroll-area, select, separator, sheet, skeleton, switch, table, tabs,
textarea, toggle, toggle-group, tooltip. `cn` comes from `@/lib/utils`.

## Links between areas

| URL                                                | Behaviour                                          |
| -------------------------------------------------- | -------------------------------------------------- |
| `/control/incidents?id=<incidentId>`               | opens that incident in the inspector               |
| `/control/incidents?priority=P1`                   | queue filtered to a priority                       |
| `/control/units?id=<unitId>` · `?status=available` | unit detail · filtered list                        |
| `/control/evidence?id=<evidenceId>`                | evidence detail                                    |
| `/control/complaints?id=<complaintId>`             | complaint detail (staff)                           |
| `/control/stations?id=<stationId>`                 | station dashboard for that station                 |
| `/citizen/complaints?id=<complaintId>`             | complaint detail (citizen)                         |
| `/citizen/sos`                                     | SOS trigger, or the active emergency if one exists |
| `/officer/assignment`                              | the officer's pending or active assignment         |

## Languages

`const t = useT(); t("citizen.sos.hold")`. Keys live in `src/lib/i18n/dictionaries/*` — English
first, then `gu` and `hi`; missing keys fall back to English. Citizen-facing screens translate their
main labels and actions; staff consoles are English-first with translated navigation and statuses.

## Checking your work

```
npx tsc --noEmit -p .
npx eslint src/features/<yours> src/app/<yours>
```
