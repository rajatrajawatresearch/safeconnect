"use client";

import { Info, Tags } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { BlankState } from "@/components/shared/states";
import { SeverityDot, ToneChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CATEGORY_GROUP_LABEL,
  PRIORITIES,
  PRIORITY_META,
} from "@/config/incident";
import { useIsMd } from "@/hooks/use-mounted";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type {
  CategoryGroup,
  IncidentCategory,
  IncidentPriority,
} from "@/types";
import { AGENCY_LABEL, plural } from "./admin-meta";
import {
  FilterSelect,
  Notice,
  SavingMark,
  SearchField,
  useKeyedAction,
  type Option,
} from "./admin-ui";

type ShowFilter = "all" | "enabled" | "disabled" | "unavailable";

const GROUPS = Object.keys(CATEGORY_GROUP_LABEL) as CategoryGroup[];

const GROUP_OPTIONS: Option<CategoryGroup | "all">[] = [
  { value: "all", label: "All groups" },
  ...GROUPS.map((group) => ({
    value: group,
    label: CATEGORY_GROUP_LABEL[group],
  })),
];

const SHOW_OPTIONS: Option<ShowFilter>[] = [
  { value: "all", label: "All categories" },
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
  { value: "unavailable", label: "Not available to citizens" },
];

interface RowHandlers {
  isPending: (key: string) => boolean;
  onEnabled: (category: IncidentCategory, enabled: boolean) => void;
  onVisible: (category: IncidentCategory, visible: boolean) => void;
  onPriority: (category: IncidentCategory, priority: IncidentPriority) => void;
}

function CategoryIdentity({ category }: { category: IncidentCategory }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-inset",
          category.enabled ? "text-foreground" : "text-subtle",
        )}
      >
        <CategoryIcon categoryId={category.id} />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-medium whitespace-normal",
            !category.enabled && "text-muted-foreground",
          )}
        >
          {category.label}
        </p>
        <ul
          aria-label="Responding agencies"
          className="mt-1.5 flex flex-wrap gap-1"
        >
          {category.agencies.map((agency) => (
            <li key={agency}>
              <ToneChip tone="neutral" variant="outline">
                {AGENCY_LABEL[agency]}
              </ToneChip>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PrioritySelect({
  category,
  handlers,
  className,
}: {
  category: IncidentCategory;
  handlers: RowHandlers;
  className?: string;
}) {
  return (
    <Select
      value={category.defaultPriority}
      disabled={handlers.isPending(`${category.id}:priority`)}
      onValueChange={(value) =>
        handlers.onPriority(category, value as IncidentPriority)
      }
    >
      <SelectTrigger
        aria-label={`Default priority for ${category.label}`}
        className={cn("w-36", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {PRIORITIES.map((priority) => (
          <SelectItem key={priority} value={priority}>
            <SeverityDot tone={PRIORITY_META[priority].tone} />
            <span className="tnum text-muted-foreground">{priority}</span>
            {PRIORITY_META[priority].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function VisibleSwitch({
  category,
  handlers,
}: {
  category: IncidentCategory;
  handlers: RowHandlers;
}) {
  return (
    <Switch
      aria-label={`Show ${category.label} to citizens`}
      checked={category.citizenVisible}
      disabled={
        !category.enabled || handlers.isPending(`${category.id}:visible`)
      }
      onCheckedChange={(checked) => handlers.onVisible(category, checked)}
    />
  );
}

function EnabledSwitch({
  category,
  handlers,
}: {
  category: IncidentCategory;
  handlers: RowHandlers;
}) {
  return (
    <Switch
      aria-label={`Enable ${category.label}`}
      checked={category.enabled}
      disabled={handlers.isPending(`${category.id}:enabled`)}
      onCheckedChange={(checked) => handlers.onEnabled(category, checked)}
    />
  );
}

export function CategoriesScreen() {
  const params = useSearchParams();
  const categories = useDemoStore((s) => s.categories);
  const { actor } = useSession();
  const isMd = useIsMd();

  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<CategoryGroup | "all">("all");
  const [show, setShow] = useState<ShowFilter>(() => {
    const value = params.get("show");
    return SHOW_OPTIONS.some((o) => o.value === value)
      ? (value as ShowFilter)
      : "all";
  });

  const update = useKeyedAction(
    async (id: string, patch: Partial<IncidentCategory>, message: string) => {
      await services.admin.updateCategory(id, patch, actor);
      return message;
    },
    { success: (message) => message },
  );

  const handlers: RowHandlers = {
    isPending: update.isPending,
    onEnabled: (category, enabled) =>
      void update.run(
        `${category.id}:enabled`,
        category.id,
        { enabled },
        `${category.short} ${enabled ? "enabled" : "disabled"}`,
      ),
    onVisible: (category, citizenVisible) =>
      void update.run(
        `${category.id}:visible`,
        category.id,
        { citizenVisible },
        `${category.short} ${citizenVisible ? "shown to" : "hidden from"} citizens`,
      ),
    onPriority: (category, defaultPriority) =>
      void update.run(
        `${category.id}:priority`,
        category.id,
        { defaultPriority },
        `${category.short} now defaults to ${defaultPriority}`,
      ),
  };

  const sections = useMemo(() => {
    const term = search.trim().toLowerCase();
    return GROUPS.filter((g) => group === "all" || g === group)
      .map((g) => {
        const all = categories.filter((c) => c.group === g);
        const rows = all.filter((c) => {
          if (show === "enabled" && !c.enabled) return false;
          if (show === "disabled" && c.enabled) return false;
          if (show === "unavailable" && c.enabled && c.citizenVisible)
            return false;
          if (!term) return true;
          return [c.label, c.short, ...c.agencies.map((a) => AGENCY_LABEL[a])]
            .join(" ")
            .toLowerCase()
            .includes(term);
        });
        return {
          group: g,
          rows,
          total: all.length,
          enabled: all.filter((c) => c.enabled).length,
          hidden: all.filter((c) => c.enabled && !c.citizenVisible).length,
        };
      })
      .filter((section) => section.rows.length > 0);
  }, [categories, group, search, show]);

  const enabledCount = categories.filter((c) => c.enabled).length;
  const hiddenCount = categories.filter(
    (c) => c.enabled && !c.citizenVisible,
  ).length;
  const filtered = search.trim() !== "" || group !== "all" || show !== "all";
  const clearFilters = () => {
    setSearch("");
    setGroup("all");
    setShow("all");
  };

  return (
    <PageContainer>
      <PageHeader
        title="Incident categories"
        description="What can be reported, the priority it starts at, and which agencies respond. Changes save as you make them."
        actions={<SavingMark show={update.anyPending} />}
      />

      <Notice icon={Info}>
        Disabling a category removes it from the citizen report picker.
        Incidents already raised keep their category. A category that is enabled
        but hidden from citizens stays available to staff.
      </Notice>

      <div className="mt-4 mb-3 grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
        <SearchField
          className="col-span-2 md:col-span-1"
          label="Search categories or agencies"
          placeholder="Search category or agency…"
          value={search}
          onChange={setSearch}
        />
        <FilterSelect
          label="Filter by group"
          value={group}
          onChange={setGroup}
          options={GROUP_OPTIONS}
        />
        <FilterSelect
          label="Filter by availability"
          value={show}
          onChange={setShow}
          options={SHOW_OPTIONS}
        />
      </div>

      <div className="mb-3 flex min-h-7 flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
        <p role="status">
          <span className="tnum">
            {enabledCount} of{" "}
            {plural(categories.length, "category", "categories")}
          </span>{" "}
          enabled
          {hiddenCount > 0 && (
            <>
              {" "}
              · <span className="tnum">{hiddenCount}</span> hidden from citizens
            </>
          )}
        </p>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {sections.length === 0 ? (
        <Panel>
          <BlankState
            icon={Tags}
            title={
              categories.length === 0
                ? "No incident categories are defined"
                : "No categories match these filters"
            }
            description={
              categories.length === 0
                ? "Reset the demo from Settings to restore the starting categories."
                : "Try a different name or agency, or widen the group and availability filters."
            }
            action={
              filtered && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sections.map((section) => {
            const headingId = `category-group-${section.group}`;
            return (
              <Panel
                key={section.group}
                aria-labelledby={headingId}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border/70 px-4 py-3">
                  <h2 id={headingId} className="text-sm font-semibold">
                    {CATEGORY_GROUP_LABEL[section.group]}
                  </h2>
                  <p className="tnum text-xs text-muted-foreground">
                    {section.enabled} of {section.total} enabled
                    {section.hidden > 0 &&
                      ` · ${section.hidden} hidden from citizens`}
                  </p>
                </div>

                {isMd ? (
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
                        <th scope="col" className="px-4 py-2 font-medium">
                          Category and responding agencies
                        </th>
                        <th scope="col" className="w-44 px-2 py-2 font-medium">
                          Default priority
                        </th>
                        <th scope="col" className="w-36 px-2 py-2 font-medium">
                          Shown to citizens
                        </th>
                        <th
                          scope="col"
                          className="w-24 py-2 pr-4 pl-2 font-medium"
                        >
                          Enabled
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {section.rows.map((category) => (
                        <tr key={category.id}>
                          <td className="px-4 py-3 align-top">
                            <CategoryIdentity category={category} />
                          </td>
                          <td className="px-2 py-3 align-top">
                            <PrioritySelect
                              category={category}
                              handlers={handlers}
                            />
                          </td>
                          <td className="px-2 py-3 pt-4.5 align-top">
                            <VisibleSwitch
                              category={category}
                              handlers={handlers}
                            />
                          </td>
                          <td className="py-3 pt-4.5 pr-4 pl-2 align-top">
                            <EnabledSwitch
                              category={category}
                              handlers={handlers}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {section.rows.map((category) => (
                      <li
                        key={category.id}
                        className="grid grid-cols-1 gap-3 p-4"
                      >
                        <CategoryIdentity category={category} />
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[13px] text-muted-foreground">
                            Default priority
                          </span>
                          <PrioritySelect
                            category={category}
                            handlers={handlers}
                            className="data-[size=default]:h-9"
                          />
                        </div>
                        <div className="flex min-h-9 items-center justify-between gap-3">
                          <span className="text-[13px] text-muted-foreground">
                            Shown to citizens
                          </span>
                          <VisibleSwitch
                            category={category}
                            handlers={handlers}
                          />
                        </div>
                        <div className="flex min-h-9 items-center justify-between gap-3">
                          <span className="text-[13px] text-muted-foreground">
                            Enabled
                          </span>
                          <EnabledSwitch
                            category={category}
                            handlers={handlers}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
