"use client";

import {
  ChevronDown,
  ChevronRight,
  FileText,
  LockKeyhole,
  PhoneCall,
  Route,
  Siren,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useT } from "@/hooks/use-t";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  HELPLINES,
  HOW_IT_WORKS,
  SITUATIONS,
  type Guide,
} from "./safety-content";

const LINKS: Record<
  Guide["links"][number],
  { href: string; icon: LucideIcon; labelKey: TKey }
> = {
  sos: { href: "/citizen/sos", icon: Siren, labelKey: "citizen.safety.goSos" },
  report: {
    href: "/citizen/report",
    icon: FileText,
    labelKey: "citizen.section.report",
  },
  journey: {
    href: "/citizen/journey",
    icon: Route,
    labelKey: "citizen.section.journey",
  },
  privacy: {
    href: "/citizen/privacy",
    icon: LockKeyhole,
    labelKey: "citizen.privacy.title",
  },
  contacts: {
    href: "/citizen/contacts",
    icon: Users,
    labelKey: "citizen.section.contacts",
  },
};

function GuideList({
  guides,
  openId,
  onToggle,
}: {
  guides: Guide[];
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  const t = useT();
  return (
    <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {guides.map((guide) => {
        const open = openId === guide.id;
        return (
          <li key={guide.id}>
            <Collapsible open={open} onOpenChange={() => onToggle(guide.id)}>
              <CollapsibleTrigger className="flex min-h-18 w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-muted sm:px-5">
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl transition-colors",
                    open
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  <guide.icon aria-hidden className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium">
                    {t(guide.titleKey)}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                    {t(guide.summaryKey)}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "size-5 shrink-0 text-subtle transition-transform",
                    open && "rotate-180",
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-5 sm:px-5 sm:pl-[4.625rem]">
                  <ol className="list-outside list-decimal space-y-2.5 pl-5 text-[15px] leading-relaxed marker:text-muted-foreground">
                    {guide.steps.map((step) => (
                      <li key={step} className="pl-1">
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {guide.links.map((key, index) => {
                      const link = LINKS[key];
                      return (
                        <Button
                          key={key}
                          asChild
                          size="xl"
                          variant={index === 0 ? "default" : "outline"}
                        >
                          <Link href={link.href}>
                            <link.icon aria-hidden />
                            {t(link.labelKey)}
                          </Link>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </li>
        );
      })}
    </ul>
  );
}

/** Practical guidance, and a plain account of what the app does with an SOS and with location. */
export function SafetyScreen() {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>("followed");
  const toggle = (id: string) =>
    setOpenId((current) => (current === id ? null : id));

  return (
    <PageContainer width="wide">
      <PageHeader
        title={t("citizen.safety.title")}
        description={t("citizen.safety.description")}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="min-w-0 space-y-7">
          <section aria-labelledby="safety-situations">
            <h2 id="safety-situations" className="mb-3 text-lg font-semibold">
              {t("citizen.safety.situations")}
            </h2>
            <GuideList guides={SITUATIONS} openId={openId} onToggle={toggle} />
          </section>

          <section aria-labelledby="safety-how">
            <h2 id="safety-how" className="mb-3 text-lg font-semibold">
              {t("citizen.safety.how")}
            </h2>
            <GuideList
              guides={HOW_IT_WORKS}
              openId={openId}
              onToggle={toggle}
            />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <section
            aria-labelledby="safety-now"
            className="rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <h2 id="safety-now" className="text-lg font-semibold">
              {t("citizen.safety.now")}
            </h2>
            <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
              {t("citizen.safety.nowBody")}
            </p>
            <Button
              asChild
              size="2xl"
              variant="critical"
              className="mt-4 w-full"
            >
              <Link href="/citizen/sos">
                <Siren aria-hidden />
                {t("citizen.safety.goSos")}
              </Link>
            </Button>
            <p className="mt-4 flex items-start gap-3 rounded-xl bg-inset px-3.5 py-3 text-[15px] leading-snug">
              <PhoneCall
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <span>
                <span className="font-semibold">112</span>{" "}
                {t("citizen.safety.call112")}
              </span>
            </p>
          </section>

          <section
            aria-labelledby="safety-helplines"
            className="rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <h2 id="safety-helplines" className="text-lg font-semibold">
              {t("citizen.safety.helplines")}
            </h2>
            <dl className="mt-3 space-y-3.5">
              {HELPLINES.map((line) => (
                <div key={line.titleKey}>
                  <dt className="text-[15px] font-medium">
                    {t(line.titleKey)}
                  </dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {t(line.bodyKey)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-border/70 pt-3 text-[13px] leading-relaxed text-muted-foreground">
              {t("citizen.safety.helplinesNote")}
            </p>
          </section>

          <Link
            href="/citizen/nearby"
            className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 text-base font-medium shadow-card transition-colors hover:bg-muted"
          >
            {t("citizen.section.nearby")}
            <ChevronRight aria-hidden className="size-5 text-subtle" />
          </Link>
        </aside>
      </div>
    </PageContainer>
  );
}
