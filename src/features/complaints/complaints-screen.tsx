"use client";

import {
  ClipboardList,
  EyeOff,
  FileSearch,
  Hourglass,
  Inbox,
  CircleCheckBig,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import {
  BlankState,
  EmptyState,
  RestrictedState,
} from "@/components/shared/states";
import { StatCard } from "@/components/shared/stat-card";
import { ComplaintStatusChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  COMPLAINT_STATUS_META,
  COMPLAINT_STATUS_ORDER,
} from "@/config/incident";
import { STATIONS, stationById } from "@/data/demo/geo";
import { FilterSelect, SearchField } from "@/features/evidence/filters";
import { PaneFrame, RecordSplit } from "@/features/evidence/record-layout";
import { useUrlParam } from "@/features/evidence/use-url-param";
import { useCategoryLookup } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import type { Complaint, ComplaintKind, ComplaintStatus } from "@/types";
import { ComplaintDetail, KindChip } from "./complaint-detail";
import { COMPLAINT_KINDS, KIND_META, isOpenComplaint } from "./complaint-meta";

const stationShort = (id: string) =>
  stationById(id)?.name.replace(" Police Station", "") ?? "Unassigned";

function ComplaintTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: Complaint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const category = useCategoryLookup();
  return (
    <Panel className="hidden overflow-hidden @xl:block">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="bg-inset hover:bg-inset">
            <TableHead className="pl-4">Complaint</TableHead>
            <TableHead className="hidden @3xl:table-cell">Kind</TableHead>
            <TableHead className="hidden @7xl:table-cell">Category</TableHead>
            <TableHead className="hidden @[70rem]:table-cell">
              Station and department
            </TableHead>
            <TableHead className="hidden @4xl:table-cell">Submitted</TableHead>
            <TableHead className="pr-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((complaint) => {
            const selected = complaint.id === selectedId;
            return (
              <TableRow
                key={complaint.id}
                onClick={() => onSelect(complaint.id)}
                data-state={selected ? "selected" : undefined}
                className="cursor-pointer"
              >
                <TableCell className="max-w-[16rem] pl-4 @3xl:max-w-[22rem]">
                  <button
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    aria-label={`Open ${complaint.id}, ${complaint.title}`}
                    className="tnum rounded font-mono text-xs text-muted-foreground hover:underline"
                  >
                    {complaint.id}
                  </button>
                  <p className="truncate text-sm font-medium">
                    {complaint.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground @[70rem]:hidden">
                    {stationShort(complaint.stationId)} · {complaint.department}
                  </p>
                </TableCell>
                <TableCell className="hidden @3xl:table-cell">
                  <KindChip kind={complaint.kind} />
                </TableCell>
                <TableCell className="hidden @7xl:table-cell">
                  {category(complaint.categoryId)?.label ?? "Uncategorised"}
                </TableCell>
                <TableCell className="hidden @[70rem]:table-cell">
                  <span className="block font-medium">
                    {stationShort(complaint.stationId)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {complaint.department}
                  </span>
                </TableCell>
                <TableCell className="hidden @4xl:table-cell">
                  <time
                    dateTime={new Date(complaint.submittedAt).toISOString()}
                    className="tnum text-xs text-muted-foreground"
                  >
                    {formatDateTime(complaint.submittedAt)}
                  </time>
                </TableCell>
                <TableCell className="pr-4">
                  <ComplaintStatusChip status={complaint.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Panel>
  );
}

function ComplaintCards({
  rows,
  selectedId,
  onSelect,
}: {
  rows: Complaint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-2 @xl:hidden">
      {rows.map((complaint) => {
        const selected = complaint.id === selectedId;
        return (
          <li key={complaint.id}>
            <button
              type="button"
              onClick={() => onSelect(complaint.id)}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "block w-full rounded-xl border bg-card p-3 text-left shadow-card transition-colors hover:border-input",
                selected ? "border-primary/60 bg-accent/60" : "border-border",
              )}
            >
              <span className="tnum block font-mono text-xs break-all text-muted-foreground">
                {complaint.id}
              </span>
              <span className="mt-1 block text-sm font-medium break-words">
                {complaint.title}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {stationShort(complaint.stationId)} · {complaint.department} ·
                submitted{" "}
                <span className="tnum">
                  {formatDateTime(complaint.submittedAt)}
                </span>
              </span>
              <span className="mt-2.5 flex flex-wrap gap-1.5">
                <ComplaintStatusChip status={complaint.status} />
                <KindChip kind={complaint.kind} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ComplaintRegister() {
  const all = useDemoStore((s) => s.complaints);
  const [selectedId, setSelectedId] = useUrlParam("id");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ComplaintStatus | "all">("all");
  const [kind, setKind] = useState<ComplaintKind | "all">("all");
  const [department, setDepartment] = useState<string>("all");
  const [station, setStation] = useState<string>("all");

  const departments = useMemo(
    () => [...new Set(all.map((c) => c.department))].sort(),
    [all],
  );
  const stations = useMemo(() => {
    const used = new Set(all.map((c) => c.stationId));
    return STATIONS.filter((s) => used.has(s.id));
  }, [all]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return all
      .filter((c) => {
        if (status !== "all" && c.status !== status) return false;
        if (kind !== "all" && c.kind !== kind) return false;
        if (department !== "all" && c.department !== department) return false;
        if (station !== "all" && c.stationId !== station) return false;
        if (!term) return true;
        return `${c.id} ${c.title}`.toLowerCase().includes(term);
      })
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }, [all, query, status, kind, department, station]);

  const stats = useMemo(
    () => ({
      open: all.filter((c) => isOpenComplaint(c.status)).length,
      waiting: all.filter((c) => c.status === "info_required").length,
      tips: all.filter((c) => c.kind === "confidential_tip").length,
      done: all.filter((c) => !isOpenComplaint(c.status)).length,
    }),
    [all],
  );

  const selected = selectedId
    ? all.find((c) => c.id === selectedId)
    : undefined;
  const filtered =
    Boolean(query.trim()) ||
    status !== "all" ||
    kind !== "all" ||
    department !== "all" ||
    station !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setKind("all");
    setDepartment("all");
    setStation("all");
  };
  const close = () => setSelectedId(null);

  const pane = selected ? (
    <ComplaintDetail key={selected.id} complaint={selected} onClose={close} />
  ) : (
    <PaneFrame eyebrow={selectedId} title="Complaint not found" onClose={close}>
      <BlankState
        icon={FileSearch}
        title="No complaint has this reference"
        description="It may belong to an earlier demonstration session. Choose a complaint from the list."
      />
    </PaneFrame>
  );

  return (
    <RecordSplit
      open={Boolean(selectedId)}
      onClose={close}
      label="Complaint record"
      pane={pane}
    >
      <PageContainer width="full" className="@container">
        <PageHeader
          title="Complaints"
          description="Reports, emergency follow-ups and confidential tips sent from the citizen app. These are demonstration records, not FIRs or statutory filings."
        />

        <div className="mb-5 grid grid-cols-2 gap-3 @4xl:grid-cols-4">
          <StatCard
            label="Open"
            value={stats.open}
            icon={Inbox}
            hint="Still being handled"
          />
          <StatCard
            label="Waiting on the citizen"
            value={stats.waiting}
            icon={Hourglass}
            tone={stats.waiting > 0 ? "high" : undefined}
            hint="Information requested"
          />
          <StatCard
            label="Confidential tips"
            value={stats.tips}
            icon={EyeOff}
            hint="No identity stored"
          />
          <StatCard
            label="Resolved or closed"
            value={stats.done}
            icon={CircleCheckBig}
            tone="resolved"
            hint={`Of ${all.length} on record`}
          />
        </div>

        <div
          role="search"
          aria-label="Filter complaints"
          className="mb-3 flex flex-wrap items-center gap-2"
        >
          <SearchField
            value={query}
            onChange={setQuery}
            label="Search complaints by ID or title"
            placeholder="Search by ID or title"
            className="w-full @2xl:w-64"
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            allLabel="All statuses"
            options={COMPLAINT_STATUS_ORDER.map((value) => ({
              value,
              label: COMPLAINT_STATUS_META[value].label,
            }))}
            className="w-[calc(50%-0.25rem)] @2xl:w-auto"
          />
          <FilterSelect
            label="Kind"
            value={kind}
            onChange={setKind}
            allLabel="All kinds"
            options={COMPLAINT_KINDS.map((value) => ({
              value,
              label: KIND_META[value].label,
            }))}
            className="w-[calc(50%-0.25rem)] @2xl:w-auto"
          />
          <FilterSelect
            label="Department"
            value={department}
            onChange={setDepartment}
            allLabel="All departments"
            options={departments.map((value) => ({ value, label: value }))}
            className="w-[calc(50%-0.25rem)] @2xl:w-auto"
          />
          <FilterSelect
            label="Station"
            value={station}
            onChange={setStation}
            allLabel="All stations"
            options={stations.map((s) => ({
              value: s.id,
              label: s.name.replace(" Police Station", ""),
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
            {rows.length} of {all.length} complaints
          </p>
        </div>

        {all.length === 0 ? (
          <Panel>
            <EmptyState
              icon={ClipboardList}
              title="No complaints on record"
              description="Reports and tips sent from the citizen app appear here."
            />
          </Panel>
        ) : rows.length === 0 ? (
          <Panel>
            <BlankState
              icon={FileSearch}
              title="No complaints match these filters"
              description="Widen the filters or search by a different ID or title."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          </Panel>
        ) : (
          <>
            <ComplaintTable
              rows={rows}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <ComplaintCards
              rows={rows}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </>
        )}
      </PageContainer>
    </RecordSplit>
  );
}

export function ComplaintsScreen() {
  const { can } = useSession();
  if (!can("complaint.view")) {
    return (
      <PageContainer>
        <PageHeader title="Complaints" />
        <Panel>
          <RestrictedState
            title="Complaints are restricted"
            description="Your role does not permit access."
          />
        </Panel>
      </PageContainer>
    );
  }
  return <ComplaintRegister />;
}
