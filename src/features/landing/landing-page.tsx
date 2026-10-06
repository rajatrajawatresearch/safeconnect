"use client";

import {
  ArrowRight,
  EyeOff,
  Fingerprint,
  ScrollText,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/shared/emblem";
import {
  ClassificationChip,
  IntegrityChip,
  PriorityBadge,
  StatusChip,
  UnitStatusChip,
} from "@/components/shared/status-chips";
import {
  LanguageSwitcher,
  ThemeToggle,
} from "@/components/layout/top-controls";
import { Button } from "@/components/ui/button";
import { deployment } from "@/config/deployment";
import { ROLE_SWITCH } from "@/config/navigation";
import { personaById } from "@/data/demo/people";
import { useSwitchPersona } from "@/features/auth/use-switch-persona";
import { useT } from "@/hooks/use-t";
import { HeroChain } from "./hero-chain";

const CAPABILITIES = [
  {
    title: "Citizen safety",
    body: "A three-second hold raises an SOS with location attached. Silent mode, journey sharing with trusted contacts, guided reporting and complaint tracking sit one tap away.",
    sample: (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-critical px-3 py-1 text-xs font-semibold text-critical-on">
          Hold for SOS
        </span>
        <span className="text-xs text-muted-foreground">
          English · ગુજરાતી · हिन्दी
        </span>
      </div>
    ),
  },
  {
    title: "Emergency response",
    body: "Operators see the incident the moment it is raised, talk to the citizen over chat, voice or video, and confirm priority with an assistant that suggests but never decides.",
    sample: (
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority="P1" />
        <StatusChip status="acknowledged" />
        <span className="tnum font-mono text-xs text-muted-foreground">
          00:00:42
        </span>
      </div>
    ),
  },
  {
    title: "Live dispatch",
    body: "Available units are ranked by road distance. Assign, reassign or call for backup from a board and a map that update as officers accept, travel and arrive.",
    sample: (
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-medium">GJ-AHD-17</span>
        <UnitStatusChip status="en_route" />
        <span className="tnum font-mono text-xs text-muted-foreground">
          ETA 04:32
        </span>
      </div>
    ),
  },
  {
    title: "Digital evidence",
    body: "Photos, video, audio and documents are linked to their incident with a recorded digest, an access classification and a log of every person who opened them.",
    sample: (
      <div className="flex flex-wrap items-center gap-2">
        <IntegrityChip value="verified" />
        <ClassificationChip value="restricted" />
      </div>
    ),
  },
  {
    title: "Operational intelligence",
    body: "Response times, resolution trends, unit availability and escalations by station, district and state. Density maps describe places and past incidents, never people.",
    sample: (
      <div className="flex items-end gap-1" aria-hidden>
        {[38, 52, 46, 70, 58, 82, 64, 44].map((h, i) => (
          <span
            key={i}
            className="w-2.5 rounded-sm bg-primary/70"
            style={{ height: `${h * 0.36}px` }}
          />
        ))}
      </div>
    ),
  },
];

const PRINCIPLES = [
  {
    icon: EyeOff,
    title: "Not a surveillance tool",
    body: "A citizen's location is read only when they start an emergency, a report or a shared journey, and sharing can be stopped.",
  },
  {
    icon: UserCheck,
    title: "People decide",
    body: "Assisted triage suggests a category and priority with its reasoning. An operator confirms before anything takes effect.",
  },
  {
    icon: Fingerprint,
    title: "Least privilege",
    body: "Each role sees what its work requires. Restricted evidence and sensitive fields stay closed to everyone else.",
  },
  {
    icon: ScrollText,
    title: "Everything is recorded",
    body: "Every staff action lands in an append-only audit trail: who, what, when, and on which incident.",
  },
];

export function LandingPage() {
  const switchPersona = useSwitchPersona();
  const t = useT();

  return (
    <div className="flex-1">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            size="lg"
            variant="outline"
            className="ml-2 hidden sm:inline-flex"
            onClick={() => switchPersona("stf-meera")}
          >
            Open control room
          </Button>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:px-8 lg:pt-14 lg:pb-24">
          <div>
            <p className="mb-5 text-sm text-muted-foreground">
              {deployment.orgName} · {t("app.tagline")}
            </p>
            <h1 className="text-[clamp(2.5rem,9.5vw,5rem)] lg:text-[clamp(3.5rem,5.7vw,5.2rem)] leading-[0.9] font-semibold tracking-[-0.045em] uppercase">
              Public safety
              <br />
              connected.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              One platform connecting citizens, emergency operators, field
              responders and command teams.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="xl" onClick={() => switchPersona("cit-aarav")}>
                Explore demo <ArrowRight aria-hidden />
              </Button>
              <Button
                size="xl"
                variant="outline"
                onClick={() => switchPersona("stf-vikram")}
              >
                Open command centre
              </Button>
            </div>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
              Everything here runs on fictional data in your browser.{" "}
              {deployment.realEmergencyHint}
            </p>
          </div>
          <HeroChain />
        </section>

        <section
          aria-labelledby="capabilities"
          className="border-y border-border bg-card"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <h2
              id="capabilities"
              className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              From the first three seconds to the closed case
            </h2>
            <dl className="mt-10 divide-y divide-border border-y border-border">
              {CAPABILITIES.map((c) => (
                <div
                  key={c.title}
                  className="grid gap-x-10 gap-y-3 py-6 md:grid-cols-[14rem_minmax(0,1fr)_16rem] md:items-center"
                >
                  <dt className="text-lg font-semibold tracking-tight">
                    {c.title}
                  </dt>
                  <dd className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                    {c.body}
                  </dd>
                  <dd className="md:justify-self-end">{c.sample}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          aria-labelledby="roles"
          className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="roles"
                className="text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Enter as any role
              </h2>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                The demo signs you in as a fictional person. Switch at any time
                from the strip at the top of the screen — actions in one role
                show up in the others.
              </p>
            </div>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_SWITCH.map(
              ({ role, labelKey, personaId, icon: Icon, blurb }) => {
                const persona = personaById(personaId);
                return (
                  <li key={role}>
                    <button
                      type="button"
                      onClick={() => switchPersona(personaId)}
                      className="group flex h-full w-full items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-card transition-colors hover:border-primary/50"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold">
                          {t(labelKey)}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {persona.name}
                        </span>
                        <span className="mt-2 block text-sm leading-snug text-muted-foreground">
                          {blurb}
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden
                        className="mt-1 size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      />
                    </button>
                  </li>
                );
              },
            )}
          </ul>
        </section>

        <section
          aria-labelledby="principles"
          className="border-t border-border bg-card"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <h2
              id="principles"
              className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Built for trust on both sides of the call
            </h2>
            <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map((p) => (
                <li key={p.title}>
                  <p.icon aria-hidden className="size-5 text-primary" />
                  <p className="mt-3 text-base font-semibold">{p.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {p.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <p className="max-w-2xl">
          {deployment.disclaimer} Names, incidents and locations are fictional.
        </p>
        <nav aria-label="Demo areas" className="flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/citizen" className="hover:text-foreground">
            Citizen app
          </Link>
          <Link href="/officer" className="hover:text-foreground">
            Officer app
          </Link>
          <Link href="/control" className="hover:text-foreground">
            Control room
          </Link>
          <Link href="/command" className="hover:text-foreground">
            Command centre
          </Link>
          <Link href="/admin" className="hover:text-foreground">
            Administration
          </Link>
        </nav>
      </footer>
    </div>
  );
}
