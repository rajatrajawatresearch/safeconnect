"use client";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  CircleSlash,
  Plug,
  Scale,
  TriangleAlert,
  Unplug,
  type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { BlankState } from "@/components/shared/states";
import { ToneChip } from "@/components/shared/status-chips";
import { ClockStamp } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { ServiceError, services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type { Integration } from "@/types";
import {
  DIRECTION_LABEL,
  INTEGRATION_STATUSES,
  INTEGRATION_STATUS_META,
  plural,
} from "./admin-meta";
import { ConfirmDialog, FilterSelect, Spinner, type Option } from "./admin-ui";

type StatusFilter = Integration["status"] | "all";

const DIRECTION_ICON: Record<Integration["direction"], LucideIcon> = {
  inbound: ArrowDownLeft,
  outbound: ArrowUpRight,
  bidirectional: ArrowLeftRight,
};

interface TestResult {
  /** The status the adapter had when it was checked; a result is dropped once the status changes. */
  status: Integration["status"];
  outcome: "ok" | "warn" | "off" | "failed";
  message: string;
  at: number;
}

const TEST_OUTCOME: Record<
  Integration["status"],
  Pick<TestResult, "outcome" | "message">
> = {
  placeholder: {
    outcome: "warn",
    message: "No endpoint configured for this adapter",
  },
  sandbox: { outcome: "ok", message: "Sandbox responded in 212 ms" },
  disabled: { outcome: "off", message: "Adapter is disabled" },
};

const OUTCOME_STYLE: Record<
  TestResult["outcome"],
  { icon: LucideIcon; className: string }
> = {
  ok: { icon: CircleCheck, className: "text-resolved-fg" },
  warn: { icon: TriangleAlert, className: "text-medium-fg" },
  off: { icon: CircleSlash, className: "text-muted-foreground" },
  failed: { icon: Unplug, className: "text-high-fg" },
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function AdapterPattern() {
  const steps = [
    { title: "Platform services", detail: "Incidents, dispatch, hand-off" },
    { title: "Adapter interface", detail: "AgencyAdapter", mono: true },
    { title: "Agency system", detail: "Not connected in this prototype" },
  ];
  return (
    <Panel className="p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">
            Each agency sits behind an adapter
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            The platform never calls another agency&apos;s system directly. It
            calls one small interface, and an adapter behind that interface
            speaks to the agency. An agency can be connected, replaced or
            switched off without changing any console.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            In this prototype every adapter is a stand-in. No real government
            system is connected and no data leaves this browser.
          </p>
        </div>
        <ol
          aria-label="How a request reaches an agency"
          className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center"
        >
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center"
            >
              {index > 0 && (
                <ArrowRight
                  aria-hidden
                  className="size-4 shrink-0 rotate-90 self-center text-subtle sm:rotate-0"
                />
              )}
              <div
                className={cn(
                  "min-w-0 flex-1 rounded-lg border px-3 py-2.5",
                  index === 1
                    ? "border-primary/40 bg-accent"
                    : "border-border bg-inset",
                  index === 2 && "border-dashed",
                )}
              >
                <p className="text-[13px] font-medium">{step.title}</p>
                <p
                  className={cn(
                    "mt-0.5 text-xs text-muted-foreground",
                    step.mono && "font-mono",
                  )}
                >
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const { actor } = useSession();
  const [result, setResult] = useState<TestResult | null>(null);
  const [pendingStatus, setPendingStatus] = useState<
    Integration["status"] | null
  >(null);
  const meta = INTEGRATION_STATUS_META[integration.status];
  const DirectionIcon = DIRECTION_ICON[integration.direction];

  const setStatus = useAction(
    async (status: Integration["status"]) => {
      await services.admin.setIntegrationStatus(integration.id, status, actor);
      return status;
    },
    {
      success: (status) =>
        `${integration.name} set to ${INTEGRATION_STATUS_META[status].label.toLowerCase()}`,
      onSuccess: () => setPendingStatus(null),
    },
  );

  const test = useAction(async () => {
    const status = integration.status;
    // Stands in for the round trip to the adapter. Nothing leaves the browser.
    await wait(900);
    try {
      await services.audit.record(
        {
          action: "Integration connection tested",
          category: "admin",
          detail: `${integration.name} · ${TEST_OUTCOME[status].message}`,
          entityId: integration.id,
        },
        actor,
      );
      setResult({ status, ...TEST_OUTCOME[status], at: Date.now() });
    } catch (error) {
      setResult({
        status,
        outcome: "failed",
        message:
          error instanceof ServiceError && error.code === "offline"
            ? "Connection interrupted. The check could not run"
            : "The check could not run. Try again",
        at: Date.now(),
      });
    }
  });

  const onStatus = (next: Integration["status"]) => {
    if (next === integration.status) return;
    // Switching on an adapter that carries a legal condition is a deliberate, confirmed step.
    if (integration.legalNote && next === "sandbox") setPendingStatus(next);
    else void setStatus.run(next);
  };

  const shown = result && result.status === integration.status ? result : null;
  const Outcome = shown ? OUTCOME_STYLE[shown.outcome].icon : null;
  const selectId = `integration-status-${integration.id}`;

  return (
    <Panel as="article" className="flex min-w-0 flex-col">
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold">{integration.name}</h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {integration.agency}
            </p>
          </div>
          <ToneChip tone={meta.tone} dot>
            {meta.label}
          </ToneChip>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <code className="max-w-full truncate rounded-md border border-border bg-inset px-1.5 py-0.5 font-mono text-xs">
            {integration.adapter}
          </code>
          <ToneChip tone="neutral" variant="outline">
            <DirectionIcon aria-hidden className="size-3" />
            {DIRECTION_LABEL[integration.direction]}
          </ToneChip>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {integration.description}
        </p>

        {integration.legalNote && (
          <p className="flex gap-2 rounded-lg border border-medium/40 bg-medium-soft px-3 py-2 text-[13px] leading-relaxed">
            <Scale
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0 text-medium-fg"
            />
            <span>
              <span className="font-medium">Legal condition. </span>
              {integration.legalNote}
            </span>
          </p>
        )}
      </div>

      <div className="border-t border-border/70 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-36 flex-1">
            <label htmlFor={selectId} className="text-xs text-muted-foreground">
              Status
            </label>
            <Select
              value={integration.status}
              disabled={setStatus.pending}
              onValueChange={(value) =>
                onStatus(value as Integration["status"])
              }
            >
              <SelectTrigger
                id={selectId}
                className="mt-1 w-full data-[size=default]:h-9"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                {INTEGRATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {INTEGRATION_STATUS_META[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="lg"
            disabled={test.pending}
            onClick={() => void test.run()}
          >
            {test.pending ? <Spinner /> : <Plug aria-hidden />}
            Test connection
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{meta.description}</p>
        <p
          role="status"
          className={cn(
            "mt-2 flex min-h-5 items-center gap-1.5 text-[13px]",
            shown && !test.pending && OUTCOME_STYLE[shown.outcome].className,
          )}
        >
          {test.pending ? (
            <span className="text-muted-foreground">
              Checking {integration.adapter}…
            </span>
          ) : shown && Outcome ? (
            <>
              <Outcome aria-hidden className="size-4 shrink-0" />
              <span className="min-w-0 font-medium">{shown.message}</span>
              <span className="text-muted-foreground">·</span>
              <ClockStamp at={shown.at} />
            </>
          ) : (
            <span className="text-subtle">Not tested in this session</span>
          )}
        </p>
      </div>

      {pendingStatus && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPendingStatus(null)}
          title={`Move ${integration.name} to sandbox?`}
          description="This adapter carries a legal condition. Confirm that the condition is met before it is switched on, even against a simulated endpoint. The change is written to the audit log."
          confirmLabel="Move to sandbox"
          pending={setStatus.pending}
          onConfirm={() => setStatus.run(pendingStatus)}
        >
          <p className="rounded-lg border border-medium/40 bg-medium-soft px-3 py-2 text-[13px] leading-relaxed">
            {integration.legalNote}
          </p>
        </ConfirmDialog>
      )}
    </Panel>
  );
}

export function IntegrationsScreen() {
  const params = useSearchParams();
  const integrations = useDemoStore((s) => s.integrations);
  const [status, setStatus] = useState<StatusFilter>(() => {
    const value = params.get("status");
    return INTEGRATION_STATUSES.includes(value as Integration["status"])
      ? (value as Integration["status"])
      : "all";
  });

  const options = useMemo<Option<StatusFilter>[]>(
    () => [
      { value: "all", label: `All statuses (${integrations.length})` },
      ...INTEGRATION_STATUSES.map((value) => ({
        value,
        label: `${INTEGRATION_STATUS_META[value].label} (${integrations.filter((i) => i.status === value).length})`,
      })),
    ],
    [integrations],
  );
  const rows = useMemo(
    () =>
      status === "all"
        ? integrations
        : integrations.filter((i) => i.status === status),
    [integrations, status],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Integrations"
        description="Adapters to other agencies: emergency response, ambulance, fire, disaster management, cybercrime, existing police systems and identity services."
      />

      <AdapterPattern />

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          Agency adapters{" "}
          <span className="tnum font-normal text-muted-foreground">
            · {plural(rows.length, "adapter")}
            {status !== "all" && ` of ${integrations.length}`}
          </span>
        </h2>
        <FilterSelect
          className="w-56 max-w-full"
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={options}
        />
      </div>

      {rows.length === 0 ? (
        <Panel>
          <BlankState
            icon={Plug}
            title={
              integrations.length === 0
                ? "No adapters are defined"
                : `No adapter is ${status === "all" ? "listed" : INTEGRATION_STATUS_META[status].label.toLowerCase()}`
            }
            description={
              integrations.length === 0
                ? "Reset the demo from Settings to restore the starting adapters."
                : "Choose another status to see the rest."
            }
            action={
              integrations.length > 0 && (
                <Button variant="outline" onClick={() => setStatus("all")}>
                  Show all adapters
                </Button>
              )
            }
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
