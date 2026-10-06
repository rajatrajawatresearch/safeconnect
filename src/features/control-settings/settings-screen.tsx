"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FlaskConical,
  Monitor,
  Moon,
  RotateCcw,
  Search,
  Sun,
  TimerReset,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CONNECTIVITY_META } from "@/components/layout/top-controls";
import { useCommandPalette } from "@/components/layout/command-palette";
import {
  Field,
  Kbd,
  PageContainer,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/shared/page";
import { ErrorState } from "@/components/shared/states";
import { SensitiveBadge, ToneChip } from "@/components/shared/status-chips";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { deployment } from "@/config/deployment";
import { PERMISSIONS } from "@/data/demo/admin";
import { Segmented } from "@/features/evidence/filters";
import { useAction } from "@/hooks/use-action";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { useTheme, type ThemeChoice } from "@/hooks/use-theme";
import { formatDuration, formatTime } from "@/lib/format";
import { LANGUAGES } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { services, ServiceError } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import type {
  Connectivity,
  LanguageCode,
  PermissionGroup,
  Role,
} from "@/types";
import {
  ALERT_OPTIONS,
  useNotificationPrefs,
} from "./notification-prefs-store";

const SCOPE_LABEL: Record<Role["scope"], string> = {
  self: "Own records only",
  assigned: "Assigned incidents",
  station: "One station",
  district: "One district",
  state: "Statewide",
  platform: "Platform configuration",
};

const PERMISSION_GROUPS: PermissionGroup[] = [
  "Incidents",
  "Dispatch",
  "Communication",
  "Evidence",
  "Complaints",
  "Analytics",
  "Administration",
];

const NETWORK: Connectivity[] = ["online", "weak", "offline"];

const NETWORK_NOTE: Record<Connectivity, string> = {
  online: "Commands complete at normal speed.",
  weak: "Commands take about a second, as on a poor link.",
  offline: "Commands fail and say so. Live data pauses until the link returns.",
};

/** A labelled row with its control on the right; the label is the click target for switches. */
function SettingRow({
  id,
  label,
  description,
  children,
}: {
  id?: string;
  label: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        {id ? (
          <Label htmlFor={id} className="leading-snug">
            {label}
          </Label>
        ) : (
          <p className="text-sm leading-snug font-medium">{label}</p>
        )}
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function AppearancePanel() {
  const t = useT();
  const language = usePrefsStore((s) => s.language);
  const setLanguage = usePrefsStore((s) => s.setLanguage);
  const { theme, setTheme } = useTheme();
  return (
    <Panel>
      <PanelHeader
        title="Language and appearance"
        description="Applies to this browser only"
      />
      <div
        role="group"
        aria-labelledby="settings-language"
        className="px-4 py-3.5"
      >
        <p id="settings-language" className="text-sm font-medium">
          {t("language.label")}
        </p>
        <RadioGroup
          value={language}
          onValueChange={(next) => setLanguage(next as LanguageCode)}
          className="mt-2.5 grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {LANGUAGES.map((option) => (
            <label
              key={option.code}
              htmlFor={`language-${option.code}`}
              lang={option.htmlLang}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5",
                language === option.code
                  ? "border-primary/60 bg-accent/60"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <RadioGroupItem
                id={`language-${option.code}`}
                value={option.code}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  {option.native}
                </span>
                <span className="block text-xs text-muted-foreground" lang="en">
                  {option.english}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          Navigation and status labels follow the language. Operational text in
          the consoles stays in English.
        </p>
      </div>
      <div className="border-t border-border/70 px-4 py-3.5">
        <p className="text-sm font-medium">{t("theme.label")}</p>
        <Segmented<ThemeChoice>
          label={t("theme.label")}
          value={theme}
          onChange={setTheme}
          stretch
          className="mt-2.5"
          options={[
            { value: "light", label: t("theme.light"), icon: Sun },
            { value: "dark", label: t("theme.dark"), icon: Moon },
            { value: "system", label: t("theme.system"), icon: Monitor },
          ]}
        />
      </div>
    </Panel>
  );
}

function AlertsPanel() {
  const alerts = useNotificationPrefs((s) => s.alerts);
  const setAlert = useNotificationPrefs((s) => s.setAlert);
  const reset = useNotificationPrefs((s) => s.resetNotificationPrefs);
  const changed = ALERT_OPTIONS.some((option) => !alerts[option.key]);
  return (
    <Panel>
      <PanelHeader
        title="Notification preferences"
        description="Which alerts interrupt you on this workstation. Everything still reaches the notification centre."
        actions={
          <Button
            variant="ghost"
            size="sm"
            disabled={!changed}
            onClick={() => {
              reset();
              toast.success("Notification preferences restored");
            }}
          >
            Restore defaults
          </Button>
        }
      />
      <div className="divide-y divide-border/70">
        <SettingRow
          id="alert-critical"
          label="Critical incidents"
          description="Always on. A critical incident cannot be silenced from a console."
        >
          <Switch id="alert-critical" checked disabled />
        </SettingRow>
        {ALERT_OPTIONS.map((option) => (
          <SettingRow
            key={option.key}
            id={`alert-${option.key}`}
            label={option.label}
            description={option.description}
          >
            <Switch
              id={`alert-${option.key}`}
              checked={alerts[option.key]}
              onCheckedChange={(checked) => setAlert(option.key, checked)}
            />
          </SettingRow>
        ))}
      </div>
    </Panel>
  );
}

function SessionPanel() {
  const { persona } = useSession();
  const now = useNow();
  const mfaVerifiedAt = usePrefsStore((s) => s.mfaVerifiedAt);
  const query = useQuery({
    queryKey: ["session", persona.id],
    queryFn: () => services.auth.getSession(persona.id),
  });
  const extend = useAction(services.auth.extendSession, {
    success: "Session extended by 30 minutes",
    onSuccess: () => void query.refetch(),
  });

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="This session"
        description="Staff access is tied to a device and a verified session"
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={extend.pending || !query.data}
            onClick={() => extend.run(persona.id)}
          >
            <TimerReset aria-hidden /> Extend session
          </Button>
        }
      />
      {query.isPending ? (
        <div
          aria-busy="true"
          aria-label="Loading session"
          className="grid grid-cols-2 gap-4 px-4 py-4"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32 max-w-full" />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          compact
          offline={
            query.error instanceof ServiceError &&
            query.error.code === "offline"
          }
          title="Session details could not be loaded."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 px-4 py-4">
            <Field label="Signed in as" className="col-span-2">
              {persona.name}
              <span className="font-normal text-muted-foreground">
                {" "}
                · {persona.title}
              </span>
            </Field>
            <Field label="Device" className="col-span-2">
              {query.data.device}
            </Field>
            <Field label="Signed in">
              <span className="tnum">{formatTime(query.data.startedAt)}</span>
            </Field>
            <Field label="Expires in">
              <span className="tnum font-mono">
                {now
                  ? formatDuration((query.data.expiresAt - now) / 1000)
                  : "—"}
              </span>
            </Field>
            <Field label="Last address">
              <span className="font-mono text-[13px] font-normal">
                {query.data.lastIp}
              </span>
            </Field>
            <Field label="Second factor">
              <ToneChip tone={mfaVerifiedAt ? "resolved" : "medium"} dot>
                {mfaVerifiedAt ? "Verified" : "Not verified"}
              </ToneChip>
            </Field>
          </dl>
          <p className="border-t border-border/70 bg-inset px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {mfaVerifiedAt
              ? `Second factor verified at ${formatTime(mfaVerifiedAt)}. Sensitive actions such as evidence export are unlocked for this session.`
              : "Sensitive actions such as evidence export need a second factor. Verify from the account menu, under Session and security."}{" "}
            All values here are simulated.
          </p>
        </>
      )}
    </Panel>
  );
}

function ShortcutsPanel() {
  const openPalette = useCommandPalette((s) => s.setOpen);
  return (
    <Panel>
      <PanelHeader
        title="Keyboard shortcuts"
        actions={
          <Button variant="outline" size="sm" onClick={() => openPalette(true)}>
            <Search aria-hidden /> Open search
          </Button>
        }
      />
      <dl className="divide-y divide-border/70">
        {[
          {
            label: "Search and jump anywhere",
            keys: (
              <>
                <Kbd>Ctrl</Kbd>
                <span className="text-xs text-muted-foreground">or</span>
                <Kbd>⌘</Kbd>
                <span aria-hidden className="text-xs text-muted-foreground">
                  +
                </span>
                <Kbd>K</Kbd>
              </>
            ),
            spoken: "Control or Command, plus K",
          },
          {
            label: "Send a message or note",
            keys: <Kbd>Enter</Kbd>,
            spoken: "Enter",
          },
          {
            label: "New line in a message",
            keys: (
              <>
                <Kbd>Shift</Kbd>
                <span aria-hidden className="text-xs text-muted-foreground">
                  +
                </span>
                <Kbd>Enter</Kbd>
              </>
            ),
            spoken: "Shift plus Enter",
          },
          {
            label: "Close a dialog, menu or side panel",
            keys: <Kbd>Esc</Kbd>,
            spoken: "Escape",
          },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 px-4 py-2.5"
          >
            <dt className="text-sm">{row.label}</dt>
            <dd
              aria-label={row.spoken}
              className="flex shrink-0 items-center gap-1.5"
            >
              {row.keys}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function PermissionsPanel() {
  const { role, permissions } = useSession();
  const roles = useDemoStore((s) => s.roles);
  const definition = roles.find((r) => r.key === role);
  const granted = new Set(permissions);

  return (
    <Panel className="overflow-hidden lg:col-span-2">
      <PanelHeader
        title="Role and permissions"
        description={`${permissions.length} of ${PERMISSIONS.length} permissions granted · read-only`}
      />
      <div className="border-b border-border/70 px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{definition?.name ?? "Role"}</p>
          {definition && (
            <ToneChip tone="neutral" variant="outline">
              Scope: {SCOPE_LABEL[definition.scope]}
            </ToneChip>
          )}
        </div>
        {definition && (
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
            {definition.description}
          </p>
        )}
      </div>
      {permissions.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          This role has no permissions in the control room.
        </p>
      ) : (
        <div className="grid gap-x-8 gap-y-5 px-4 py-4 sm:grid-cols-2 xl:grid-cols-3">
          {PERMISSION_GROUPS.map((group) => {
            const items = PERMISSIONS.filter(
              (p) => p.group === group && granted.has(p.key),
            );
            if (items.length === 0) return null;
            return (
              <section key={group} className="min-w-0">
                <h3 className="text-xs font-medium text-muted-foreground">
                  {group}
                </h3>
                <ul className="mt-2 space-y-2.5">
                  {items.map((permission) => (
                    <li key={permission.key} className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                        {permission.label}
                        {permission.sensitive && (
                          <SensitiveBadge label="Sensitive" />
                        )}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {permission.description}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] break-all text-subtle">
                        {permission.key}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <p className="border-t border-border/70 bg-inset px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
        Permissions are granted by an administrator and follow least privilege:
        a role holds only what its work needs. Changes are written to the audit
        log.
      </p>
    </Panel>
  );
}

function DemoPanel() {
  const t = useT();
  const paused = usePrefsStore((s) => s.simulationPaused);
  const setPaused = usePrefsStore((s) => s.setSimulationPaused);
  const connectivity = usePrefsStore((s) => s.connectivity);
  const setConnectivity = usePrefsStore((s) => s.setConnectivity);
  const resetPrefs = usePrefsStore((s) => s.resetPrefs);
  const [confirming, setConfirming] = useState(false);

  const reset = () => {
    void services.demo
      .reset()
      .then(() => {
        resetPrefs();
        toast.success("Demo reset", { description: `${deployment.productName} is back to its starting data.` });
      })
      .catch(() => toast.error("Could not reset the demo. Is the server running?"));
  };

  return (
    <Panel>
      <PanelHeader
        title="Demo controls"
        description="For whoever is presenting. These also live in the banner at the top."
      />
      <div className="divide-y divide-border/70">
        <SettingRow
          id="demo-pause"
          label="Pause simulation"
          description={
            paused
              ? "Paused. Nothing moves unless someone acts from a console."
              : "Running. New incidents arrive and scripted incidents move along on their own."
          }
        >
          <Switch
            id="demo-pause"
            checked={paused}
            onCheckedChange={setPaused}
          />
        </SettingRow>
        <div className="px-4 py-3">
          <p className="text-sm font-medium">Connection</p>
          <Segmented<Connectivity>
            label="Simulated connection"
            value={connectivity}
            onChange={setConnectivity}
            stretch
            className="mt-2.5"
            options={NETWORK.map((value) => ({
              value,
              label: t(CONNECTIVITY_META[value].labelKey),
              icon: CONNECTIVITY_META[value].icon,
            }))}
          />
          <p
            role="status"
            className="mt-2 text-xs leading-relaxed text-muted-foreground"
          >
            {NETWORK_NOTE[connectivity]}
          </p>
        </div>
        <SettingRow
          label="Reset demo"
          description="Puts every incident, unit, complaint and evidence item back to the starting data, and clears privacy choices and second-factor verification."
        >
          <Button variant="destructive" onClick={() => setConfirming(true)}>
            <RotateCcw aria-hidden /> Reset demo
          </Button>
        </SettingRow>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the demonstration?</AlertDialogTitle>
            <AlertDialogDescription>
              Everything done in this session is discarded and the starting data
              is restored for every role. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={reset}>
              Reset demo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

function DisclaimerPanel() {
  return (
    <Panel inset className="lg:col-span-2">
      <div className="flex items-start gap-3 px-4 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-medium-soft text-medium-fg">
          <FlaskConical aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Demonstration environment</h2>
          <p className="mt-1 text-sm leading-relaxed">
            {deployment.disclaimer} {deployment.realEmergencyHint}
          </p>
          <ul className="mt-2.5 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-muted-foreground">
            <li>
              Every person, station, unit, incident and complaint shown is
              invented.
            </li>
            <li>
              No call, SMS, camera, microphone or telecom network is used. Voice
              and video sessions are simulated.
            </li>
            <li>
              Complaints here are not FIRs or statutory filings, and response
              targets and escalation policies are demonstration values, not
              official police rules.
            </li>
            <li>
              Evidence hashes are demo values. Nothing is uploaded and nothing
              leaves this browser.
            </li>
          </ul>
        </div>
      </div>
    </Panel>
  );
}

export function SettingsScreen() {
  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Preferences for this console, your session and role, and the controls for presenting the demonstration."
      />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <AppearancePanel />
          <SessionPanel />
          <ShortcutsPanel />
        </div>
        <div className="min-w-0 space-y-5">
          <AlertsPanel />
          <DemoPanel />
        </div>
        <PermissionsPanel />
        <DisclaimerPanel />
      </div>
    </PageContainer>
  );
}
