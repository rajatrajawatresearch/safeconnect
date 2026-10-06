"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  Check,
  ChevronRight,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { ErrorState, RestrictedState } from "@/components/shared/states";
import { ToneChip } from "@/components/shared/status-chips";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { useTheme, type ThemeChoice } from "@/hooks/use-theme";
import { formatTime } from "@/lib/format";
import { LANGUAGES, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { services, ServiceError } from "@/services";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Citizen, LanguageCode } from "@/types";
import { useCitizenContacts } from "./use-citizen-data";

const card = "rounded-2xl border border-border bg-card shadow-card";

const THEMES: { value: ThemeChoice; icon: LucideIcon; labelKey: TKey }[] = [
  { value: "light", icon: Sun, labelKey: "theme.light" },
  { value: "dark", icon: Moon, labelKey: "theme.dark" },
  { value: "system", icon: Monitor, labelKey: "theme.system" },
];

/** A single-choice card. A real radio item, so arrow keys move between the options. */
function Choice({
  value,
  children,
  className,
  lang,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  lang?: string;
}) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      lang={lang}
      className={cn(
        "group/choice relative flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:border-primary/60 data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground",
        className,
      )}
    >
      {children}
    </RadioGroupPrimitive.Item>
  );
}

function SessionCard({ citizen }: { citizen: Citizen }) {
  const t = useT();
  const session = useQuery({
    queryKey: ["session", citizen.id],
    queryFn: () => services.auth.getSession(citizen.id),
  });

  return (
    <section aria-labelledby="profile-device" className={cn(card, "p-5")}>
      <h2 id="profile-device" className="text-lg font-semibold">
        {t("citizen.profile.device")}
      </h2>
      {session.isPending ? (
        <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      ) : session.isError ? (
        <ErrorState
          compact
          offline={
            session.error instanceof ServiceError &&
            session.error.code === "offline"
          }
          onRetry={() => void session.refetch()}
        />
      ) : (
        <dl className="mt-3 space-y-3 text-[15px]">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">
              {t("citizen.profile.signedInOn")}
            </dt>
            <dd className="text-right font-medium">{session.data.device}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">
              {t("citizen.profile.signedInAt")}
            </dt>
            <dd className="tnum font-mono font-medium">
              {formatTime(session.data.startedAt)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function Profile({ citizen }: { citizen: Citizen }) {
  const t = useT();
  const router = useRouter();
  const language = usePrefsStore((s) => s.language);
  const setLanguage = usePrefsStore((s) => s.setLanguage);
  const { theme, setTheme } = useTheme();
  const contacts = useCitizenContacts(citizen.id);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const links: {
    href: string;
    icon: LucideIcon;
    label: string;
    meta?: string;
  }[] = [
    {
      href: "/citizen/contacts",
      icon: Users,
      label: t("citizen.section.contacts"),
      meta: t("citizen.home.contactsCount", { count: contacts.length }),
    },
    {
      href: "/citizen/privacy",
      icon: LockKeyhole,
      label: t("citizen.privacy.title"),
    },
    {
      href: "/citizen/safety",
      icon: ShieldCheck,
      label: t("citizen.section.safetyCenter"),
    },
    {
      href: "/citizen/activity",
      icon: Activity,
      label: t("nav.activity"),
    },
  ];

  return (
    <PageContainer width="wide">
      <PageHeader
        title={t("nav.profile")}
        description={t("citizen.profile.description")}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
        <div className="min-w-0 space-y-6">
          <section aria-label={t("nav.profile")} className={cn(card, "p-5")}>
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="grid size-16 shrink-0 place-items-center rounded-full bg-accent text-xl font-semibold text-accent-foreground"
              >
                {citizen.initials}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-semibold tracking-tight">
                  {citizen.name}
                </h2>
                <p className="mt-1">
                  {citizen.verified ? (
                    <ToneChip tone="resolved" size="md">
                      <BadgeCheck aria-hidden className="size-4" />
                      {t("citizen.profile.verified")}
                    </ToneChip>
                  ) : (
                    <ToneChip tone="medium" size="md">
                      {t("citizen.profile.unverified")}
                    </ToneChip>
                  )}
                </p>
              </div>
            </div>
            <dl className="mt-5 space-y-3 border-t border-border/70 pt-4 text-[15px]">
              <div className="flex items-center gap-3">
                <dt>
                  <Phone aria-hidden className="size-4 text-muted-foreground" />
                  <span className="sr-only">{t("citizen.contacts.phone")}</span>
                </dt>
                <dd className="tnum font-mono">{citizen.phoneMasked ?? "—"}</dd>
              </div>
              {citizen.email && (
                <div className="flex items-center gap-3">
                  <dt>
                    <Mail
                      aria-hidden
                      className="size-4 text-muted-foreground"
                    />
                    <span className="sr-only">
                      {t("citizen.profile.email")}
                    </span>
                  </dt>
                  <dd className="truncate">{citizen.email}</dd>
                </div>
              )}
              <div className="flex items-center gap-3">
                <dt>
                  <MapPin
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                  <span className="sr-only">{t("citizen.profile.area")}</span>
                </dt>
                <dd>
                  {citizen.area}, {citizen.city}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
              {t("citizen.profile.maskedNote")}
            </p>
          </section>

          <nav aria-label={t("citizen.profile.shortcuts")}>
            <ul
              className={cn(card, "divide-y divide-border/70 overflow-hidden")}
            >
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-16 items-center gap-3.5 px-4 py-3 transition-colors hover:bg-muted"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
                      <link.icon aria-hidden className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1 text-base font-medium">
                      {link.label}
                    </span>
                    {link.meta && (
                      <span className="tnum text-sm text-muted-foreground">
                        {link.meta}
                      </span>
                    )}
                    <ChevronRight
                      aria-hidden
                      className="size-5 shrink-0 text-subtle"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="min-w-0 space-y-6">
          <section
            aria-labelledby="profile-language"
            className={cn(card, "p-5")}
          >
            <h2 id="profile-language" className="text-lg font-semibold">
              {t("language.label")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("citizen.profile.languageBody")}
            </p>
            <RadioGroupPrimitive.Root
              value={language}
              onValueChange={(code) => setLanguage(code as LanguageCode)}
              aria-labelledby="profile-language"
              className="mt-4 grid gap-2.5"
            >
              {LANGUAGES.map((option) => (
                <Choice
                  key={option.code}
                  value={option.code}
                  lang={option.htmlLang}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium">
                      {option.native}
                    </span>
                    {option.code !== "en" && (
                      <span className="block text-sm text-muted-foreground">
                        {option.english}
                      </span>
                    )}
                  </span>
                  <Check
                    aria-hidden
                    className="hidden size-5 shrink-0 group-data-[state=checked]/choice:block"
                  />
                </Choice>
              ))}
            </RadioGroupPrimitive.Root>
          </section>

          <section aria-labelledby="profile-theme" className={cn(card, "p-5")}>
            <h2 id="profile-theme" className="text-lg font-semibold">
              {t("theme.label")}
            </h2>
            <RadioGroupPrimitive.Root
              value={theme}
              onValueChange={(choice) => setTheme(choice as ThemeChoice)}
              aria-labelledby="profile-theme"
              className="mt-4 grid grid-cols-3 gap-2.5"
            >
              {THEMES.map((option) => (
                <Choice
                  key={option.value}
                  value={option.value}
                  className="flex-col justify-center gap-1.5 px-2 py-3 text-center"
                >
                  <option.icon aria-hidden className="size-5" />
                  <span className="text-sm font-medium">
                    {t(option.labelKey)}
                  </span>
                </Choice>
              ))}
            </RadioGroupPrimitive.Root>
          </section>

          <SessionCard citizen={citizen} />

          <Button
            variant="outline"
            size="xl"
            className="w-full"
            onClick={() => setSignOutOpen(true)}
          >
            <LogOut aria-hidden />
            {t("citizen.profile.signOut")}
          </Button>
        </div>
      </div>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent className="gap-5 rounded-2xl p-5 data-[size=default]:sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">
              {t("citizen.profile.signOutTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-relaxed">
              {t("citizen.profile.signOutBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="-mx-5 -mb-5 rounded-b-2xl p-5">
            <AlertDialogCancel size="xl">
              {t("action.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction size="xl" onClick={() => router.push("/")}>
              {t("citizen.profile.signOut")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

export function ProfileScreen() {
  const { citizen } = useSession();
  if (!citizen)
    return (
      <RestrictedState description="This screen is for the citizen app. Switch to a citizen from the demo role menu." />
    );
  return <Profile citizen={citizen} />;
}
