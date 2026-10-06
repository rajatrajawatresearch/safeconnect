"use client";

import { ArrowRight, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CONNECTIVITY_META } from "@/components/layout/top-controls";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { BlankState } from "@/components/shared/states";
import { ToneChip } from "@/components/shared/status-chips";
import { RelativeTime } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { deployment } from "@/config/deployment";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { LANGUAGES } from "@/lib/i18n";
import { citizen } from "@/lib/i18n/dictionaries/citizen";
import { citizenFlows } from "@/lib/i18n/dictionaries/citizen-flows";
import { common } from "@/lib/i18n/dictionaries/common";
import { officer } from "@/lib/i18n/dictionaries/officer";
import { staff as staffDictionary } from "@/lib/i18n/dictionaries/staff";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Connectivity, LanguageCode, NotificationTemplate } from "@/types";
import {
  CHANNEL_LABEL,
  SENSITIVE_PERMISSIONS,
  isStaffRole,
  plural,
} from "./admin-meta";
import {
  RETENTION_OPTIONS,
  retentionLabel,
  useAdminSettings,
  type AuditRetention,
} from "./admin-settings-store";
import { ConfirmDialog, useKeyedAction } from "./admin-ui";
import { TemplateDialog, TemplateText } from "./template-dialog";

/** Matches the session length the demo authentication service issues. */
const SESSION_TIMEOUT_MIN = 30;

const DICTIONARIES = [common, citizen, citizenFlows, officer, staffDictionary];
const CONNECTIVITY: Connectivity[] = ["online", "weak", "offline"];

/** How many interface strings each language has, counted from the dictionaries themselves. */
const TRANSLATION_COVERAGE = (() => {
  const total = DICTIONARIES.reduce(
    (sum, d) => sum + Object.keys(d.en).length,
    0,
  );
  const translated = (code: LanguageCode) =>
    DICTIONARIES.reduce((sum, d) => sum + Object.keys(d[code]).length, 0);
  return {
    total,
    byLanguage: Object.fromEntries(
      LANGUAGES.map((l) => [l.code, translated(l.code)]),
    ) as Record<LanguageCode, number>,
  };
})();

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="grid scroll-mt-6 grid-cols-1 gap-x-8 gap-y-3 border-t border-border pt-6 first:border-t-0 first:pt-0 lg:grid-cols-[15rem_minmax(0,1fr)]"
    >
      <div className="min-w-0">
        <h2 id={`${id}-title`} className="text-base font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3">{children}</div>
    </section>
  );
}

/** One setting: what it is on the left, its control on the right. */
function SettingRow({
  label,
  htmlFor,
  description,
  children,
}: {
  label: string;
  htmlFor?: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5">
      <div className="min-w-0 flex-1 basis-60">
        {htmlFor ? (
          <Label htmlFor={htmlFor}>{label}</Label>
        ) : (
          <p className="text-sm leading-none font-medium">{label}</p>
        )}
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ───────────────────────── Localisation ───────────────────────── */

function Localisation() {
  const { actor } = useSession();
  const language = usePrefsStore((s) => s.language);
  const setLanguage = usePrefsStore((s) => s.setLanguage);

  const change = useAction(
    async (code: LanguageCode) => {
      const next = LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
      await services.audit.record(
        {
          action: "Default language changed",
          category: "admin",
          detail: next.english,
        },
        actor,
      );
      setLanguage(next.code);
      return next;
    },
    { success: (next) => `Default language set to ${next.english}` },
  );

  return (
    <Section
      id="localisation"
      title="Localisation"
      description="The languages the apps are offered in, and the one people see first."
    >
      <Panel>
        <RadioGroup
          aria-label="Default language"
          value={language}
          disabled={change.pending}
          onValueChange={(value) => void change.run(value as LanguageCode)}
          className="gap-0 divide-y divide-border/70"
        >
          {LANGUAGES.map((l) => {
            const id = `language-${l.code}`;
            const translated = TRANSLATION_COVERAGE.byLanguage[l.code];
            const percent = Math.round(
              (translated / TRANSLATION_COVERAGE.total) * 100,
            );
            return (
              <div key={l.code} className="flex items-center gap-3 px-4 py-3">
                <RadioGroupItem id={id} value={l.code} />
                <label htmlFor={id} className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span lang={l.htmlLang} className="text-sm font-medium">
                      {l.native}
                    </span>
                    {l.native !== l.english && (
                      <span className="text-[13px] text-muted-foreground">
                        {l.english}
                      </span>
                    )}
                    <span className="font-mono text-[11px] text-subtle">
                      {l.htmlLang}
                    </span>
                  </span>
                  <span className="tnum mt-0.5 block text-xs text-muted-foreground">
                    {l.code === "en"
                      ? `Source language · ${translated} interface strings`
                      : `${translated} of ${TRANSLATION_COVERAGE.total} interface strings translated (${percent}%)`}
                  </span>
                </label>
                {language === l.code && (
                  <ToneChip tone="normal">Default</ToneChip>
                )}
              </div>
            );
          })}
        </RadioGroup>
      </Panel>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Adding a language means adding it to the language list and a block of
        strings to each dictionary. Anything not translated yet falls back to
        English, so a language can be rolled out one screen at a time. Citizens
        and staff can still pick their own language from the top bar.
      </p>
    </Section>
  );
}

/* ───────────────────────── Notification templates ───────────────────────── */

function Templates() {
  const { actor } = useSession();
  const templates = useDemoStore((s) => s.templates);
  const roles = useDemoStore((s) => s.roles);
  const language = usePrefsStore((s) => s.language);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);

  const setEnabled = useKeyedAction(
    async (template: NotificationTemplate, enabled: boolean) => {
      await services.admin.updateTemplate(template.id, { enabled }, actor);
      return { name: template.name, enabled };
    },
    {
      success: ({ name, enabled }) =>
        `“${name}” switched ${enabled ? "on" : "off"}`,
    },
  );
  const htmlLang = LANGUAGES.find((l) => l.code === language)?.htmlLang;

  return (
    <Section
      id="templates"
      title="Notification templates"
      description="The wording of each message the platform would send, in every language. No push, SMS or in-app message leaves this prototype."
    >
      <Panel>
        {templates.length === 0 ? (
          <BlankState
            compact
            title="No templates are defined"
            description="Reset the demo below to restore the starting templates."
          />
        ) : (
          <ul className="divide-y divide-border/70">
            {templates.map((template) => {
              const audience =
                roles.find((r) => r.key === template.audience)?.name ??
                template.audience;
              return (
                <li
                  key={template.id}
                  className="flex flex-wrap items-start gap-x-4 gap-y-3 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-sm font-medium">{template.name}</h3>
                      <ToneChip tone="neutral" variant="outline">
                        {CHANNEL_LABEL[template.channel]}
                      </ToneChip>
                      <span className="text-xs text-muted-foreground">
                        To: {audience}
                      </span>
                    </div>
                    <p
                      lang={htmlLang}
                      className={cn(
                        "mt-1.5 text-[13px] leading-relaxed",
                        template.enabled
                          ? "text-muted-foreground"
                          : "text-subtle",
                      )}
                    >
                      <TemplateText text={template.body[language]} />
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      aria-label={`Send “${template.name}”`}
                      checked={template.enabled}
                      disabled={setEnabled.isPending(template.id)}
                      onCheckedChange={(checked) =>
                        void setEnabled.run(template.id, template, checked)
                      }
                    />
                    <Button
                      variant="outline"
                      onClick={() => setEditing(template)}
                    >
                      <Pencil aria-hidden /> Edit
                      <span className="sr-only"> “{template.name}”</span>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      {editing && (
        <TemplateDialog template={editing} onClose={() => setEditing(null)} />
      )}
    </Section>
  );
}

/* ───────────────────────── Audit settings ───────────────────────── */

function AuditSettings() {
  const { actor } = useSession();
  const retention = useAdminSettings((s) => s.auditRetention);
  const exportApproval = useAdminSettings((s) => s.exportApproval);
  const setRetention = useAdminSettings((s) => s.setAuditRetention);
  const setExportApproval = useAdminSettings((s) => s.setExportApproval);

  // Each change is written to the audit log first; the setting only moves if that succeeds.
  const changeRetention = useAction(
    async (value: AuditRetention) => {
      await services.audit.record(
        {
          action: "Audit setting changed",
          category: "admin",
          detail: `Retention period · ${retentionLabel(retention)} → ${retentionLabel(value)}`,
        },
        actor,
      );
      setRetention(value);
    },
    { success: "Retention period saved" },
  );
  const changeApproval = useAction(
    async (value: boolean) => {
      await services.audit.record(
        {
          action: "Audit setting changed",
          category: "admin",
          detail: `Purpose required to export · ${value ? "on" : "off"}`,
        },
        actor,
      );
      setExportApproval(value);
      return value;
    },
    {
      success: (value) =>
        value
          ? "Exports now require a purpose"
          : "Exports no longer require a purpose",
    },
  );

  return (
    <Section
      id="audit"
      title="Audit settings"
      description={
        <>
          How long the audit trail is kept and what it takes to export it. The
          log itself cannot be edited from anywhere.{" "}
          <Link
            href="/admin/audit"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Open the audit log
          </Link>
        </>
      }
    >
      <Panel className="divide-y divide-border/70">
        <SettingRow
          label="Retention period"
          htmlFor="audit-retention"
          description="How long entries are kept before archival. A demonstration value, not a statutory period."
        >
          <Select
            value={retention}
            disabled={changeRetention.pending}
            onValueChange={(value) =>
              value !== retention &&
              void changeRetention.run(value as AuditRetention)
            }
          >
            <SelectTrigger
              id="audit-retention"
              className="w-36 data-[size=default]:h-9"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {RETENTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          label="Require a purpose to export"
          htmlFor="audit-export-approval"
          description="Anyone exporting audit entries must first state why. The purpose is written to the log with their name."
        >
          <Switch
            id="audit-export-approval"
            checked={exportApproval}
            disabled={changeApproval.pending}
            onCheckedChange={(checked) => void changeApproval.run(checked)}
          />
        </SettingRow>
      </Panel>
    </Section>
  );
}

/* ───────────────────────── Security policy ───────────────────────── */

function SecurityPolicy() {
  const roles = useDemoStore((s) => s.roles);
  const staff = useDemoStore((s) => s.staff);

  const summary = useMemo(() => {
    const requiring = roles.filter(
      (r) =>
        isStaffRole(r.key) &&
        r.permissions.some((p) => SENSITIVE_PERMISSIONS.includes(p)),
    );
    const keys = new Set(requiring.map((r) => r.key));
    const covered = staff.filter(
      (u) => u.status === "active" && keys.has(u.role),
    );
    return {
      requiring,
      covered: covered.length,
      withFactor: covered.filter((u) => u.mfaEnabled).length,
    };
  }, [roles, staff]);
  const gap = summary.covered - summary.withFactor;

  return (
    <Section
      id="security"
      title="Security policy"
      description="How staff access is protected. A summary of what the platform enforces, worked out from the roles as they stand."
    >
      <Panel className="divide-y divide-border/70">
        <div className="px-4 py-3.5">
          <p className="text-sm leading-none font-medium">Second factor</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Required for every role that holds a sensitive permission.
          </p>
          {summary.requiring.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted-foreground">
              No staff role holds a sensitive permission at the moment.
            </p>
          ) : (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {summary.requiring.map((role) => (
                <li key={role.key}>
                  <ToneChip tone="neutral" variant="outline">
                    {role.name}
                  </ToneChip>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-[13px]">
              <span className="tnum font-medium">
                {summary.withFactor} of {summary.covered}
              </span>{" "}
              <span className="text-muted-foreground">
                active users in these roles have it switched on.
              </span>
            </p>
            {gap > 0 && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/users?status=active&mfa=off">
                  Review users <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </div>
        <div className="px-4 py-3.5">
          <p className="text-sm leading-none font-medium">Session timeout</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Consoles sign out after{" "}
            <span className="tnum font-medium text-foreground">
              {SESSION_TIMEOUT_MIN} minutes
            </span>{" "}
            without activity, with a one-minute warning first. Open incidents
            stay with the shift.
          </p>
        </div>
        <div className="px-4 py-3.5">
          <p className="text-sm leading-none font-medium">Access record</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Sign-ins, refused access and every view of evidence are written to
            the audit log. Citizen phone numbers and names are masked for staff.
          </p>
        </div>
      </Panel>
    </Section>
  );
}

/* ───────────────────────── Demo configuration ───────────────────────── */

function DemoConfiguration() {
  const t = useT();
  const paused = usePrefsStore((s) => s.simulationPaused);
  const setPaused = usePrefsStore((s) => s.setSimulationPaused);
  const connectivity = usePrefsStore((s) => s.connectivity);
  const setConnectivity = usePrefsStore((s) => s.setConnectivity);
  const resetPrefs = usePrefsStore((s) => s.resetPrefs);
  const seededAt = useDemoStore((s) => s.seededAt);
  const incidentCount = useDemoStore((s) => s.incidents.length);
  const auditCount = useDemoStore((s) => s.audit.length);
  const [confirming, setConfirming] = useState(false);

  const reset = () => {
    void services.demo
      .reset()
      .then(() => {
        resetPrefs();
        useAdminSettings.getState().reset();
        setConfirming(false);
        toast.success("Demo reset", { description: `${deployment.productName} is back to its starting data.` });
      })
      .catch(() => toast.error("Could not reset the demo. Is the server running?"));
  };

  return (
    <Section
      id="demo"
      title="Demo configuration"
      description="Controls for the demonstration itself. None of this exists in a live deployment."
    >
      <Panel className="divide-y divide-border/70">
        <SettingRow
          label="Run the simulator"
          htmlFor="demo-simulator"
          description="Stands in for other operators, officers in the field and incoming calls, and evaluates the escalation rules. Switch it off to perform every step by hand."
        >
          <Switch
            id="demo-simulator"
            checked={!paused}
            onCheckedChange={(checked) => {
              setPaused(!checked);
              toast.success(checked ? "Simulator running" : "Simulator paused");
            }}
          />
        </SettingRow>
        <SettingRow
          label="Connection"
          description="Simulates the network for every role. On a weak network requests are slow; offline, commands fail and an SOS is queued."
        >
          <ToggleGroup
            type="single"
            variant="outline"
            size="lg"
            spacing={0}
            aria-label="Simulated connection"
            value={connectivity}
            onValueChange={(value) =>
              value && setConnectivity(value as Connectivity)
            }
          >
            {CONNECTIVITY.map((value) => {
              const Icon = CONNECTIVITY_META[value].icon;
              const label = t(CONNECTIVITY_META[value].labelKey);
              return (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  aria-label={label}
                  className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                >
                  <Icon aria-hidden />
                  {/* The narrowest phones get the first word only, as in the demo banner. */}
                  <span className="sm:hidden">{label.split(" ")[0]}</span>
                  <span className="max-sm:hidden">{label}</span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </SettingRow>
        <SettingRow
          label="Demo data"
          description={
            <>
              Loaded <RelativeTime at={seededAt} friendly /> ·{" "}
              <span className="tnum">
                {plural(incidentCount, "incident")} ·{" "}
                {plural(auditCount, "audit entry", "audit entries")}
              </span>
              . Resetting discards everything done since, for every role,
              including the changes made in this console.
            </>
          }
        >
          <Button
            variant="destructive"
            size="lg"
            onClick={() => setConfirming(true)}
          >
            <RotateCcw aria-hidden /> Reset demo
          </Button>
        </SettingRow>
      </Panel>
      {confirming && (
        <ConfirmDialog
          open
          onOpenChange={setConfirming}
          title="Reset the demo?"
          description="Incidents, messages, evidence, complaints, users, roles, policies and the audit log all return to their starting state. Language and the current role are kept."
          confirmLabel="Reset demo"
          variant="destructive"
          onConfirm={reset}
        />
      )}
    </Section>
  );
}

export function SettingsScreen() {
  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Languages, the messages people receive, how the audit trail is kept, and the controls for this demonstration."
      />
      <div className="grid grid-cols-1 gap-6">
        <Localisation />
        <Templates />
        <AuditSettings />
        <SecurityPolicy />
        <DemoConfiguration />
      </div>
    </PageContainer>
  );
}
