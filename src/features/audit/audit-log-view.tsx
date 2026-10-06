"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { Download, Link2, Lock, ScrollText, SearchX } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import {
  BlankState,
  ErrorState,
  ListSkeleton,
  RestrictedState,
} from "@/components/shared/states";
import { ToneChip } from "@/components/shared/status-chips";
import { ClockStamp } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AREAS_CONFIG } from "@/config/navigation";
import { PERSONAS } from "@/data/demo/people";
import {
  retentionLabel,
  useAdminSettings,
} from "@/features/admin/admin-settings-store";
import {
  FilterSelect,
  FormField,
  Notice,
  SearchField,
  Spinner,
  useDebouncedValue,
  type Option,
} from "@/features/admin/admin-ui";
import { useSwitchPersona } from "@/features/auth/use-switch-persona";
import { useAction } from "@/hooks/use-action";
import { useIsMd } from "@/hooks/use-mounted";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { ServiceError, services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import type { AuditEvent, RoleKey } from "@/types";

type Variant = "admin" | "control";
type Category = AuditEvent["category"];
type RangeKey = "1h" | "24h" | "7d" | "all";
type ActorRole = RoleKey | "system";

const PAGE_SIZE = 100;
const HOUR = 60 * 60 * 1000;

const RANGE_MS: Record<Exclude<RangeKey, "all">, number> = {
  "1h": HOUR,
  "24h": 24 * HOUR,
  "7d": 7 * 24 * HOUR,
};

const RANGE_OPTIONS: Option<RangeKey>[] = [
  { value: "all", label: "All time" },
  { value: "1h", label: "Last hour" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
];

const CATEGORY_LABEL: Record<Category, string> = {
  incident: "Incident",
  dispatch: "Dispatch",
  communication: "Communication",
  evidence: "Evidence",
  complaint: "Complaint",
  access: "Access",
  admin: "Administration",
  system: "System",
};

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

const COPY: Record<Variant, { title: string; description: string }> = {
  admin: {
    title: "Audit log",
    description:
      "Every action on the platform, including configuration changes, with who took it and when. Read-only, for administrators too.",
  },
  control: {
    title: "Audit",
    description:
      "Every operational action, with who took it and when. Read-only.",
  },
};

/* ───────────────────────── Export ───────────────────────── */

function toCsv(rows: AuditEvent[], roleLabel: (role: ActorRole) => string) {
  // Quote every cell, and neutralise cells a spreadsheet would run as a formula.
  const cell = (value: string) => {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const header = [
    "Time (ISO 8601)",
    "Action",
    "Category",
    "Actor",
    "Role",
    "Incident ID",
    "Record ID",
    "Detail",
    "Chain value (demo)",
  ];
  const lines = rows.map((e) =>
    [
      new Date(e.at).toISOString(),
      e.action,
      CATEGORY_LABEL[e.category],
      e.actorName,
      roleLabel(e.actorRole),
      e.incidentId ?? "",
      e.entityId ?? "",
      e.detail,
      e.chainHash,
    ]
      .map(cell)
      .join(","),
  );
  return [header.map(cell).join(","), ...lines].join("\r\n");
}

function downloadCsv(csv: string) {
  // The byte-order mark makes spreadsheets read Gujarati and Hindi text correctly.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-log-${format(Date.now(), "yyyyMMdd-HHmm")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const purposeSchema = z.object({
  purpose: z
    .string()
    .trim()
    .min(10, "Say what the export is for, in at least 10 characters.")
    .max(200, "Keep the purpose under 200 characters."),
});

function ExportDialog({
  count,
  pending,
  onExport,
  onClose,
}: {
  count: number;
  pending: boolean;
  onExport: (purpose: string) => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof purposeSchema>>({
    resolver: zodResolver(purposeSchema),
    defaultValues: { purpose: "" },
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export audit entries</DialogTitle>
          <DialogDescription>
            <span className="tnum">{count}</span>{" "}
            {count === 1 ? "entry matches" : "entries match"} the current
            filters. Audit settings require a stated purpose, which is written
            to the log with your name.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid grid-cols-1 gap-4"
          onSubmit={handleSubmit((values) => onExport(values.purpose))}
        >
          <FormField
            label="Purpose of this export"
            htmlFor="export-purpose"
            error={errors.purpose?.message}
          >
            <Textarea
              id="export-purpose"
              rows={3}
              placeholder="For example: weekly supervisory review of dispatch actions"
              aria-invalid={Boolean(errors.purpose)}
              aria-describedby={
                errors.purpose ? "export-purpose-error" : undefined
              }
              {...register("purpose")}
            />
          </FormField>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Spinner /> : <Download aria-hidden />}
              Export CSV
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Restricted ───────────────────────── */

const deniedAt = new Map<string, number>();

function AuditRestricted({ variant }: { variant: Variant }) {
  const { actor } = useSession();
  const roles = useDemoStore((s) => s.roles);
  const switchPersona = useSwitchPersona();

  // A refused attempt to read the audit trail is itself worth a line in it. Once a minute at most.
  useEffect(() => {
    const last = deniedAt.get(actor.id) ?? 0;
    if (Date.now() - last < 60_000) return;
    deniedAt.set(actor.id, Date.now());
    services.audit
      .record(
        {
          action: "Audit log access denied",
          category: "access",
          detail: "Role does not include audit.view",
        },
        actor,
      )
      .catch(() => {});
  }, [actor]);

  const permitted = PERSONAS.find(
    (p) =>
      AREAS_CONFIG[variant].roles.includes(p.role) &&
      roles.find((r) => r.key === p.role)?.permissions.includes("audit.view"),
  );
  const home = variant === "admin" ? "/admin/audit" : "/control/audit";

  return (
    <PageContainer>
      <PageHeader title={COPY[variant].title} />
      <Panel>
        <RestrictedState
          title="The audit log is restricted"
          description="Your role does not include the “View audit log” permission. This attempt has been recorded."
          action={
            permitted && (
              <Button
                size="lg"
                onClick={() => switchPersona(permitted.id, home)}
              >
                Continue as {permitted.name}
              </Button>
            )
          }
        />
      </Panel>
    </PageContainer>
  );
}

/* ───────────────────────── Rows ───────────────────────── */

function TimeStamp({ at, now }: { at: number; now: number }) {
  const today = now > 0 && isSameDay(at, now);
  return (
    <span className="flex flex-col gap-0.5">
      <ClockStamp at={at} className="text-foreground" />
      {!today && (
        <span className="tnum text-[11px] text-subtle">
          {format(at, "d MMM")}
        </span>
      )}
    </span>
  );
}

function IncidentRef({ id, variant }: { id: string; variant: Variant }) {
  return variant === "control" ? (
    <Link
      href={`/control/incidents?id=${encodeURIComponent(id)}`}
      className="tnum font-mono text-xs text-primary underline-offset-4 hover:underline"
    >
      {id}
    </Link>
  ) : (
    <span className="tnum font-mono text-xs">{id}</span>
  );
}

function ChainValue({ value }: { value: string }) {
  return (
    <span
      title="Demonstration chain value"
      className="inline-flex items-center gap-1 font-mono text-[11px] text-subtle"
    >
      <Link2 aria-hidden className="size-3 shrink-0" />
      {value}
    </span>
  );
}

/* ───────────────────────── View ───────────────────────── */

function AuditLog({ variant }: { variant: Variant }) {
  const params = useSearchParams();
  const { actor } = useSession();
  const audit = useDemoStore((s) => s.audit);
  const roles = useDemoStore((s) => s.roles);
  const connectivity = usePrefsStore((s) => s.connectivity);
  const retention = useAdminSettings((s) => s.auditRetention);
  const exportApproval = useAdminSettings((s) => s.exportApproval);
  const now = useNow(60_000);
  const isMd = useIsMd();

  const [search, setSearch] = useState("");
  const [actorName, setActorName] = useState("all");
  const [role, setRole] = useState<ActorRole | "all">("all");
  const [incidentId, setIncidentId] = useState(
    () => params.get("incident") ?? "all",
  );
  const [category, setCategory] = useState<Category | "all">(() => {
    const value = params.get("category") as Category | null;
    const allowed = value && CATEGORIES.includes(value);
    return allowed && !(variant === "control" && value === "admin")
      ? value
      : "all";
  });
  const [range, setRange] = useState<RangeKey>("all");
  const [more, setMore] = useState({ signature: "", limit: PAGE_SIZE });
  const [exporting, setExporting] = useState(false);
  const term = useDebouncedValue(search.trim());

  const roleLabel = useMemo(() => {
    const names = new Map<string, string>(roles.map((r) => [r.key, r.name]));
    return (key: ActorRole) => names.get(key) ?? "System";
  }, [roles]);

  // The filter lists offer only what is actually in the log this view may see.
  const options = useMemo(() => {
    const scoped =
      variant === "control"
        ? audit.filter((e) => e.category !== "admin")
        : audit;
    const actors = [...new Set(scoped.map((e) => e.actorName))].sort((a, b) =>
      a.localeCompare(b),
    );
    const actorRoles = [...new Set(scoped.map((e) => e.actorRole))];
    const incidents = [
      ...new Set(scoped.flatMap((e) => (e.incidentId ? [e.incidentId] : []))),
    ];
    if (incidentId !== "all" && !incidents.includes(incidentId))
      incidents.unshift(incidentId);
    return {
      actors: [
        { value: "all", label: "All users" },
        ...actors.map((name) => ({ value: name, label: name })),
      ] satisfies Option<string>[],
      roles: [
        { value: "all", label: "All roles" },
        ...actorRoles
          .map((key) => ({ value: key, label: roleLabel(key) }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      ] satisfies Option<ActorRole | "all">[],
      incidents: [
        { value: "all", label: "All incidents" },
        ...incidents.map((id) => ({ value: id, label: id })),
      ] satisfies Option<string>[],
      categories: [
        { value: "all", label: "All actions" },
        ...CATEGORIES.filter(
          (c) => !(variant === "control" && c === "admin"),
        ).map((c) => ({ value: c, label: CATEGORY_LABEL[c] })),
      ] satisfies Option<Category | "all">[],
    };
  }, [audit, variant, incidentId, roleLabel]);

  const signature = JSON.stringify([
    variant,
    actorName,
    role,
    incidentId,
    category,
    range,
    term,
  ]);
  const query = useQuery({
    // The log's length and newest entry are part of the key, so new events are picked up as they land.
    queryKey: [
      "audit",
      signature,
      audit.length,
      audit[0]?.id ?? null,
      connectivity,
    ],
    queryFn: async () => {
      const rows = await services.audit.query({
        actor: actorName === "all" ? undefined : actorName,
        role,
        incidentId: incidentId === "all" ? undefined : incidentId,
        category,
        search: term || undefined,
        since: range === "all" ? undefined : Date.now() - RANGE_MS[range],
      });
      return variant === "control"
        ? rows.filter((e) => e.category !== "admin")
        : rows;
    },
    // Keep the rows on screen while a newer copy of the same view loads; a changed filter starts clean.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === signature ? previous : undefined,
    gcTime: 30_000,
  });

  const rows = query.data ?? [];
  const limit = more.signature === signature ? more.limit : PAGE_SIZE;
  const visible = rows.slice(0, limit);
  const filtered =
    search.trim() !== "" ||
    actorName !== "all" ||
    role !== "all" ||
    incidentId !== "all" ||
    category !== "all" ||
    range !== "all";
  const clearFilters = () => {
    setSearch("");
    setActorName("all");
    setRole("all");
    setIncidentId("all");
    setCategory("all");
    setRange("all");
  };

  const exportRows = useAction(
    async (purpose?: string) => {
      const applied = [
        actorName !== "all" && `user ${actorName}`,
        role !== "all" && `role ${roleLabel(role)}`,
        incidentId !== "all" && `incident ${incidentId}`,
        category !== "all" && `action ${CATEGORY_LABEL[category]}`,
        range !== "all" &&
          RANGE_OPTIONS.find((o) => o.value === range)?.label.toLowerCase(),
        term && `search “${term}”`,
      ].filter(Boolean);
      // Recorded first: if the entry cannot be written, nothing is exported.
      await services.audit.record(
        {
          action: "Audit log exported",
          category: "access",
          detail: [
            `${rows.length} ${rows.length === 1 ? "entry" : "entries"}`,
            applied.length ? `filters: ${applied.join(", ")}` : "no filters",
            purpose && `purpose: ${purpose}`,
          ]
            .filter(Boolean)
            .join(" · "),
        },
        actor,
      );
      downloadCsv(toCsv(rows, roleLabel));
      return rows.length;
    },
    {
      success: (count) =>
        `Exported ${count} ${count === 1 ? "entry" : "entries"} as CSV`,
      onSuccess: () => setExporting(false),
    },
  );

  const canExport = query.isSuccess && rows.length > 0 && !exportRows.pending;

  return (
    <PageContainer>
      <PageHeader
        title={COPY[variant].title}
        description={COPY[variant].description}
        actions={
          <Button
            variant="outline"
            size="lg"
            disabled={!canExport}
            onClick={() =>
              exportApproval ? setExporting(true) : void exportRows.run()
            }
          >
            {exportRows.pending && !exporting ? (
              <Spinner />
            ) : (
              <Download aria-hidden />
            )}
            Export CSV
          </Button>
        }
      />

      <Notice icon={Lock} title="Append-only record">
        Entries cannot be edited or deleted by anyone. Each one carries a chain
        value tying it to the entry before it, so a missing or altered entry
        would show. Chain values in this prototype are demonstration values.
        Entries are kept for {retentionLabel(retention)}.
      </Notice>

      <div className="mt-4 mb-3 grid grid-cols-2 gap-2 lg:grid-cols-5 xl:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))]">
        <SearchField
          className="col-span-2 lg:col-span-5 xl:col-span-1"
          label="Search action, detail, user or incident"
          placeholder="Search the log…"
          value={search}
          onChange={setSearch}
        />
        <FilterSelect
          label="Filter by user"
          value={actorName}
          onChange={setActorName}
          options={options.actors}
        />
        <FilterSelect
          label="Filter by role"
          value={role}
          onChange={setRole}
          options={options.roles}
        />
        <FilterSelect
          label="Filter by incident"
          value={incidentId}
          onChange={setIncidentId}
          options={options.incidents}
        />
        <FilterSelect
          label="Filter by action"
          value={category}
          onChange={setCategory}
          options={options.categories}
        />
        <FilterSelect
          className="col-span-2 lg:col-span-1"
          label="Filter by date"
          value={range}
          onChange={setRange}
          options={RANGE_OPTIONS}
        />
      </div>

      <div className="mb-3 flex min-h-7 flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
        <p role="status" className="flex items-center gap-2">
          {query.isSuccess ? (
            <span className="tnum">
              {rows.length === 0
                ? "No entries"
                : visible.length < rows.length
                  ? `Showing ${visible.length} of ${rows.length} entries`
                  : `${rows.length} ${rows.length === 1 ? "entry" : "entries"}`}
              {filtered && rows.length > 0 && " match these filters"}
            </span>
          ) : query.isPending ? (
            "Loading entries…"
          ) : null}
          {query.isSuccess && query.isFetching && (
            <Spinner className="size-3.5" />
          )}
        </p>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <Panel className="overflow-hidden">
        {query.isPending ? (
          <ListSkeleton rows={8} className="p-4" />
        ) : query.isError ? (
          <ErrorState
            title="Unable to load the audit log."
            offline={
              query.error instanceof ServiceError &&
              query.error.code === "offline"
            }
            onRetry={() => void query.refetch()}
          />
        ) : rows.length === 0 ? (
          filtered ? (
            <BlankState
              icon={SearchX}
              title="No entries match these filters"
              description="Widen the date range or clear a filter. Nothing has been removed: the log cannot be deleted from."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <BlankState
              icon={ScrollText}
              title="No audit entries yet"
              description="Actions appear here the moment they are taken."
            />
          )
        ) : isMd ? (
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">
              Audit entries, newest first. Entries cannot be edited or deleted.
            </caption>
            <thead>
              <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
                <th scope="col" className="w-24 py-2.5 pr-2 pl-4 font-medium">
                  Time
                </th>
                <th scope="col" className="w-[21%] px-2 py-2.5 font-medium">
                  Action
                </th>
                <th scope="col" className="w-[17%] px-2 py-2.5 font-medium">
                  User and role
                </th>
                <th
                  scope="col"
                  className="hidden w-38 px-2 py-2.5 font-medium xl:table-cell"
                >
                  Incident
                </th>
                <th scope="col" className="px-2 py-2.5 font-medium">
                  Detail
                </th>
                <th
                  scope="col"
                  className="hidden w-38 py-2.5 pr-4 pl-2 font-medium xl:table-cell"
                >
                  Chain value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {visible.map((event) => (
                <tr key={event.id} className="align-top">
                  <td className="py-2.5 pr-2 pl-4">
                    <TimeStamp at={event.at} now={now} />
                  </td>
                  <td className="px-2 py-2.5">
                    <p className="font-medium break-words">{event.action}</p>
                    <ToneChip tone="neutral" variant="outline" className="mt-1">
                      {CATEGORY_LABEL[event.category]}
                    </ToneChip>
                  </td>
                  <td className="px-2 py-2.5">
                    <p className="break-words">{event.actorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {roleLabel(event.actorRole)}
                    </p>
                  </td>
                  <td className="hidden px-2 py-2.5 xl:table-cell">
                    {event.incidentId ? (
                      <IncidentRef id={event.incidentId} variant={variant} />
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-[13px] text-muted-foreground">
                    <p className="break-words">{event.detail}</p>
                    {event.incidentId && (
                      <p className="mt-1 xl:hidden">
                        <IncidentRef id={event.incidentId} variant={variant} />
                      </p>
                    )}
                  </td>
                  <td className="hidden py-2.5 pr-4 pl-2 xl:table-cell">
                    <ChainValue value={event.chainHash} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ol className="divide-y divide-border/70">
            {visible.map((event) => (
              <li key={event.id} className="grid grid-cols-1 gap-1.5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-medium break-words">
                    {event.action}
                  </p>
                  <span className="flex shrink-0 items-baseline gap-1.5">
                    {!(now > 0 && isSameDay(event.at, now)) && (
                      <span className="tnum text-[11px] text-subtle">
                        {format(event.at, "d MMM")}
                      </span>
                    )}
                    <ClockStamp at={event.at} className="text-foreground" />
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {event.actorName} · {roleLabel(event.actorRole)}
                </p>
                <p className="text-[13px] break-words text-muted-foreground">
                  {event.detail}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <ToneChip tone="neutral" variant="outline">
                    {CATEGORY_LABEL[event.category]}
                  </ToneChip>
                  {event.incidentId && (
                    <IncidentRef id={event.incidentId} variant={variant} />
                  )}
                  <span className="ml-auto">
                    <ChainValue value={event.chainHash} />
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}

        {query.isSuccess && rows.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-inset px-4 py-2.5 text-xs text-muted-foreground",
            )}
          >
            <span className="tnum">
              {visible.length < rows.length
                ? `${rows.length - visible.length} older ${rows.length - visible.length === 1 ? "entry" : "entries"} not shown`
                : "End of the log for this view"}
            </span>
            {visible.length < rows.length && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMore({ signature, limit: limit + PAGE_SIZE })}
              >
                Show more
              </Button>
            )}
          </div>
        )}
      </Panel>

      {exporting && (
        <ExportDialog
          count={rows.length}
          pending={exportRows.pending}
          onExport={(purpose) => void exportRows.run(purpose)}
          onClose={() => setExporting(false)}
        />
      )}
    </PageContainer>
  );
}

/**
 * The audit trail, shared by the administration console (`admin`: everything) and the control room
 * (`control`: operational entries only, with links through to the incident).
 */
export function AuditLogView({ variant }: { variant: Variant }) {
  const { can } = useSession();
  if (!can("audit.view")) return <AuditRestricted variant={variant} />;
  return <AuditLog variant={variant} />;
}
