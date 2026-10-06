"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ClipboardList,
  FileText,
  FolderLock,
  Gauge,
  KanbanSquare,
  Map as MapIcon,
  Search,
  ShieldCheck,
  Siren,
  Truck,
  TriangleAlert,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { create } from "zustand";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { AREAS_CONFIG, type AreaKey } from "@/config/navigation";
import { useSwitchPersona } from "@/features/auth/use-switch-persona";
import { useSession } from "@/hooks/use-session";
import { services, type SearchResult } from "@/services";
import type { RoleKey } from "@/types";

/** Open state lives in a tiny store so the top-bar search button and the shortcut share it. */
export const useCommandPalette = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

interface Command {
  label: string;
  hint?: string;
  icon: LucideIcon;
  href: string;
  area: AreaKey;
  keywords?: string;
}

const COMMANDS: Command[] = [
  {
    label: "Open incidents",
    icon: Siren,
    href: "/control/incidents",
    area: "control",
    keywords: "live queue",
  },
  {
    label: "Critical incidents",
    icon: TriangleAlert,
    href: "/control/incidents?priority=P1",
    area: "control",
    keywords: "p1 urgent",
  },
  {
    label: "Dispatch unit",
    icon: KanbanSquare,
    href: "/control/dispatch",
    area: "control",
    keywords: "assign board",
  },
  {
    label: "Open map",
    icon: MapIcon,
    href: "/control/map",
    area: "control",
    keywords: "live operations",
  },
  {
    label: "Units available",
    icon: Truck,
    href: "/control/units?status=available",
    area: "control",
    keywords: "free patrol",
  },
  {
    label: "Evidence centre",
    icon: FolderLock,
    href: "/control/evidence",
    area: "control",
    keywords: "digital evidence",
  },
  {
    label: "Complaints",
    icon: ClipboardList,
    href: "/control/complaints",
    area: "control",
  },
  {
    label: "Station dashboard",
    icon: Building2,
    href: "/control/stations",
    area: "control",
  },
  {
    label: "Command centre",
    icon: Gauge,
    href: "/command",
    area: "command",
    keywords: "district state",
  },
  { label: "Users", icon: Users, href: "/admin/users", area: "admin" },
  {
    label: "Roles and permissions",
    icon: ShieldCheck,
    href: "/admin/roles",
    area: "admin",
  },
  {
    label: "Emergency SOS",
    icon: Siren,
    href: "/citizen/sos",
    area: "citizen",
  },
  {
    label: "Report an incident",
    icon: FileText,
    href: "/citizen/report",
    area: "citizen",
  },
  {
    label: "My complaints",
    icon: ClipboardList,
    href: "/citizen/complaints",
    area: "citizen",
  },
  {
    label: "Active assignment",
    icon: Siren,
    href: "/officer/assignment",
    area: "officer",
  },
];

const GROUP_ICON: Record<SearchResult["group"], LucideIcon> = {
  Incidents: Siren,
  Complaints: ClipboardList,
  Units: Truck,
  Officers: User,
  Stations: Building2,
  Citizens: User,
};

const canOpen = (role: RoleKey, area: AreaKey) =>
  AREAS_CONFIG[area].roles.includes(role);

/** Ctrl/Cmd + K: jump anywhere, or search incidents, complaints, units, officers and stations. */
export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const session = useSession();
  const router = useRouter();
  const switchPersona = useSwitchPersona();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useCommandPalette.getState().open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 160);
    return () => clearTimeout(id);
  }, [query]);

  const {
    data: results = [],
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["search", debounced, session.role],
    queryFn: () => services.search.search(debounced, session.role),
    enabled: open && debounced.trim().length >= 2,
  });

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const own = COMMANDS.filter((c) => canOpen(session.role, c.area));
  // Staff personas can hop to another console; the demo switches persona to match.
  const other =
    session.role === "citizen"
      ? []
      : COMMANDS.filter(
          (c) =>
            !canOpen(session.role, c.area) &&
            c.area !== "citizen" &&
            c.area !== "officer",
        );
  const grouped = results.reduce<
    Partial<Record<SearchResult["group"], SearchResult[]>>
  >((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search or jump to a screen"
    >
      <Command>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search incidents, units, complaints, stations…"
      />
      <CommandList>
        <CommandEmpty>
          {isError
            ? "Search is unavailable while offline."
            : isFetching
              ? "Searching…"
              : "No matches. Try an incident ID, a unit call sign or an area."}
        </CommandEmpty>

        {(Object.keys(grouped) as SearchResult["group"][]).map((group) => {
          const Icon = GROUP_ICON[group];
          return (
            <CommandGroup key={group} heading={group}>
              {grouped[group]?.map((r) => (
                <CommandItem
                  key={`${group}-${r.id}`}
                  value={`${r.title} ${r.subtitle} ${r.id}`}
                  onSelect={() => go(r.href)}
                >
                  <Icon aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.subtitle}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        <CommandGroup heading="Go to">
          {own.map((c) => (
            <CommandItem
              key={c.href}
              value={`${c.label} ${c.keywords ?? ""}`}
              onSelect={() => go(c.href)}
            >
              <c.icon aria-hidden />
              {c.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {other.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Other consoles (switches demo role)">
              {other.map((c) => (
                <CommandItem
                  key={c.href}
                  value={`${c.label} ${c.keywords ?? ""}`}
                  onSelect={() => {
                    setOpen(false);
                    setQuery("");
                    switchPersona(
                      AREAS_CONFIG[c.area].defaultPersonaId,
                      c.href,
                    );
                  }}
                >
                  <c.icon aria-hidden />
                  {c.label}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {AREAS_CONFIG[c.area].name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      </Command>
    </CommandDialog>
  );
}

export function SearchButton({ className }: { className?: string }) {
  const setOpen = useCommandPalette((s) => s.setOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={className}
      aria-label="Search and commands"
      aria-keyshortcuts="Control+K Meta+K"
    >
      <Search aria-hidden className="size-4 shrink-0" />
      <span className="hidden flex-1 truncate text-left sm:inline">
        Search incidents, units, complaints…
      </span>
      <kbd className="hidden rounded border border-border bg-muted px-1.5 font-sans text-[11px] text-muted-foreground lg:inline">
        Ctrl K
      </kbd>
    </button>
  );
}
