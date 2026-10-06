import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  FileBarChart,
  FileText,
  FolderLock,
  Gauge,
  Home,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Map as MapIcon,
  MapPinned,
  MessageSquare,
  Network,
  PhoneCall,
  Plug,
  Radio,
  ScrollText,
  Settings,
  ShieldCheck,
  Siren,
  Tags,
  Timer,
  TrendingUp,
  TriangleAlert,
  Truck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { TKey } from "@/lib/i18n";
import type { RoleKey } from "@/types";

export type AreaKey = "citizen" | "officer" | "control" | "command" | "admin";

export interface NavItem {
  href: string;
  labelKey: TKey;
  icon: LucideIcon;
  /** Sidebar section heading. Items without a group sit at the top. */
  group?: string;
  /** Shown in the mobile bottom bar (at most five per area; the rest live under "More"). */
  primary?: boolean;
}

export interface AreaConfig {
  key: AreaKey;
  name: string;
  subtitle: string;
  home: string;
  /** Roles permitted to open this area. Anyone else sees the permission-denied screen. */
  roles: RoleKey[];
  /** Persona the "switch role" shortcut on the denied screen uses. */
  defaultPersonaId: string;
  /** Staff consoles show search, shift and the command palette in the top bar. */
  console: boolean;
  nav: NavItem[];
}

export const AREAS_CONFIG: Record<AreaKey, AreaConfig> = {
  citizen: {
    key: "citizen",
    name: "Citizen",
    subtitle: "Safety app",
    home: "/citizen",
    roles: ["citizen"],
    defaultPersonaId: "cit-aarav",
    console: false,
    nav: [
      { href: "/citizen", labelKey: "nav.home", icon: Home, primary: true },
      {
        href: "/citizen/report",
        labelKey: "nav.report",
        icon: FileText,
        primary: true,
      },
      {
        href: "/citizen/safety",
        labelKey: "nav.safety",
        icon: ShieldCheck,
        primary: true,
      },
      {
        href: "/citizen/activity",
        labelKey: "nav.activity",
        icon: Activity,
        primary: true,
      },
      {
        href: "/citizen/profile",
        labelKey: "nav.profile",
        icon: User,
        primary: true,
      },
    ],
  },
  officer: {
    key: "officer",
    name: "Field officer",
    subtitle: "Response app",
    home: "/officer",
    roles: ["officer"],
    defaultPersonaId: "stf-arjun",
    console: false,
    nav: [
      { href: "/officer", labelKey: "nav.home", icon: Home, primary: true },
      {
        href: "/officer/assignment",
        labelKey: "nav.assignment",
        icon: Siren,
        primary: true,
      },
      {
        href: "/officer/incidents",
        labelKey: "nav.incidents",
        icon: ListChecks,
        primary: true,
      },
      {
        href: "/officer/messages",
        labelKey: "nav.messages",
        icon: MessageSquare,
        primary: true,
      },
      {
        href: "/officer/reports",
        labelKey: "nav.reports",
        icon: ClipboardList,
        primary: true,
      },
    ],
  },
  control: {
    key: "control",
    name: "Control room",
    subtitle: "Emergency operations",
    home: "/control",
    roles: ["operator", "dispatcher", "supervisor", "command", "state_command"],
    defaultPersonaId: "stf-meera",
    console: true,
    nav: [
      {
        href: "/control",
        labelKey: "nav.overview",
        icon: LayoutDashboard,
        group: "Operations",
        primary: true,
      },
      {
        href: "/control/incidents",
        labelKey: "nav.liveIncidents",
        icon: Siren,
        group: "Operations",
        primary: true,
      },
      {
        href: "/control/dispatch",
        labelKey: "nav.dispatch",
        icon: KanbanSquare,
        group: "Operations",
        primary: true,
      },
      {
        href: "/control/map",
        labelKey: "nav.map",
        icon: MapIcon,
        group: "Operations",
        primary: true,
      },
      {
        href: "/control/units",
        labelKey: "nav.units",
        icon: Truck,
        group: "Operations",
      },
      {
        href: "/control/communications",
        labelKey: "nav.calls",
        icon: PhoneCall,
        group: "Engagement",
      },
      {
        href: "/control/messages",
        labelKey: "nav.messages",
        icon: MessageSquare,
        group: "Engagement",
      },
      {
        href: "/control/complaints",
        labelKey: "nav.complaints",
        icon: ClipboardList,
        group: "Engagement",
      },
      {
        href: "/control/evidence",
        labelKey: "nav.evidence",
        icon: FolderLock,
        group: "Records",
      },
      {
        href: "/control/audit",
        labelKey: "nav.audit",
        icon: ScrollText,
        group: "Records",
      },
      {
        href: "/control/stations",
        labelKey: "nav.stations",
        icon: Building2,
        group: "Oversight",
      },
      {
        href: "/control/escalations",
        labelKey: "nav.escalations",
        icon: TriangleAlert,
        group: "Oversight",
      },
      {
        href: "/control/analytics",
        labelKey: "nav.analytics",
        icon: BarChart3,
        group: "Oversight",
      },
      {
        href: "/control/settings",
        labelKey: "nav.settings",
        icon: Settings,
        group: "System",
      },
    ],
  },
  command: {
    key: "command",
    name: "Command centre",
    subtitle: "District and state",
    home: "/command",
    roles: ["command", "state_command", "supervisor"],
    defaultPersonaId: "stf-vikram",
    console: true,
    nav: [
      {
        href: "/command",
        labelKey: "nav.overview",
        icon: Gauge,
        primary: true,
      },
      {
        href: "/command/operations",
        labelKey: "nav.operations",
        icon: Radio,
        primary: true,
      },
      {
        href: "/command/analytics",
        labelKey: "nav.analytics",
        icon: TrendingUp,
        primary: true,
      },
      {
        href: "/command/districts",
        labelKey: "nav.districts",
        icon: MapPinned,
        primary: true,
      },
      {
        href: "/command/resources",
        labelKey: "nav.resources",
        icon: Truck,
        primary: true,
      },
    ],
  },
  admin: {
    key: "admin",
    name: "Administration",
    subtitle: "Platform configuration",
    home: "/admin",
    roles: ["admin"],
    defaultPersonaId: "stf-admin",
    console: true,
    nav: [
      {
        href: "/admin",
        labelKey: "nav.overview",
        icon: LayoutDashboard,
        primary: true,
      },
      {
        href: "/admin/users",
        labelKey: "nav.users",
        icon: Users,
        group: "Access",
        primary: true,
      },
      {
        href: "/admin/roles",
        labelKey: "nav.roles",
        icon: ShieldCheck,
        group: "Access",
        primary: true,
      },
      {
        href: "/admin/organization",
        labelKey: "nav.organization",
        icon: Network,
        group: "Structure",
        primary: true,
      },
      {
        href: "/admin/categories",
        labelKey: "nav.categories",
        icon: Tags,
        group: "Policy",
      },
      {
        href: "/admin/slas",
        labelKey: "nav.slas",
        icon: Timer,
        group: "Policy",
      },
      {
        href: "/admin/integrations",
        labelKey: "nav.integrations",
        icon: Plug,
        group: "Policy",
      },
      {
        href: "/admin/audit",
        labelKey: "nav.audit",
        icon: ScrollText,
        group: "System",
      },
      {
        href: "/admin/settings",
        labelKey: "nav.settings",
        icon: Settings,
        group: "System",
      },
    ],
  },
};

/** Where each role lands, and the area it belongs to. */
export const ROLE_HOME: Record<RoleKey, { area: AreaKey; href: string }> = {
  citizen: { area: "citizen", href: "/citizen" },
  officer: { area: "officer", href: "/officer" },
  operator: { area: "control", href: "/control" },
  dispatcher: { area: "control", href: "/control/dispatch" },
  supervisor: { area: "control", href: "/control/stations" },
  command: { area: "command", href: "/command" },
  state_command: { area: "command", href: "/command/districts" },
  admin: { area: "admin", href: "/admin" },
};

/** The six entries of the demo role switcher, in presentation order. */
export const ROLE_SWITCH: {
  role: RoleKey;
  labelKey: TKey;
  personaId: string;
  icon: LucideIcon;
  blurb: string;
}[] = [
  {
    role: "citizen",
    labelKey: "role.citizen",
    personaId: "cit-aarav",
    icon: User,
    blurb: "Safety app, SOS and reports",
  },
  {
    role: "officer",
    labelKey: "role.officer",
    personaId: "stf-arjun",
    icon: Siren,
    blurb: "Field response on Unit GJ-AHD-17",
  },
  {
    role: "operator",
    labelKey: "role.operator",
    personaId: "stf-meera",
    icon: Radio,
    blurb: "Control room and dispatch",
  },
  {
    role: "supervisor",
    labelKey: "role.supervisor",
    personaId: "stf-neha",
    icon: Building2,
    blurb: "Station dashboard and escalations",
  },
  {
    role: "command",
    labelKey: "role.command",
    personaId: "stf-vikram",
    icon: FileBarChart,
    blurb: "District and state command",
  },
  {
    role: "admin",
    labelKey: "role.admin",
    personaId: "stf-admin",
    icon: Settings,
    blurb: "Roles, policy and integrations",
  },
];

export const NOTIFICATION_ICON = Bell;

export function isNavActive(
  pathname: string,
  item: NavItem,
  home: string,
): boolean {
  if (item.href === home) return pathname === home;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
