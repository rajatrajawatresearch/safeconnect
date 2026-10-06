"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SimulationRunner } from "@/features/simulation/simulation-runner";
import { LANGUAGES } from "@/lib/i18n";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import { ApiSync } from "./api-sync";
import { NotificationToaster } from "./notification-center";

/** Keeps `<html lang>` in step with the chosen language so screen readers pronounce it correctly. */
function LanguageSync() {
  const language = usePrefsStore((s) => s.language);
  useEffect(() => {
    document.documentElement.lang =
      LANGUAGES.find((l) => l.code === language)?.htmlLang ?? "en-IN";
  }, [language]);
  return null;
}

/** Development only: a console handle for inspecting and driving the demo (`window.__sanket`). */
function DevHandle() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as Record<string, unknown>).__sanket = { demo: useDemoStore, prefs: usePrefsStore, services };
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={250}>
          {children}
          <ApiSync />
          <SimulationRunner />
          <NotificationToaster />
          <LanguageSync />
          <DevHandle />
          <Toaster
            position="top-right"
            closeButton
            offset={{ top: 44 }}
            mobileOffset={{ top: 44 }}
          />
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
