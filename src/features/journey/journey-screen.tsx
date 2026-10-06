"use client";

import { ArrowRight, Siren } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { RestrictedState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Notice } from "@/features/citizen-flows/ui";
import { useCitizenActiveSos } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/stores/demo-store";
import { ActiveJourney, SafetyActionBar } from "./active-journey";
import { PastJourneys } from "./past-journeys";
import { StartJourneyForm } from "./start-journey-form";

/**
 * Journey safety. With no journey running this is the start form; once one starts it becomes the
 * live view, and it returns to the form when the citizen arrives or stops sharing.
 */
export function JourneyScreen() {
  const t = useT();
  const { citizen } = useSession();
  const journeys = useDemoStore((s) => s.journeys);
  const activeEmergency = useCitizenActiveSos(citizen?.id);

  const mine = useMemo(
    () =>
      citizen
        ? journeys
            .filter((j) => j.citizenId === citizen.id)
            .sort((a, b) => b.startedAt - a.startedAt)
        : [],
    [journeys, citizen],
  );
  const active = mine.find((j) => j.status === "active");
  const past = useMemo(() => mine.filter((j) => j.status !== "active"), [mine]);

  if (!citizen)
    return (
      <PageContainer width="narrow">
        <RestrictedState />
      </PageContainer>
    );

  return (
    <PageContainer
      width="wide"
      // With a journey running, the safety actions stick to the bottom on phones and own that edge.
      className={cn(active && "flex min-h-full flex-col pb-0 sm:pb-0 md:pb-6")}
    >
      <PageHeader
        title={t("journey.title")}
        description={
          active ? t("journey.active.subtitle") : t("journey.subtitle")
        }
      />

      <div className="space-y-8 pb-6 md:pb-0">
        {activeEmergency && (
          <Notice
            tone="critical"
            icon={Siren}
            actionBeside
            role="status"
            title={t("citizen.sos.active")}
            action={
              <Button asChild variant="critical" size="xl">
                <Link href="/citizen/sos">
                  {t("citizen.sos.viewActive")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
          >
            {t("journey.emergencyActive")}
          </Notice>
        )}

        {active ? (
          <ActiveJourney
            key={active.id}
            journey={active}
            citizen={citizen}
            emergencyActive={Boolean(activeEmergency)}
          />
        ) : (
          <StartJourneyForm citizen={citizen} />
        )}

        <PastJourneys journeys={past} />
      </div>

      {active && (
        <SafetyActionBar
          journey={active}
          citizen={citizen}
          emergencyActive={Boolean(activeEmergency)}
        />
      )}
    </PageContainer>
  );
}
