"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  EllipsisVertical,
  Pencil,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PersonaAvatar } from "@/components/layout/user-menu";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { BlankState } from "@/components/shared/states";
import { ToneChip } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAction } from "@/hooks/use-action";
import { useIsMd } from "@/hooks/use-mounted";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type { Role, RoleKey, StaffUser } from "@/types";
import {
  STAFF_STATUSES,
  STAFF_STATUS_META,
  isStaffRole,
  plural,
  postingOf,
} from "./admin-meta";
import {
  ConfirmDialog,
  FilterSelect,
  SearchField,
  type Option,
} from "./admin-ui";
import { UserDialog } from "./user-dialog";

type StatusFilter = StaffUser["status"] | "all";
type MfaFilter = "all" | "on" | "off";
type SortKey = "name" | "role" | "status" | "lastActive";
interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

const STATUS_OPTIONS: Option<StatusFilter>[] = [
  { value: "all", label: "All statuses" },
  ...STAFF_STATUSES.map((status) => ({
    value: status,
    label: STAFF_STATUS_META[status].label,
  })),
];

const MFA_OPTIONS: Option<MfaFilter>[] = [
  { value: "all", label: "Second factor: any" },
  { value: "on", label: "Second factor on" },
  { value: "off", label: "Second factor off" },
];

const STATUS_RANK: Record<StaffUser["status"], number> = {
  active: 0,
  invited: 1,
  suspended: 2,
};

function SecondFactor({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap",
        on ? "text-foreground" : "text-high-fg",
      )}
    >
      {on ? (
        <ShieldCheck aria-hidden className="size-4 text-resolved-fg" />
      ) : (
        <ShieldOff aria-hidden className="size-4" />
      )}
      {on ? "On" : "Off"}
    </span>
  );
}

function LastActive({ user }: { user: StaffUser }) {
  if (user.status === "invited")
    return (
      <span className="text-muted-foreground">
        Invited <RelativeTime at={user.lastActiveAt} friendly />
      </span>
    );
  return <RelativeTime at={user.lastActiveAt} friendly />;
}

function Badge({ value }: { value: string }) {
  return value ? (
    <span className="tnum font-mono text-xs">{value}</span>
  ) : (
    <span className="text-xs text-subtle">Not issued</span>
  );
}

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort?.key === sortKey ? sort.dir : null;
  const Icon =
    active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <TableHead
      aria-sort={
        active === "asc"
          ? "ascending"
          : active === "desc"
            ? "descending"
            : "none"
      }
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "-mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-medium hover:bg-muted hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon aria-hidden className={cn("size-3.5", !active && "opacity-60")} />
      </button>
    </TableHead>
  );
}

function RowActions({
  user,
  isSelf,
  onEdit,
  onStatus,
}: {
  user: StaffUser;
  isSelf: boolean;
  onEdit: () => void;
  onStatus: (next: "active" | "suspended") => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${user.name}`}
        >
          <EllipsisVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil aria-hidden /> Edit role and posting
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.status !== "active" && (
          <DropdownMenuItem onSelect={() => onStatus("active")}>
            <UserCheck aria-hidden /> Activate user
          </DropdownMenuItem>
        )}
        {user.status !== "suspended" && (
          <DropdownMenuItem
            variant="destructive"
            disabled={isSelf}
            onSelect={() => onStatus("suspended")}
          >
            <UserX aria-hidden />
            {isSelf ? "Cannot suspend yourself" : "Suspend user"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UsersScreen() {
  const params = useSearchParams();
  const staff = useDemoStore((s) => s.staff);
  const roles = useDemoStore((s) => s.roles);
  const { actor } = useSession();
  const isMd = useIsMd();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleKey | "all">(() => {
    const value = params.get("role");
    return roles.some((r) => r.key === value && isStaffRole(r.key))
      ? (value as RoleKey)
      : "all";
  });
  const [status, setStatus] = useState<StatusFilter>(() => {
    const value = params.get("status");
    return STAFF_STATUSES.includes(value as StaffUser["status"])
      ? (value as StaffUser["status"])
      : "all";
  });
  const [mfa, setMfa] = useState<MfaFilter>(() => {
    const value = params.get("mfa");
    return value === "on" || value === "off" ? value : "all";
  });
  const [sort, setSort] = useState<SortState | null>(null);
  const [editing, setEditing] = useState<StaffUser | "new" | null>(null);
  const [confirm, setConfirm] = useState<{
    user: StaffUser;
    next: "active" | "suspended";
  } | null>(null);

  const roleByKey = useMemo(
    () => new Map<RoleKey, Role>(roles.map((r) => [r.key, r])),
    [roles],
  );
  const roleOptions = useMemo<Option<RoleKey | "all">[]>(
    () => [
      { value: "all", label: "All roles" },
      ...roles
        .filter((r) => isStaffRole(r.key))
        .map((r) => ({ value: r.key, label: r.name })),
    ],
    [roles],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = staff.filter((user) => {
      if (role !== "all" && user.role !== role) return false;
      if (status !== "all" && user.status !== status) return false;
      if (mfa !== "all" && user.mfaEnabled !== (mfa === "on")) return false;
      if (!term) return true;
      const posting = postingOf(user, roleByKey.get(user.role));
      return [
        user.name,
        user.email,
        user.badgeNo,
        roleByKey.get(user.role)?.name,
        posting.label,
      ].some((part) => part?.toLowerCase().includes(term));
    });
    if (!sort) return filtered;
    const direction = sort.dir === "asc" ? 1 : -1;
    const roleName = (user: StaffUser) => roleByKey.get(user.role)?.name ?? "";
    return [...filtered].sort((a, b) => {
      const order =
        sort.key === "name"
          ? a.name.localeCompare(b.name)
          : sort.key === "role"
            ? roleName(a).localeCompare(roleName(b))
            : sort.key === "status"
              ? STATUS_RANK[a.status] - STATUS_RANK[b.status]
              : a.lastActiveAt - b.lastActiveAt;
      return direction * (order || a.name.localeCompare(b.name));
    });
  }, [staff, search, role, status, mfa, sort, roleByKey]);

  const filtered =
    search.trim() !== "" || role !== "all" || status !== "all" || mfa !== "all";
  const clearFilters = () => {
    setSearch("");
    setRole("all");
    setStatus("all");
    setMfa("all");
  };
  const onSort = (key: SortKey) =>
    setSort((current) =>
      current?.key !== key
        ? { key, dir: key === "lastActive" ? "desc" : "asc" }
        : current.dir === (key === "lastActive" ? "desc" : "asc")
          ? { key, dir: key === "lastActive" ? "asc" : "desc" }
          : null,
    );

  const setUserStatus = useAction(services.admin.setUserStatus, {
    success: () =>
      confirm?.next === "suspended" ? "User suspended" : "User activated",
    onSuccess: () => setConfirm(null),
  });

  const inviteButton = (
    <Button size="lg" onClick={() => setEditing("new")}>
      <UserPlus aria-hidden /> Invite user
    </Button>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Users"
        description="Everyone with a staff account, the role that decides what they can do, and where they are posted. Citizens register through the app and are not listed here."
        actions={inviteButton}
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <SearchField
          className="col-span-2 md:col-span-1"
          label="Search by name, email, badge or posting"
          placeholder="Search name, email, badge…"
          value={search}
          onChange={setSearch}
        />
        <FilterSelect
          label="Filter by role"
          value={role}
          onChange={setRole}
          options={roleOptions}
        />
        <FilterSelect
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          className="col-span-2 md:col-span-1"
          label="Filter by second factor"
          value={mfa}
          onChange={setMfa}
          options={MFA_OPTIONS}
        />
      </div>

      <div className="mb-3 flex min-h-7 flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
        <p role="status">
          {filtered
            ? `${rows.length} of ${plural(staff.length, "user")}`
            : plural(staff.length, "user")}
        </p>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {staff.length === 0 ? (
        <Panel>
          <BlankState
            icon={Users}
            title="No staff users yet"
            description="Invite the first operator, officer or supervisor to give them access."
            action={inviteButton}
          />
        </Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <BlankState
            icon={Users}
            title="No users match these filters"
            description="Try a different name, or widen the role, status or second-factor filter."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </Panel>
      ) : isMd ? (
        <Panel className="overflow-hidden">
          {/* Fixed layout: columns keep their share and long values truncate, so the table never
              scrolls sideways. Posting and last active get their own columns from xl. */}
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableHead
                  label="User"
                  sortKey="name"
                  sort={sort}
                  onSort={onSort}
                  className="pl-4"
                />
                <SortableHead
                  label="Role"
                  sortKey="role"
                  sort={sort}
                  onSort={onSort}
                  className="w-[27%] xl:w-[17%]"
                />
                <TableHead className="hidden w-[20%] text-xs text-muted-foreground xl:table-cell">
                  Posting
                </TableHead>
                <SortableHead
                  label="Status"
                  sortKey="status"
                  sort={sort}
                  onSort={onSort}
                  className="w-28"
                />
                <TableHead className="w-28 text-xs text-muted-foreground">
                  Second factor
                </TableHead>
                <SortableHead
                  label="Last active"
                  sortKey="lastActive"
                  sort={sort}
                  onSort={onSort}
                  className="hidden w-32 xl:table-cell"
                />
                <TableHead className="w-12 pr-3">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => {
                const userRole = roleByKey.get(user.role);
                const posting = postingOf(user, userRole);
                return (
                  <TableRow
                    key={user.id}
                    className={cn(user.status === "suspended" && "bg-inset/60")}
                  >
                    <TableCell className="pl-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <PersonaAvatar initials={user.initials} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            <Badge value={user.badgeNo} /> ·{" "}
                            {user.email ?? "No email on record"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="truncate">{userRole?.name ?? user.role}</p>
                      <p className="truncate text-xs text-muted-foreground xl:hidden">
                        {posting.label}
                      </p>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <p className="truncate">{posting.label}</p>
                      {posting.detail && (
                        <p className="truncate text-xs text-muted-foreground">
                          {posting.detail}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <ToneChip tone={STAFF_STATUS_META[user.status].tone} dot>
                        {STAFF_STATUS_META[user.status].label}
                      </ToneChip>
                    </TableCell>
                    <TableCell>
                      <SecondFactor on={user.mfaEnabled} />
                    </TableCell>
                    <TableCell className="hidden truncate text-[13px] text-muted-foreground xl:table-cell">
                      <LastActive user={user} />
                    </TableCell>
                    <TableCell className="pr-3 text-right">
                      <RowActions
                        user={user}
                        isSelf={user.id === actor.id}
                        onEdit={() => setEditing(user)}
                        onStatus={(next) => setConfirm({ user, next })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {rows.map((user) => {
            const userRole = roleByKey.get(user.role);
            const posting = postingOf(user, userRole);
            return (
              <Panel as="li" key={user.id} className="p-4">
                <div className="flex items-start gap-3">
                  <PersonaAvatar initials={user.initials} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      {userRole?.name ?? user.role}
                    </p>
                  </div>
                  <ToneChip tone={STAFF_STATUS_META[user.status].tone} dot>
                    {STAFF_STATUS_META[user.status].label}
                  </ToneChip>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Badge</dt>
                    <dd className="mt-0.5">
                      <Badge value={user.badgeNo} />
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">
                      Second factor
                    </dt>
                    <dd className="mt-0.5">
                      <SecondFactor on={user.mfaEnabled} />
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Posting</dt>
                    <dd className="mt-0.5 break-words">{posting.label}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">
                      Last active
                    </dt>
                    <dd className="mt-0.5">
                      <LastActive user={user} />
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => setEditing(user)}
                  >
                    <Pencil aria-hidden /> Edit
                  </Button>
                  {user.status === "active" ? (
                    <Button
                      variant="destructive"
                      size="lg"
                      className="flex-1"
                      disabled={user.id === actor.id}
                      onClick={() => setConfirm({ user, next: "suspended" })}
                    >
                      <UserX aria-hidden /> Suspend
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="lg"
                      className="flex-1"
                      onClick={() => setConfirm({ user, next: "active" })}
                    >
                      <UserCheck aria-hidden /> Activate
                    </Button>
                  )}
                </div>
              </Panel>
            );
          })}
        </ul>
      )}

      {editing && (
        <UserDialog
          user={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setConfirm(null)}
          title={
            confirm.next === "suspended"
              ? `Suspend ${confirm.user.name}?`
              : `Activate ${confirm.user.name}?`
          }
          description={
            confirm.next === "suspended"
              ? "They are signed out and cannot sign in until the account is activated again. Everything they have already done stays in the audit log."
              : `They will be able to sign in with the ${roleByKey.get(confirm.user.role)?.name ?? confirm.user.role} role.`
          }
          confirmLabel={
            confirm.next === "suspended" ? "Suspend user" : "Activate user"
          }
          variant={confirm.next === "suspended" ? "destructive" : "default"}
          pending={setUserStatus.pending}
          onConfirm={() =>
            setUserStatus.run(confirm.user.id, confirm.next, actor)
          }
        />
      )}
    </PageContainer>
  );
}
