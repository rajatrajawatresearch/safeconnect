"use client";

import {
  Check,
  ChevronDown,
  FastForward,
  FlaskConical,
  Pause,
  Play,
  RotateCcw,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_SWITCH } from "@/config/navigation";
import { deployment } from "@/config/deployment";
import { personaById } from "@/data/demo/people";
import { useSwitchPersona } from "@/features/auth/use-switch-persona";
import { useMounted } from "@/hooks/use-mounted";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Connectivity } from "@/types";
import { CONNECTIVITY_META } from "./top-controls";

const NETWORK: Connectivity[] = ["online", "weak", "offline"];

/** Moves the most relevant scripted incident one step along, so a presenter never waits on a timer. */
async function advanceActiveSos(personaId: string) {
  try {
    const incidentId = await services.demo.advance(personaId);
    if (!incidentId) {
      toast("Nothing to advance. Raise an SOS as a citizen first.");
      return;
    }
    toast.success(`Advanced ${incidentId}`, { description: "Moved one step along the response chain." });
  } catch {
    toast.error("Could not reach the server to advance the incident.");
  }
}

/**
 * The always-visible demo strip: the disclaimer, plus the role switcher and presenter controls.
 * Slim on purpose — it must be impossible to miss and equally impossible to be annoyed by.
 */
export function DemoBanner() {
  const mounted = useMounted();
  const t = useT();
  const personaId = usePrefsStore((s) => s.personaId);
  const paused = usePrefsStore((s) => s.simulationPaused);
  const connectivity = usePrefsStore((s) => s.connectivity);
  const setConnectivity = usePrefsStore((s) => s.setConnectivity);
  const resetPrefs = usePrefsStore((s) => s.resetPrefs);
  const switchPersona = useSwitchPersona();
  const persona = personaById(personaId);
  const activeRole = ROLE_SWITCH.find((r) => r.role === persona.role);

  return (
    <div
      role="region"
      aria-label="Demonstration environment"
      className="relative z-40 flex h-(--banner-h) shrink-0 items-center justify-between gap-3 border-b border-border bg-secondary px-3 text-xs text-muted-foreground sm:px-4"
    >
      <p className="flex min-w-0 items-center gap-2">
        <FlaskConical
          aria-hidden
          className="size-3.5 shrink-0 text-medium-fg"
        />
        <span className="truncate lg:hidden">{t("demo.bannerShort")}</span>
        <span className="hidden truncate lg:inline">
          {t("demo.banner")}{" "}
          <span className="hidden text-subtle xl:inline">
            {t("demo.realEmergency")}
          </span>
        </span>
      </p>

      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-input bg-card px-2.5 font-medium text-foreground hover:bg-muted">
          {!mounted ? (
            <span>{t("demo.role")}</span>
          ) : (
            <>
              {paused && (
                <Pause aria-hidden className="size-3 text-medium-fg" />
              )}
              <span className="hidden text-muted-foreground sm:inline">
                {t("demo.role")}:
              </span>
              <span>{activeRole ? t(activeRole.labelKey) : persona.title}</span>
              <span className="hidden text-muted-foreground md:inline">
                · {persona.shortName}
              </span>
            </>
          )}
          <ChevronDown aria-hidden className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-[min(20rem,calc(100vw-1rem))]"
        >
          <DropdownMenuLabel>{t("demo.switchRole")}</DropdownMenuLabel>
          <DropdownMenuGroup>
            {ROLE_SWITCH.map(
              ({ role, labelKey, personaId: id, icon: Icon, blurb }) => {
                const p = personaById(id);
                return (
                  <DropdownMenuItem
                    key={role}
                    onSelect={() => switchPersona(id)}
                    className="items-start gap-3 py-2"
                  >
                    <Icon aria-hidden className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {t(labelKey)}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {p.name}
                        </span>
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {blurb}
                      </span>
                    </span>
                    {personaId === id && (
                      <Check aria-hidden className="mt-0.5" />
                    )}
                  </DropdownMenuItem>
                );
              },
            )}
            <DropdownMenuItem
              onSelect={() => switchPersona("cit-kavya")}
              className="items-start gap-3 py-2"
            >
              <User aria-hidden className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {t("role.citizen")}{" "}
                  <span className="font-normal text-muted-foreground">
                    · Kavya Patel
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  Has an SOS in progress
                </span>
              </span>
              {personaId === "cit-kavya" && (
                <Check aria-hidden className="mt-0.5" />
              )}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Simulation</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void services.demo.setSimulationPaused(!paused).catch(() => toast.error("Could not change the simulation."));
            }}
          >
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            {paused ? t("demo.resume") : t("demo.pause")}
            <span className="ml-auto text-xs text-muted-foreground">
              {paused ? "Paused" : "Running"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void advanceActiveSos(personaId);
            }}
          >
            <FastForward aria-hidden />
            {t("demo.advance")}
          </DropdownMenuItem>

          <div className="px-2 pt-1.5 pb-2">
            <p className="mb-1.5 text-xs text-muted-foreground">Connection</p>
            <div
              role="radiogroup"
              aria-label="Simulated connection"
              className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
            >
              {NETWORK.map((value) => {
                const meta = CONNECTIVITY_META[value];
                const Icon = meta.icon;
                const selected = connectivity === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setConnectivity(value)}
                    className={cn(
                      "flex h-7 items-center justify-center gap-1 rounded-md text-xs font-medium",
                      selected
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon aria-hidden className="size-3.5" />
                    {t(meta.labelKey).split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              void services.demo
                .reset()
                .then(() => {
                  resetPrefs();
                  toast.success("Demo reset", { description: `${deployment.productName} is back to its starting data.` });
                })
                .catch(() => toast.error("Could not reset the demo. Is the server running?"));
            }}
          >
            <RotateCcw aria-hidden />
            {t("demo.reset")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
