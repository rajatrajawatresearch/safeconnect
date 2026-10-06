"use client";

import {
  Check,
  Languages,
  Monitor,
  Moon,
  Sun,
  Wifi,
  WifiLow,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useT } from "@/hooks/use-t";
import { useTheme, type ThemeChoice } from "@/hooks/use-theme";
import { LANGUAGES } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { API_MODE } from "@/services/http/config";
import { useApiStatus } from "@/services/http/sync";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Connectivity } from "@/types";

const THEMES: {
  value: ThemeChoice;
  icon: typeof Sun;
  labelKey: "theme.light" | "theme.dark" | "theme.system";
}[] = [
  { value: "light", icon: Sun, labelKey: "theme.light" },
  { value: "dark", icon: Moon, labelKey: "theme.dark" },
  { value: "system", icon: Monitor, labelKey: "theme.system" },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const t = useT();
  const Current = resolvedTheme === "dark" ? Moon : Sun;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-lg"
              className={className}
              aria-label={`${t("theme.label")}: ${t(`theme.${theme}`)}`}
            >
              <Current aria-hidden />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("theme.label")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>{t("theme.label")}</DropdownMenuLabel>
        {THEMES.map(({ value, icon: Icon, labelKey }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
            <Icon aria-hidden />
            {t(labelKey)}
            {theme === value && <Check aria-hidden className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSwitcher({
  className,
  showLabel,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const language = usePrefsStore((s) => s.language);
  const setLanguage = usePrefsStore((s) => s.setLanguage);
  const t = useT();
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={showLabel ? "lg" : "icon-lg"}
              className={className}
              aria-label={`${t("language.label")}: ${current.english}`}
            >
              <Languages aria-hidden />
              {showLabel && <span>{current.native}</span>}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("language.label")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLanguage(l.code)}
            lang={l.htmlLang}
          >
            <span>{l.native}</span>
            {l.code !== "en" && (
              <span className="text-xs text-muted-foreground">{l.english}</span>
            )}
            {language === l.code && <Check aria-hidden className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const CONNECTIVITY_META: Record<
  Connectivity,
  {
    icon: typeof Wifi;
    labelKey: "net.online" | "net.weak" | "net.offline";
    tone: string;
    dot: string;
  }
> = {
  online: {
    icon: Wifi,
    labelKey: "net.online",
    tone: "text-resolved-fg",
    dot: "bg-resolved",
  },
  weak: {
    icon: WifiLow,
    labelKey: "net.weak",
    tone: "text-medium-fg",
    dot: "bg-medium",
  },
  offline: {
    icon: WifiOff,
    labelKey: "net.offline",
    tone: "text-critical-fg",
    dot: "bg-critical",
  },
};

/** Shows the connection state. The state itself is changed from the demo controls in the banner. */
export function ConnectivityIndicator({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const simulated = usePrefsStore((s) => s.connectivity);
  const linked = useApiStatus((s) => s.connected);
  // With the API the indicator reports the real link as well as the demo's simulated setting.
  const connectivity: Connectivity = API_MODE && !linked && simulated !== "offline" ? "offline" : simulated;
  const t = useT();
  const meta = CONNECTIVITY_META[connectivity];
  const Icon = meta.icon;
  return (
    <span
      role="status"
      aria-label={`Connection: ${t(meta.labelKey)}`}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium whitespace-nowrap",
        meta.tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {!compact && <span>{t(meta.labelKey)}</span>}
    </span>
  );
}
