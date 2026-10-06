"use client";

import { format } from "date-fns";
import {
  FileSearch,
  FolderLock,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import {
  BlankState,
  EmptyState,
  RestrictedState,
} from "@/components/shared/states";
import { StatCard } from "@/components/shared/stat-card";
import {
  ClassificationChip,
  IntegrityChip,
} from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CLASSIFICATION_META, INTEGRITY_META } from "@/config/incident";
import { useIncidents } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import type {
  Evidence,
  EvidenceClassification,
  EvidenceIntegrity,
  EvidenceType,
  Incident,
} from "@/types";
import { EvidenceDetail } from "./evidence-detail";
import {
  CLASSIFICATIONS,
  EVIDENCE_SOURCES,
  EVIDENCE_SOURCE_LABEL,
  EVIDENCE_TYPES,
  EVIDENCE_TYPE_META,
  INTEGRITY_STATES,
  ROLE_LABEL,
} from "./evidence-meta";
import { FilterSelect, SearchField } from "./filters";
import { PaneFrame, RecordSplit } from "./record-layout";
import { useUrlParam } from "./use-url-param";

const stamp = (at: number) => format(at, "d MMM, HH:mm:ss");

function Stamp({ at }: { at: number }) {
  return (
    <time
      dateTime={new Date(at).toISOString()}
      title={formatDateTime(at)}
      className="tnum font-mono text-xs text-muted-foreground"
    >
      {stamp(at)}
    </time>
  );
}

function TypeTile({ type, locked }: { type: EvidenceType; locked: boolean }) {
  const Icon = locked ? Lock : EVIDENCE_TYPE_META[type].icon;
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg border",
        locked
          ? "border-border bg-muted text-muted-foreground"
          : "border-border bg-inset text-muted-foreground",
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

interface Row {
  item: Evidence;
  incident: Incident | undefined;
  /** Restricted and not open to the current role: listed, but the content stays hidden. */
  locked: boolean;
}

function EvidenceTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: Row[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Panel className="hidden overflow-hidden @xl:block">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="bg-inset hover:bg-inset">
            <TableHead className="pl-4">Evidence ID</TableHead>
            <TableHead className="hidden @3xl:table-cell">
              Incident ID
            </TableHead>
            <TableHead className="hidden @7xl:table-cell">Type</TableHead>
            <TableHead className="hidden @7xl:table-cell">Title</TableHead>
            <TableHead className="hidden @[68rem]:table-cell">
              Uploaded by
            </TableHead>
            <TableHead className="hidden @[92rem]:table-cell">
              Captured
            </TableHead>
            <TableHead className="hidden @4xl:table-cell">Submitted</TableHead>
            <TableHead>Integrity</TableHead>
            <TableHead className="pr-4">Classification</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ item, incident, locked }) => {
            const selected = item.id === selectedId;
            const type = EVIDENCE_TYPE_META[item.type];
            return (
              <TableRow
                key={item.id}
                onClick={() => onSelect(item.id)}
                data-state={selected ? "selected" : undefined}
                className="cursor-pointer"
              >
                <TableCell className="pl-4">
                  <div className="flex items-center gap-2.5">
                    <TypeTile type={item.type} locked={locked} />
                    <div className="min-w-0">
                      <button
                        type="button"
                        aria-current={selected ? "true" : undefined}
                        aria-label={`Open ${item.id}${locked ? ", restricted" : `, ${item.title}`}`}
                        className="tnum rounded font-mono text-[13px] font-medium hover:underline"
                      >
                        {item.id}
                      </button>
                      <p className="max-w-[13rem] truncate text-xs text-muted-foreground @3xl:max-w-[16rem] @7xl:hidden">
                        {locked ? "Restricted item" : item.title}
                      </p>
                      <p className="tnum font-mono text-[11px] text-subtle @3xl:hidden">
                        {item.incidentId}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden @3xl:table-cell">
                  <Link
                    href={`/control/incidents?id=${item.incidentId}`}
                    onClick={(e) => e.stopPropagation()}
                    title={incident?.title}
                    className="tnum rounded font-mono text-xs text-primary hover:underline"
                  >
                    {item.incidentId}
                  </Link>
                </TableCell>
                <TableCell className="hidden @7xl:table-cell">
                  {type.label}
                </TableCell>
                <TableCell className="hidden max-w-[18rem] @7xl:table-cell">
                  {locked ? (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Lock aria-hidden className="size-3.5" /> Restricted item
                    </span>
                  ) : (
                    <span className="block truncate font-medium">
                      {item.title}
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden @[68rem]:table-cell">
                  {locked ? (
                    <span className="text-muted-foreground">Restricted</span>
                  ) : (
                    <>
                      <span className="block max-w-[13rem] truncate font-medium">
                        {item.uploadedByName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {ROLE_LABEL[item.uploadedByRole]} ·{" "}
                        {EVIDENCE_SOURCE_LABEL[item.source]}
                      </span>
                    </>
                  )}
                </TableCell>
                <TableCell className="hidden @[92rem]:table-cell">
                  <Stamp at={item.capturedAt} />
                </TableCell>
                <TableCell className="hidden @4xl:table-cell">
                  <Stamp at={item.submittedAt} />
                </TableCell>
                <TableCell>
                  <IntegrityChip value={item.integrity} />
                </TableCell>
                <TableCell className="pr-4">
                  <ClassificationChip value={item.classification} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Panel>
  );
}

function EvidenceCards({
  rows,
  selectedId,
  onSelect,
}: {
  rows: Row[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-2 @xl:hidden">
      {rows.map(({ item, locked }) => {
        const selected = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "block w-full rounded-xl border bg-card p-3 text-left shadow-card transition-colors hover:border-input",
                selected ? "border-primary/60 bg-accent/60" : "border-border",
              )}
            >
              <span className="flex items-start gap-3">
                <TypeTile type={item.type} locked={locked} />
                <span className="min-w-0 flex-1">
                  <span className="tnum block font-mono text-[13px] font-medium">
                    {item.id}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-sm break-words",
                      locked ? "text-muted-foreground" : "font-medium",
                    )}
                  >
                    {locked ? "Restricted item" : item.title}
                  </span>
                  <span className="tnum mt-1 block font-mono text-xs break-all text-muted-foreground">
                    {item.incidentId}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {EVIDENCE_TYPE_META[item.type].label} ·{" "}
                    {EVIDENCE_SOURCE_LABEL[item.source]} · submitted{" "}
                    <span className="tnum">{stamp(item.submittedAt)}</span>
                  </span>
                </span>
              </span>
              <span className="mt-2.5 flex flex-wrap gap-1.5">
                <IntegrityChip value={item.integrity} />
                <ClassificationChip value={item.classification} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function EvidenceRegister() {
  const all = useDemoStore((s) => s.evidence);
  const incidents = useIncidents();
  const { can } = useSession();
  const [selectedId, setSelectedId] = useUrlParam("id");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<EvidenceType | "all">("all");
  const [classification, setClassification] = useState<
    EvidenceClassification | "all"
  >("all");
  const [integrity, setIntegrity] = useState<EvidenceIntegrity | "all">("all");
  const [source, setSource] = useState<Evidence["source"] | "all">("all");
  const canRestricted = can("evidence.restricted");

  const incidentById = useMemo(
    () => new Map(incidents.map((i) => [i.id, i])),
    [incidents],
  );

  const rows = useMemo<Row[]>(() => {
    const term = query.trim().toLowerCase();
    return all
      .filter((item) => {
        if (type !== "all" && item.type !== type) return false;
        if (classification !== "all" && item.classification !== classification)
          return false;
        if (integrity !== "all" && item.integrity !== integrity) return false;
        if (source !== "all" && item.source !== source) return false;
        if (!term) return true;
        const locked = item.classification === "restricted" && !canRestricted;
        const incident = incidentById.get(item.incidentId);
        // A restricted title is not searchable by a role that may not read it.
        const haystack = [
          item.id,
          item.incidentId,
          incident?.title ?? "",
          incident?.location.area ?? "",
          locked ? "" : item.title,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => b.submittedAt - a.submittedAt)
      .map((item) => ({
        item,
        incident: incidentById.get(item.incidentId),
        locked: item.classification === "restricted" && !canRestricted,
      }));
  }, [
    all,
    query,
    type,
    classification,
    integrity,
    source,
    canRestricted,
    incidentById,
  ]);

  const stats = useMemo(
    () => ({
      total: all.length,
      incidents: new Set(all.map((e) => e.incidentId)).size,
      verified: all.filter((e) => e.integrity === "verified").length,
      pending: all.filter((e) => e.integrity === "pending").length,
      flagged: all.filter((e) => e.integrity === "flagged").length,
      restricted: all.filter((e) => e.classification === "restricted").length,
    }),
    [all],
  );

  const selected = selectedId
    ? all.find((e) => e.id === selectedId)
    : undefined;
  const filtered =
    Boolean(query.trim()) ||
    type !== "all" ||
    classification !== "all" ||
    integrity !== "all" ||
    source !== "all";
  const clearFilters = () => {
    setQuery("");
    setType("all");
    setClassification("all");
    setIntegrity("all");
    setSource("all");
  };
  const close = () => setSelectedId(null);

  const pane = selected ? (
    <EvidenceDetail
      key={selected.id}
      evidence={selected}
      incident={incidentById.get(selected.incidentId)}
      onClose={close}
    />
  ) : (
    <PaneFrame eyebrow={selectedId} title="Evidence not found" onClose={close}>
      <BlankState
        icon={FileSearch}
        title="No evidence item has this reference"
        description="It may belong to an earlier demonstration session. Choose an item from the register."
      />
    </PaneFrame>
  );

  return (
    <RecordSplit
      open={Boolean(selectedId)}
      onClose={close}
      label="Evidence record"
      pane={pane}
    >
      <PageContainer width="full" className="@container">
        <PageHeader
          title="Digital evidence"
          description="Every item is stored exactly as it was received. Each view, export request and refused attempt is written to its access history. Originals cannot be edited or deleted."
        />

        <div className="mb-5 grid grid-cols-2 gap-3 @4xl:grid-cols-4">
          <StatCard
            label="Items on record"
            value={stats.total}
            icon={FolderLock}
            hint={`Across ${stats.incidents} incidents`}
          />
          <StatCard
            label="Integrity verified"
            value={stats.verified}
            icon={ShieldCheck}
            tone="resolved"
            hint="Digest recorded"
          />
          <StatCard
            label="Needs attention"
            value={stats.pending + stats.flagged}
            icon={ShieldAlert}
            tone={
              stats.flagged > 0
                ? "critical"
                : stats.pending > 0
                  ? "medium"
                  : undefined
            }
            hint={`${stats.pending} pending · ${stats.flagged} flagged`}
          />
          <StatCard
            label="Restricted"
            value={stats.restricted}
            icon={Lock}
            hint="Protected persons"
          />
        </div>

        <div
          role="search"
          aria-label="Filter evidence"
          className="mb-3 flex flex-wrap items-center gap-2"
        >
          <SearchField
            value={query}
            onChange={setQuery}
            label="Search evidence by incident, evidence ID or title"
            placeholder="Search incident or evidence ID"
            className="w-full @2xl:w-72"
          />
          <FilterSelect
            label="Type"
            value={type}
            onChange={setType}
            allLabel="All types"
            options={EVIDENCE_TYPES.map((value) => ({
              value,
              label: EVIDENCE_TYPE_META[value].label,
            }))}
            className="w-[calc(50%-0.25rem)] @2xl:w-auto"
          />
          <FilterSelect
            label="Classification"
            value={classification}
            onChange={setClassification}
            allLabel="All classifications"
            options={CLASSIFICATIONS.map((value) => ({
              value,
              label: CLASSIFICATION_META[value].label,
            }))}
            className="w-[calc(50%-0.25rem)] @2xl:w-auto"
          />
          <FilterSelect
            label="Integrity"
            value={integrity}
            onChange={setIntegrity}
            allLabel="Any integrity state"
            options={INTEGRITY_STATES.map((value) => ({
              value,
              label: INTEGRITY_META[value].label,
            }))}
            className="w-[calc(50%-0.25rem)] @2xl:w-auto"
          />
          <FilterSelect
            label="Source"
            value={source}
            onChange={setSource}
            allLabel="All sources"
            options={EVIDENCE_SOURCES.map((value) => ({
              value,
              label: EVIDENCE_SOURCE_LABEL[value],
            }))}
            className="w-[calc(50%-0.25rem)] @2xl:w-auto"
          />
          {filtered && (
            <Button variant="ghost" size="lg" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          <p
            role="status"
            className="tnum ml-auto text-xs text-muted-foreground"
          >
            {rows.length} of {all.length} items
          </p>
        </div>

        {all.length === 0 ? (
          <Panel>
            <EmptyState
              icon={FolderLock}
              title="No evidence on record"
              description="Photos, video, audio and documents appear here as soon as a citizen, an officer or an operator adds them to an incident."
            />
          </Panel>
        ) : rows.length === 0 ? (
          <Panel>
            <BlankState
              icon={FileSearch}
              title="No evidence matches these filters"
              description="Widen the filters or search by a different incident or evidence ID."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          </Panel>
        ) : (
          <>
            <EvidenceTable
              rows={rows}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <EvidenceCards
              rows={rows}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </>
        )}

        {!canRestricted && stats.restricted > 0 && (
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Restricted items stay listed so the record is complete, but their
            titles and contents are hidden from your role. Attempts to open them
            are logged.
          </p>
        )}
      </PageContainer>
    </RecordSplit>
  );
}

export function EvidenceScreen() {
  const { can } = useSession();
  if (!can("evidence.view")) {
    return (
      <PageContainer>
        <PageHeader title="Digital evidence" />
        <Panel>
          <RestrictedState
            title="Evidence centre is restricted"
            description="Your role does not permit access."
          />
        </Panel>
      </PageContainer>
    );
  }
  return <EvidenceRegister />;
}
