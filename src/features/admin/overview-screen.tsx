"use client";

import {
  ArrowRight,
  Building2,
  ChevronRight,
  CircleCheck,
  Plug,
  ShieldCheck,
  Tags,
  TriangleAlert,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/shared/page";
import { StatCard } from "@/components/shared/stat-card";
import { BlankState } from "@/components/shared/states";
import { ToneChip } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { PRIORITIES, type Tone } from "@/config/incident";
import { ORG_TREE } from "@/data/demo/geo";
import { OFFICERS } from "@/data/demo/people";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import {
  INTEGRATION_STATUSES,
  INTEGRATION_STATUS_META,
  STAFF_STATUSES,
  STAFF_STATUS_META,
  TRIGGER_META,
  plural,
} from "./admin-meta";
import { Notice } from "./admin-ui";

interface HealthCheck {
  key: string;
  ok: boolean;
  /** How firmly an open item asks for attention. */
  tone: Tone;
  title: string;
  detail: string;
  href: string;
  action: string;
}

/** "A, B, C and 2 more" — keeps a checklist line to one readable sentence. */
function listSome(names: string[], max = 3): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}

function TileLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}

function BreakdownRow({
  href,
  tone,
  label,
  count,
}: {
  href: string;
  tone: Tone;
  label: string;
  count: number;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 focus-visible:bg-muted/60"
      >
        <ToneChip tone={tone} dot>
          {label}
        </ToneChip>
        <span className="tnum ml-auto font-medium">{count}</span>
        <ChevronRight aria-hidden className="size-4 text-subtle" />
      </Link>
    </li>
  );
}

export function AdminOverviewScreen() {
  const staff = useDemoStore((s) => s.staff);
  const roles = useDemoStore((s) => s.roles);
  const units = useDemoStore((s) => s.units);
  const categories = useDemoStore((s) => s.categories);
  const rules = useDemoStore((s) => s.escalationRules);
  const integrations = useDemoStore((s) => s.integrations);
  const audit = useDemoStore((s) => s.audit);

  const counts = useMemo(() => {
    const byStatus = { active: 0, invited: 0, suspended: 0 };
    for (const user of staff) byStatus[user.status] += 1;
    const byIntegration = { placeholder: 0, sandbox: 0, disabled: 0 };
    for (const integration of integrations)
      byIntegration[integration.status] += 1;
    const active = staff.filter((u) => u.status === "active");
    return {
      byStatus,
      byIntegration,
      activeWithMfa: active.filter((u) => u.mfaEnabled).length,
      systemRoles: roles.filter((r) => r.system).length,
      stations: ORG_TREE.filter((o) => o.level === "station").length,
      divisions: ORG_TREE.filter((o) => o.level === "division").length,
      enabledCategories: categories.filter((c) => c.enabled).length,
    };
  }, [staff, roles, integrations, categories]);

  const checks = useMemo<HealthCheck[]>(() => {
    const noSecondFactor = staff.filter(
      (u) => u.status === "active" && !u.mfaEnabled,
    );
    const rulesOff = [...rules]
      .filter((r) => !r.enabled)
      .sort(
        (a, b) =>
          PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority),
      );
    const placeholders = integrations.filter((i) => i.status === "placeholder");
    const unavailable = categories.filter(
      (c) => !c.enabled || !c.citizenVisible,
    );
    return [
      {
        key: "second-factor",
        ok: noSecondFactor.length === 0,
        tone: "high",
        title:
          noSecondFactor.length === 0
            ? "Every active user has a second factor"
            : `${plural(noSecondFactor.length, "active user")} without a second factor`,
        detail:
          noSecondFactor.length === 0
            ? "Sign-in to the staff consoles is protected by a second step."
            : listSome(noSecondFactor.map((u) => u.name)),
        href: "/admin/users?status=active&mfa=off",
        action: "Review users",
      },
      {
        key: "escalation",
        ok: rulesOff.length === 0,
        tone: "medium",
        title:
          rulesOff.length === 0
            ? "Every escalation rule is switched on"
            : `${plural(rulesOff.length, "escalation rule")} switched off`,
        detail:
          rulesOff.length === 0
            ? "The simulator evaluates all of them against open incidents."
            : listSome(
                rulesOff.map(
                  (r) =>
                    `${r.priority} ${TRIGGER_META[r.trigger].label.toLowerCase()}`,
                ),
              ),
        href: "/admin/slas#escalation",
        action: "Review rules",
      },
      {
        key: "integrations",
        ok: placeholders.length === 0,
        tone: "medium",
        title:
          placeholders.length === 0
            ? "No integration is left as a placeholder"
            : `${plural(placeholders.length, "integration")} still ${placeholders.length === 1 ? "a placeholder" : "placeholders"}`,
        detail:
          placeholders.length === 0
            ? "Each adapter is either in sandbox or deliberately disabled."
            : listSome(placeholders.map((i) => i.name)),
        href: "/admin/integrations?status=placeholder",
        action: "Review integrations",
      },
      {
        key: "categories",
        ok: unavailable.length === 0,
        tone: "medium",
        title:
          unavailable.length === 0
            ? "Every category is available to citizens"
            : `${plural(unavailable.length, "category", "categories")} not available to citizens`,
        detail:
          unavailable.length === 0
            ? "Nothing is disabled or hidden from the citizen report picker."
            : listSome(unavailable.map((c) => c.short)),
        href: "/admin/categories?show=unavailable",
        action: "Review categories",
      },
    ];
  }, [staff, rules, integrations, categories]);

  const recent = useMemo(
    () => audit.filter((e) => e.category === "admin").slice(0, 6),
    [audit],
  );
  const clear = checks.filter((c) => c.ok).length;
  const hiddenOrOff = categories.length - counts.enabledCategories;

  return (
    <PageContainer>
      <PageHeader
        title="Administration"
        description="Who can use the platform, how it is organised, and the policies it runs on. Every change made here is written to the audit log."
        actions={
          <Button variant="outline" size="lg" asChild>
            <Link href="/admin/audit?category=admin">
              Configuration history <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <TileLink href="/admin/users" label="Staff users">
          <StatCard
            className="h-full transition-colors group-hover:border-input"
            label="Staff users"
            value={staff.length}
            icon={Users}
            hint={
              <span className="whitespace-normal">
                {counts.byStatus.active} active · {counts.byStatus.invited}{" "}
                invited · {counts.byStatus.suspended} suspended
              </span>
            }
          />
        </TileLink>
        <TileLink href="/admin/roles" label="Roles">
          <StatCard
            className="h-full transition-colors group-hover:border-input"
            label="Roles"
            value={roles.length}
            icon={ShieldCheck}
            hint={
              <span className="whitespace-normal">
                {roles.length - counts.systemRoles} configurable ·{" "}
                {counts.systemRoles} fixed by the platform
              </span>
            }
          />
        </TileLink>
        <TileLink href="/admin/organization" label="Police stations">
          <StatCard
            className="h-full transition-colors group-hover:border-input"
            label="Police stations"
            value={counts.stations}
            icon={Building2}
            hint={
              <span className="whitespace-normal">
                In {plural(counts.divisions, "division")}
              </span>
            }
          />
        </TileLink>
        <TileLink href="/admin/organization" label="Response units">
          <StatCard
            className="h-full transition-colors group-hover:border-input"
            label="Response units"
            value={units.length}
            icon={Truck}
            hint={
              <span className="whitespace-normal">
                {plural(OFFICERS.length, "officer")} on the roster
              </span>
            }
          />
        </TileLink>
        <TileLink href="/admin/categories" label="Enabled categories">
          <StatCard
            className="h-full transition-colors group-hover:border-input"
            label="Enabled categories"
            value={counts.enabledCategories}
            unit={`of ${categories.length}`}
            icon={Tags}
            hint={
              <span className="whitespace-normal">
                {hiddenOrOff === 0
                  ? "None disabled"
                  : `${hiddenOrOff} disabled`}
              </span>
            }
          />
        </TileLink>
        <TileLink href="/admin/integrations" label="Integrations">
          <StatCard
            className="h-full transition-colors group-hover:border-input"
            label="Integrations"
            value={integrations.length}
            icon={Plug}
            hint={
              <span className="whitespace-normal">
                {counts.byIntegration.sandbox} sandbox ·{" "}
                {counts.byIntegration.placeholder} placeholder ·{" "}
                {counts.byIntegration.disabled} disabled
              </span>
            }
          />
        </TileLink>
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <Panel aria-labelledby="health-title">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
              <div className="min-w-0">
                <h2 id="health-title" className="text-sm font-semibold">
                  Configuration health
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Worked out from the current configuration. Each item opens the
                  screen that settles it.
                </p>
              </div>
              <ToneChip tone={clear === checks.length ? "resolved" : "neutral"}>
                <span className="tnum">
                  {clear} of {checks.length}
                </span>{" "}
                clear
              </ToneChip>
            </div>
            <ul className="divide-y divide-border/70">
              {checks.map((check) => (
                <li
                  key={check.key}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full",
                      check.ok
                        ? "bg-resolved-soft text-resolved-fg"
                        : check.tone === "high"
                          ? "bg-high-soft text-high-fg"
                          : "bg-medium-soft text-medium-fg",
                    )}
                  >
                    {check.ok ? (
                      <CircleCheck aria-hidden className="size-4" />
                    ) : (
                      <TriangleAlert aria-hidden className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="text-sm font-medium">
                      <span className="sr-only">
                        {check.ok ? "Clear: " : "Needs review: "}
                      </span>
                      {check.title}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {check.detail}
                    </p>
                  </div>
                  <Button
                    variant={check.ok ? "ghost" : "outline"}
                    className="shrink-0"
                    asChild
                  >
                    <Link href={check.href}>
                      {check.action} <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader
              title="Recent changes"
              description="The latest administration entries in the audit log."
              actions={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/audit?category=admin">Open audit log</Link>
                </Button>
              }
            />
            {recent.length === 0 ? (
              <BlankState
                compact
                title="No configuration changes yet"
                description="Changes to users, roles, policies and integrations appear here as they are made."
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {recent.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="text-sm font-medium">{event.action}</p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {event.detail}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.actorName} ·{" "}
                      <RelativeTime at={event.at} friendly />
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Panel>
            <PanelHeader title="Accounts by status" />
            <ul className="divide-y divide-border/70">
              {STAFF_STATUSES.map((status) => (
                <BreakdownRow
                  key={status}
                  href={`/admin/users?status=${status}`}
                  tone={STAFF_STATUS_META[status].tone}
                  label={STAFF_STATUS_META[status].label}
                  count={counts.byStatus[status]}
                />
              ))}
            </ul>
            <p className="border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
              Second factor on for{" "}
              <span className="tnum font-medium text-foreground">
                {counts.activeWithMfa} of {counts.byStatus.active}
              </span>{" "}
              active users.
            </p>
          </Panel>

          <Panel>
            <PanelHeader title="Integrations by status" />
            <ul className="divide-y divide-border/70">
              {INTEGRATION_STATUSES.map((status) => (
                <BreakdownRow
                  key={status}
                  href={`/admin/integrations?status=${status}`}
                  tone={INTEGRATION_STATUS_META[status].tone}
                  label={INTEGRATION_STATUS_META[status].label}
                  count={counts.byIntegration[status]}
                />
              ))}
            </ul>
            <p className="border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
              No real government system is connected in this prototype.
            </p>
          </Panel>

          <Notice
            icon={ShieldCheck}
            title="Separation of duties"
            className="sm:col-span-2 lg:col-span-1"
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/roles?role=admin">View role</Link>
              </Button>
            }
          >
            The administrator configures the platform and deliberately has no
            operational access: no incidents, no evidence and no citizen
            conversations.
          </Notice>
        </div>
      </div>
    </PageContainer>
  );
}
