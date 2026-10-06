"use client";

import { Ban, Lock, ShieldCheck, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PersonaAvatar } from "@/components/layout/user-menu";
import {
  Field,
  PageContainer,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/shared/page";
import { BlankState } from "@/components/shared/states";
import { SensitiveBadge, ToneChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type { PermissionDefinition, RoleKey } from "@/types";
import {
  PERMISSIONS_BY_GROUP,
  SCOPE_META,
  SENSITIVE_PERMISSIONS,
  STAFF_STATUS_META,
  deniedCapabilities,
  isStaffRole,
  plural,
  postingOf,
} from "./admin-meta";
import { ConfirmDialog, Notice, SavingMark, useKeyedAction } from "./admin-ui";

const TOTAL_PERMISSIONS = PERMISSIONS_BY_GROUP.reduce(
  (sum, g) => sum + g.permissions.length,
  0,
);

const SYSTEM_ROLE_NOTE: Partial<Record<RoleKey, string>> = {
  admin:
    "The administrator configures the platform and deliberately has no access to incidents or evidence. Keeping this role read-only means that separation cannot be configured away.",
  citizen:
    "Citizens raise emergencies and reports and see only their own records. What a citizen can do is set by the app, not by configuration.",
};

export function RolesScreen() {
  const params = useSearchParams();
  const roles = useDemoStore((s) => s.roles);
  const staff = useDemoStore((s) => s.staff);
  const { actor } = useSession();

  const [selectedKey, setSelectedKey] = useState<RoleKey>(() => {
    const value = params.get("role");
    return roles.some((r) => r.key === value) ? (value as RoleKey) : "operator";
  });
  const [sensitiveGrant, setSensitiveGrant] =
    useState<PermissionDefinition | null>(null);

  const role = roles.find((r) => r.key === selectedKey) ?? roles[0];
  const userCount = useMemo(() => {
    const counts = new Map<RoleKey, number>();
    for (const user of staff)
      counts.set(user.role, (counts.get(user.role) ?? 0) + 1);
    return counts;
  }, [staff]);
  const assigned = useMemo(
    () => staff.filter((u) => u.role === role?.key),
    [staff, role?.key],
  );
  const denied = useMemo(
    () => (role ? deniedCapabilities(role.permissions) : []),
    [role],
  );

  const toggle = useKeyedAction(
    async (definition: PermissionDefinition, enabled: boolean) => {
      await services.admin.setRolePermission(
        selectedKey,
        definition.key,
        enabled,
        actor,
      );
      return { definition, enabled, roleName: role?.name ?? selectedKey };
    },
    {
      success: ({ definition, enabled, roleName }) =>
        `${enabled ? "Granted to" : "Removed from"} ${roleName}: ${definition.label}`,
    },
  );

  if (!role)
    return (
      <PageContainer>
        <PageHeader title="Roles and permissions" />
        <Panel>
          <BlankState
            icon={ShieldCheck}
            title="No roles are defined"
            description="Reset the demo from Settings to restore the starting roles."
          />
        </Panel>
      </PageContainer>
    );

  const sensitiveHeld = role.permissions.filter((p) =>
    SENSITIVE_PERMISSIONS.includes(p),
  ).length;
  const activeAssigned = assigned.filter((u) => u.status === "active").length;

  const onToggle = (definition: PermissionDefinition, enabled: boolean) => {
    if (enabled && definition.sensitive) setSensitiveGrant(definition);
    else void toggle.run(definition.key, definition, enabled);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Roles and permissions"
        description="What each role is permitted to do. A role should hold only what the job needs."
      />

      <Notice icon={Zap} tone="info" title="Changes take effect immediately">
        Every console checks these permissions on each action, so people with a
        role gain or lose access as soon as a box changes. Switch role from the
        demo banner to see it. Each change is written to the audit log.
      </Notice>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        {/* Role picker: a list beside the editor on wide screens, a select above it otherwise. */}
        <div className="lg:hidden">
          <Select
            value={role.key}
            onValueChange={(value) => setSelectedKey(value as RoleKey)}
          >
            <SelectTrigger
              aria-label="Role"
              className="w-full bg-card data-[size=default]:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {roles.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav aria-label="Roles" className="hidden lg:sticky lg:top-6 lg:block">
          <Panel className="p-1.5">
            <ul className="grid gap-0.5">
              {roles.map((r) => {
                const selected = r.key === role.key;
                return (
                  <li key={r.key}>
                    <button
                      type="button"
                      aria-current={selected ? "true" : undefined}
                      onClick={() => setSelectedKey(r.key)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        selected
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">
                            {r.name}
                          </span>
                          {r.system && (
                            <Lock
                              aria-label="Fixed by the platform"
                              className="size-3 shrink-0 text-subtle"
                            />
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {SCOPE_META[r.scope].label} ·{" "}
                          {isStaffRole(r.key)
                            ? plural(userCount.get(r.key) ?? 0, "user")
                            : "app users"}
                        </span>
                      </span>
                      <span
                        className="tnum shrink-0 text-xs text-muted-foreground"
                        aria-label={`${r.permissions.length} permissions`}
                      >
                        {r.permissions.length}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <p className="mt-2 px-2.5 text-xs text-muted-foreground">
            The number is how many of the {TOTAL_PERMISSIONS} permissions a role
            holds.
          </p>
        </nav>

        <div className="grid min-w-0 grid-cols-1 gap-4">
          <Panel className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight">
                  {role.name}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {role.description}
                </p>
              </div>
              {role.system ? (
                <ToneChip tone="neutral" variant="outline">
                  <Lock aria-hidden className="size-3" /> Read-only
                </ToneChip>
              ) : (
                <SavingMark show={toggle.anyPending} />
              )}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
              <Field label="Scope">
                {SCOPE_META[role.scope].label}
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {SCOPE_META[role.scope].description}
                </span>
              </Field>
              <Field label="Users">
                {isStaffRole(role.key) ? (
                  <>
                    <span className="tnum">{assigned.length}</span>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {activeAssigned} active
                    </span>
                  </>
                ) : (
                  <>
                    App users
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      Not in the staff directory
                    </span>
                  </>
                )}
              </Field>
              <Field label="Permissions">
                <span className="tnum">
                  {role.permissions.length} of {TOTAL_PERMISSIONS}
                </span>
              </Field>
              <Field label="Sensitive permissions">
                <span className="tnum">
                  {sensitiveHeld} of {SENSITIVE_PERMISSIONS.length}
                </span>
              </Field>
            </dl>

            <div className="mt-4 border-t border-border/70 pt-4">
              <h3 className="text-sm font-medium">What this role cannot do</h3>
              {denied.length === 0 ? (
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Nothing is withheld. Check that this role really needs every
                  permission.
                </p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {denied.map((item) => (
                    <li
                      key={item}
                      className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-inset px-2 text-xs text-muted-foreground"
                    >
                      <Ban aria-hidden className="size-3 text-subtle" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          {role.system && (
            <Notice icon={Lock} title="This role is fixed by the platform">
              {SYSTEM_ROLE_NOTE[role.key] ??
                "System roles are shown for reference and cannot be edited."}
            </Notice>
          )}

          <div className="xl:columns-2 xl:gap-4 [&>section]:mb-4 [&>section]:break-inside-avoid">
            {PERMISSIONS_BY_GROUP.map(({ group, permissions }) => {
              const granted = permissions.filter((p) =>
                role.permissions.includes(p.key),
              ).length;
              const headingId = `permission-group-${group.toLowerCase()}`;
              return (
                <Panel key={group} aria-labelledby={headingId}>
                  <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
                    <h3 id={headingId} className="text-sm font-semibold">
                      {group}
                    </h3>
                    <span className="tnum text-xs text-muted-foreground">
                      {granted} of {permissions.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-border/70">
                    {permissions.map((definition) => {
                      const id = `permission-${definition.key}`;
                      const checked = role.permissions.includes(definition.key);
                      const saving = toggle.isPending(definition.key);
                      return (
                        <li
                          key={definition.key}
                          className="flex items-start gap-3 px-4 py-3"
                        >
                          <Checkbox
                            id={id}
                            checked={checked}
                            disabled={role.system || saving}
                            aria-describedby={`${id}-description`}
                            onCheckedChange={(next) =>
                              onToggle(definition, next === true)
                            }
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <label
                              htmlFor={id}
                              className={cn(
                                "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium",
                                role.system && "cursor-default",
                              )}
                            >
                              {definition.label}
                              {definition.sensitive && (
                                <SensitiveBadge label="Sensitive" />
                              )}
                            </label>
                            <p
                              id={`${id}-description`}
                              className="mt-0.5 text-[13px] leading-snug text-muted-foreground"
                            >
                              {definition.description}
                            </p>
                            <code className="mt-1 block font-mono text-[11px] text-subtle">
                              {definition.key}
                            </code>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              );
            })}
          </div>

          <Panel>
            <PanelHeader
              title="Users with this role"
              description={
                isStaffRole(role.key)
                  ? `${plural(assigned.length, "user")} · ${activeAssigned} active`
                  : undefined
              }
              actions={
                isStaffRole(role.key) && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/users?role=${role.key}`}>
                      Manage users
                    </Link>
                  </Button>
                )
              }
            />
            {!isStaffRole(role.key) ? (
              <BlankState
                compact
                icon={Users}
                title="Citizens are not staff users"
                description="They register through the citizen app and are not listed in the staff directory."
              />
            ) : assigned.length === 0 ? (
              <BlankState
                compact
                icon={Users}
                title="Nobody holds this role"
                description="Assign it when inviting a user or by editing an existing one."
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {assigned.map((user) => (
                  <li
                    key={user.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <PersonaAvatar initials={user.initials} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {postingOf(user, role).label}
                      </p>
                    </div>
                    <ToneChip tone={STAFF_STATUS_META[user.status].tone} dot>
                      {STAFF_STATUS_META[user.status].label}
                    </ToneChip>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {sensitiveGrant && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setSensitiveGrant(null)}
          title={`Grant “${sensitiveGrant.label}” to ${role.name}?`}
          description={`This is a sensitive permission. ${sensitiveGrant.description} ${
            assigned.length === 0
              ? "Nobody holds this role yet."
              : `${plural(assigned.length, "user")} with this role ${assigned.length === 1 ? "gains" : "gain"} it immediately.`
          }`}
          confirmLabel="Grant permission"
          pending={toggle.isPending(sensitiveGrant.key)}
          onConfirm={async () => {
            const saved = await toggle.run(
              sensitiveGrant.key,
              sensitiveGrant,
              true,
            );
            // On failure the dialog stays open so the grant can be retried.
            if (saved) setSensitiveGrant(null);
          }}
        />
      )}
    </PageContainer>
  );
}
