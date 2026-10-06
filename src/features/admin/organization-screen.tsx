"use client";

import {
  Building2,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Landmark,
  Layers,
  Lock,
  Map as MapIcon,
  Network,
  SearchX,
  Truck,
  User,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import {
  Field,
  PageContainer,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/shared/page";
import { BlankState } from "@/components/shared/states";
import { ToneChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { deployment } from "@/config/deployment";
import { DISTRICTS, ORG_TREE, STATIONS } from "@/data/demo/geo";
import { OFFICERS } from "@/data/demo/people";
import { useIsLg } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import type {
  District,
  Officer,
  OrgLevel,
  StaffUser,
  Station,
  Unit,
} from "@/types";
import { ORG_LEVEL_LABEL, plural } from "./admin-meta";
import { Notice, SearchField } from "./admin-ui";

type NodeLevel = OrgLevel | "officer";

interface TreeNode {
  id: string;
  parentId: string | null;
  level: NodeLevel;
  name: string;
  code: string;
  headTitle?: string;
  headName?: string;
  /** Second line in the tree. */
  caption: string;
  children: TreeNode[];
  district?: District;
  station?: Station;
  unit?: Unit;
  officer?: Officer;
}

const LEVEL_ICON: Record<NodeLevel, LucideIcon> = {
  platform: Layers,
  state: Landmark,
  commissionerate: MapIcon,
  district: MapIcon,
  division: Network,
  station: Building2,
  unit: Truck,
  officer: User,
};

/** Counted in the detail panel, in hierarchy order. */
const COUNTED_LEVELS: { level: NodeLevel; one: string; many: string }[] = [
  { level: "state", one: "State", many: "States" },
  {
    level: "commissionerate",
    one: "Commissionerate",
    many: "Commissionerates",
  },
  { level: "district", one: "District", many: "Districts" },
  { level: "division", one: "Division", many: "Divisions" },
  { level: "station", one: "Police station", many: "Police stations" },
  { level: "unit", one: "Unit", many: "Units" },
  { level: "officer", one: "Officer", many: "Officers" },
];

const DEFAULT_EXPANDED = ORG_TREE.filter((o) =>
  ["platform", "state", "commissionerate", "division"].includes(o.level),
).map((o) => o.id);

/**
 * Joins the organisation records to the things that hang off a station. Stations are matched by
 * code, units by station, officers by unit — so a different deployment only needs different data.
 */
function buildTree(units: Unit[]) {
  const byId = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const org of ORG_TREE) {
    byId.set(org.id, {
      id: org.id,
      parentId: org.parentId,
      level: org.level,
      name: org.name,
      code: org.code,
      headTitle: org.headTitle,
      headName: org.headName,
      caption:
        org.headTitle && org.headName
          ? `${org.headTitle} · ${org.headName}`
          : "Deployment root",
      children: [],
    });
  }

  for (const org of ORG_TREE) {
    const node = byId.get(org.id) as TreeNode;
    const parent = org.parentId ? byId.get(org.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);

    if (org.level === "commissionerate" || org.level === "district") {
      const suffix = org.code.split("-").pop()?.toLowerCase();
      node.district = DISTRICTS.find((d) => d.id === `d-${suffix}`);
    }
    if (org.level !== "station") continue;

    const station = STATIONS.find((s) => s.code === org.code);
    node.station = station;
    if (!station) continue;

    const placed = new Set<string>();
    for (const unit of units.filter((u) => u.stationId === station.id)) {
      const lead = OFFICERS.find((o) => o.id === unit.officerId);
      const unitNode: TreeNode = {
        id: `unit-${unit.id}`,
        parentId: node.id,
        level: "unit",
        name: unit.callSign,
        code: unit.vehicleNo,
        headTitle: "Officer in charge",
        headName: lead?.name,
        caption: lead ? `${unit.vehicle} · ${lead.name}` : unit.vehicle,
        children: [],
        unit,
      };
      const crew = OFFICERS.filter(
        (o) => o.id === unit.officerId || o.unitId === unit.id,
      );
      for (const officer of crew) {
        placed.add(officer.id);
        const officerNode: TreeNode = {
          id: `officer-${officer.id}`,
          parentId: unitNode.id,
          level: "officer",
          name: officer.name,
          code: officer.badgeNo,
          caption: officer.rank,
          children: [],
          officer,
        };
        unitNode.children.push(officerNode);
        byId.set(officerNode.id, officerNode);
      }
      node.children.push(unitNode);
      byId.set(unitNode.id, unitNode);
    }
    // Station staff who are not attached to a unit sit directly under the station.
    for (const officer of OFFICERS) {
      if (officer.stationId !== station.id || placed.has(officer.id)) continue;
      const officerNode: TreeNode = {
        id: `officer-${officer.id}`,
        parentId: node.id,
        level: "officer",
        name: officer.name,
        code: officer.badgeNo,
        caption: `${officer.rank} · station staff`,
        children: [],
        officer,
      };
      node.children.push(officerNode);
      byId.set(officerNode.id, officerNode);
    }
  }
  return { roots, byId };
}

function countDescendants(node: TreeNode, into: Map<NodeLevel, number>) {
  for (const child of node.children) {
    into.set(child.level, (into.get(child.level) ?? 0) + 1);
    countDescendants(child, into);
  }
  return into;
}

const matches = (node: TreeNode, term: string) =>
  [node.name, node.code, node.headName, node.caption, node.station?.area].some(
    (part) => part?.toLowerCase().includes(term),
  );

interface TreeState {
  selectedId: string;
  /** `null` when not searching; otherwise the only nodes that may be shown. */
  visible: Set<string> | null;
  isOpen: (id: string) => boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function TreeBranch({
  nodes,
  nested,
  state,
}: {
  nodes: TreeNode[];
  nested?: boolean;
  state: TreeState;
}) {
  const shown = state.visible
    ? nodes.filter((n) => state.visible?.has(n.id))
    : nodes;
  if (shown.length === 0) return null;
  return (
    <ul
      className={cn(
        nested &&
          "ml-[13px] border-l border-border/70 pl-0.5 sm:ml-[15px] sm:pl-1.5",
      )}
    >
      {shown.map((node) => {
        const Icon = LEVEL_ICON[node.level];
        const hasChildren = node.children.length > 0;
        const open = hasChildren && state.isOpen(node.id);
        const selected = state.selectedId === node.id;
        return (
          <li key={node.id}>
            <div
              className={cn(
                "flex items-center rounded-lg",
                selected
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/70",
              )}
            >
              {hasChildren ? (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`}
                  onClick={() => state.onToggle(node.id)}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ChevronRight
                    aria-hidden
                    className={cn(
                      "size-4 transition-transform",
                      open && "rotate-90",
                    )}
                  />
                </button>
              ) : (
                <span aria-hidden className="size-8 shrink-0" />
              )}
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => state.onSelect(node.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1.5 pr-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0",
                    selected ? "text-primary" : "text-subtle",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-medium",
                      node.level === "unit" && "tnum font-mono text-[13px]",
                    )}
                  >
                    {node.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    <span className="sr-only">
                      {ORG_LEVEL_LABEL[node.level]}.{" "}
                    </span>
                    {node.caption}
                  </span>
                </span>
                <span className="hidden shrink-0 font-mono text-[11px] text-subtle sm:block">
                  {node.code}
                </span>
              </button>
            </div>
            {open && <TreeBranch nodes={node.children} nested state={state} />}
          </li>
        );
      })}
    </ul>
  );
}

function NodeDetail({
  node,
  chain,
  staff,
  onSelect,
}: {
  node: TreeNode;
  chain: TreeNode[];
  staff: StaffUser[];
  onSelect: (id: string) => void;
}) {
  const counts = countDescendants(node, new Map());
  const contained = COUNTED_LEVELS.filter((c) => counts.has(c.level));
  const loadedStations = counts.get("station") ?? 0;
  const posted = node.station
    ? staff.filter((u) => u.stationId === node.station?.id)
    : [];

  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <p className="text-xs text-muted-foreground">Reports to</p>
        {chain.length === 0 ? (
          <p className="mt-1 text-sm">
            Top of the hierarchy. Nothing sits above the platform.
          </p>
        ) : (
          <ol className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
            {chain.map((ancestor, index) => (
              <Fragment key={ancestor.id}>
                {index > 0 && (
                  <ChevronRight aria-hidden className="size-3.5 text-subtle" />
                )}
                <li>
                  <button
                    type="button"
                    onClick={() => onSelect(ancestor.id)}
                    className="rounded-md font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {ancestor.name}
                  </button>
                </li>
              </Fragment>
            ))}
          </ol>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Level">{ORG_LEVEL_LABEL[node.level]}</Field>
        <Field
          label={
            node.level === "officer"
              ? "Badge number"
              : node.level === "unit"
                ? "Vehicle registration"
                : "Code"
          }
        >
          <span className="tnum font-mono text-[13px]">{node.code}</span>
        </Field>
        {node.headTitle && (
          <Field label={node.headTitle} className="col-span-2">
            {node.headName ?? "Not assigned"}
          </Field>
        )}
        {node.district && (
          <>
            <Field label="Stations in the district">
              <span className="tnum">{node.district.stations}</span>
            </Field>
            <Field label="Population served">{node.district.population}</Field>
          </>
        )}
        {node.station && (
          <>
            <Field label="Area">{node.station.area}</Field>
            <Field label="Front desk">
              <span className="tnum">{node.station.phoneMasked}</span>
            </Field>
          </>
        )}
        {node.unit && (
          <>
            <Field label="Vehicle">{node.unit.vehicle}</Field>
            <Field label="Crew">
              <span className="tnum">{node.unit.crew}</span>
            </Field>
          </>
        )}
        {node.officer && (
          <>
            <Field label="Rank">{node.officer.rank}</Field>
            <Field label="Contact">
              <span className="tnum">{node.officer.phoneMasked}</span>
            </Field>
          </>
        )}
      </dl>

      <div>
        <p className="text-xs text-muted-foreground">Contains</p>
        {contained.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {node.level === "officer"
              ? "An officer is the last level of the hierarchy."
              : `Nothing is recorded beneath this ${ORG_LEVEL_LABEL[node.level].toLowerCase()} in the demo dataset.`}
          </p>
        ) : (
          <dl className="mt-1.5 grid grid-cols-2 gap-2">
            {contained.map(({ level, one, many }) => {
              const count = counts.get(level) ?? 0;
              return (
                <div
                  key={level}
                  className="rounded-lg border border-border/70 bg-inset px-3 py-2"
                >
                  <dt className="text-xs text-muted-foreground">
                    {count === 1 ? one : many}
                  </dt>
                  <dd className="tnum text-lg leading-tight font-semibold">
                    {count}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
        {node.district && loadedStations < node.district.stations && (
          <p className="mt-2 text-xs text-muted-foreground">
            {loadedStations === 0
              ? "No stations"
              : `${loadedStations} of ${node.district.stations} stations`}{" "}
            for this {ORG_LEVEL_LABEL[node.level].toLowerCase()} are loaded in
            the demo dataset.
          </p>
        )}
      </div>

      {node.station && (
        <div>
          <p className="text-xs text-muted-foreground">
            Staff accounts posted here
          </p>
          {posted.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No staff accounts are posted to this station.
            </p>
          ) : (
            <ul className="mt-1 grid gap-1 text-sm">
              {posted.map((user) => (
                <li key={user.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate font-medium">
                    {user.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {user.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function LevelChip({ level }: { level: NodeLevel }) {
  const Icon = LEVEL_ICON[level];
  return (
    <ToneChip tone="neutral" variant="outline">
      <Icon aria-hidden className="size-3" />
      {ORG_LEVEL_LABEL[level]}
    </ToneChip>
  );
}

export function OrganizationScreen() {
  const units = useDemoStore((s) => s.units);
  const staff = useDemoStore((s) => s.staff);
  const isLg = useIsLg();

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<readonly string[]>(DEFAULT_EXPANDED);
  const [selectedId, setSelectedId] = useState("org-ahd");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { roots, byId } = useMemo(() => buildTree(units), [units]);
  const totals = useMemo(() => {
    const counts = new Map<NodeLevel, number>();
    for (const root of roots) countDescendants(root, counts);
    return counts;
  }, [roots]);

  const term = search.trim().toLowerCase();
  const found = useMemo(() => {
    if (!term) return null;
    const visible = new Set<string>();
    const forcedOpen = new Set<string>();
    let hits = 0;
    const showSubtree = (node: TreeNode) => {
      visible.add(node.id);
      node.children.forEach(showSubtree);
    };
    for (const node of byId.values()) {
      if (!matches(node, term)) continue;
      hits += 1;
      showSubtree(node);
      let parent = node.parentId ? byId.get(node.parentId) : undefined;
      while (parent) {
        visible.add(parent.id);
        forcedOpen.add(parent.id);
        parent = parent.parentId ? byId.get(parent.parentId) : undefined;
      }
    }
    return { visible, forcedOpen, hits };
  }, [byId, term]);

  const selected = byId.get(selectedId) ?? roots[0];
  const chain = useMemo(() => {
    const out: TreeNode[] = [];
    let parent = selected?.parentId ? byId.get(selected.parentId) : undefined;
    while (parent) {
      out.unshift(parent);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return out;
  }, [byId, selected]);

  const onSelect = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };
  const treeState: TreeState = {
    selectedId: selected?.id ?? "",
    visible: found?.visible ?? null,
    isOpen: (id) => expanded.includes(id) || Boolean(found?.forcedOpen.has(id)),
    onToggle: (id) =>
      setExpanded((current) =>
        current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id],
      ),
    onSelect,
  };

  const summary = COUNTED_LEVELS.filter((c) => totals.has(c.level))
    .map((c) => {
      const count = totals.get(c.level) ?? 0;
      return `${count} ${(count === 1 ? c.one : c.many).toLowerCase()}`;
    })
    .join(" · ");
  const exampleUnit = units[0]?.callSign;

  return (
    <PageContainer>
      <PageHeader
        title="Organisation"
        description="The command hierarchy the platform runs on, from the platform down to each officer. Roles are scoped against it and incidents are routed through it."
      />

      <Panel className="mb-4">
        <PanelHeader
          title="Deployment profile"
          description="What makes this installation this organisation's. Set in configuration, not in code."
        />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 md:grid-cols-5">
          <Field label="Product">{deployment.productName}</Field>
          <Field label="Organisation">{deployment.orgName}</Field>
          <Field label="State">
            {deployment.stateName}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {deployment.stateCode}
            </span>
          </Field>
          <Field label="Primary city">{deployment.primaryCity}</Field>
          <Field label="Reference prefix">
            <span className="font-mono text-[13px]">{deployment.idPrefix}</span>
            {exampleUnit && (
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                As in unit {exampleUnit}
              </span>
            )}
          </Field>
        </dl>
        <p className="border-t border-border/70 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
          Nothing in the interface is hard-coded to one police organisation.
          Names, the hierarchy below, reference prefixes and map defaults all
          come from this profile and the organisation data, so a new deployment
          for another state or agency is configuration plus seed data — not a
          rebuild.
        </p>
      </Panel>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel className="min-w-0">
          <PanelHeader
            title="Hierarchy"
            description={summary}
            className="items-center"
          />
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 p-3">
            <SearchField
              className="min-w-40 flex-1"
              label="Search the hierarchy"
              placeholder="Search name, code, head or call sign…"
              value={search}
              onChange={setSearch}
            />
            <Button
              variant="outline"
              size="lg"
              disabled={Boolean(term)}
              onClick={() => setExpanded([...byId.keys()])}
            >
              <ChevronsUpDown aria-hidden />
              <span className="max-sm:sr-only">Expand all</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={Boolean(term)}
              onClick={() => setExpanded(roots.map((r) => r.id))}
            >
              <ChevronsDownUp aria-hidden />
              <span className="max-sm:sr-only">Collapse all</span>
            </Button>
          </div>
          {found && (
            <p
              role="status"
              className="border-b border-border/70 px-4 py-2 text-xs text-muted-foreground"
            >
              {found.hits === 0
                ? "No matches"
                : `${plural(found.hits, "match", "matches")} · shown with the levels above them`}
            </p>
          )}
          {found?.hits === 0 ? (
            <BlankState
              icon={SearchX}
              title="Nothing in the hierarchy matches"
              description="Search by a station, division, officer, badge number or unit call sign."
              action={
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <div className="p-2">
              <TreeBranch nodes={roots} state={treeState} />
            </div>
          )}
        </Panel>

        <div className="grid min-w-0 grid-cols-1 gap-4 lg:sticky lg:top-6">
          {selected && (
            <Panel className="hidden lg:block">
              <div className="border-b border-border/70 px-4 py-3">
                <LevelChip level={selected.level} />
                <h2
                  className={cn(
                    "mt-2 text-base font-semibold",
                    selected.level === "unit" && "tnum font-mono",
                  )}
                >
                  {selected.name}
                </h2>
              </div>
              <div className="p-4">
                <NodeDetail
                  node={selected}
                  chain={chain}
                  staff={staff}
                  onSelect={setSelectedId}
                />
              </div>
            </Panel>
          )}
          <Notice icon={Lock} title="Read-only by design">
            The hierarchy is loaded from the deployment&apos;s organisation
            data. It changes through a reviewed data update, not by editing it
            live, so this screen has no add or edit controls.
          </Notice>
        </div>
      </div>

      {selected && (
        <Sheet open={sheetOpen && !isLg} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] gap-0 rounded-t-2xl"
          >
            <SheetHeader>
              <SheetTitle
                className={cn(selected.level === "unit" && "font-mono")}
              >
                {selected.name}
              </SheetTitle>
              <SheetDescription>
                {ORG_LEVEL_LABEL[selected.level]}
              </SheetDescription>
            </SheetHeader>
            <div className="scroll-thin overflow-y-auto px-4 pb-6">
              <NodeDetail
                node={selected}
                chain={chain}
                staff={staff}
                onSelect={setSelectedId}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </PageContainer>
  );
}
