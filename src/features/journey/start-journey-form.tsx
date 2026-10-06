"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  BellRing,
  Check,
  Clock,
  EyeOff,
  Loader2,
  MapPin,
  Navigation,
  Route,
  ShieldCheck,
  Timer,
  UserPlus,
  Users,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Panel } from "@/components/shared/page";
import { BlankState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AREAS } from "@/data/demo/geo";
import {
  ChoiceChip,
  FieldError,
  Notice,
  SectionTitle,
  StickyActions,
} from "@/features/citizen-flows/ui";
import { useAction } from "@/hooks/use-action";
import { useNow } from "@/hooks/use-now";
import { useT } from "@/hooks/use-t";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Citizen, EmergencyContact } from "@/types";
import {
  DURATION_OPTIONS,
  FROM_CURRENT,
  INTERVAL_OPTIONS,
  destinationPlace,
  fromPlace,
  startJourneySchema,
  suggestDuration,
  type StartJourneyValues,
} from "./journey-model";

const SORTED_AREAS = Object.entries(AREAS).sort(([, a], [, b]) =>
  a.name.localeCompare(b.name),
);

const selectTrigger =
  "mt-2 w-full rounded-xl px-3.5 text-base data-[size=default]:h-12";

function ContactOption({
  contact,
  checked,
  onToggle,
}: {
  contact: EmergencyContact;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "group relative flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-input",
        "has-[:checked]:border-primary has-[:checked]:bg-accent/50",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
      )}
    >
      <input
        type="checkbox"
        name="contactIds"
        value={contact.id}
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground group-has-[:checked]:bg-primary group-has-[:checked]:text-primary-foreground"
      >
        {contact.name
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0])
          .join("")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium">
          {contact.name}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {contact.relation} · {contact.phoneMasked}
        </span>
      </span>
      <span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded-[6px] border border-input group-has-[:checked]:border-primary group-has-[:checked]:bg-primary group-has-[:checked]:text-primary-foreground"
      >
        <Check className="size-3.5 opacity-0 group-has-[:checked]:opacity-100" />
      </span>
    </label>
  );
}

/** Start form for a shared journey: where, how long, who can see it, how often to check in, and consent. */
export function StartJourneyForm({ citizen }: { citizen: Citizen }) {
  const t = useT();
  const now = useNow(30_000);
  const allContacts = useDemoStore((s) => s.contacts);
  const sharingGranted = usePrefsStore((s) => s.privacy.journeySharing);
  const setPrivacy = usePrefsStore((s) => s.setPrivacy);
  const offline = usePrefsStore((s) => s.connectivity === "offline");
  const contacts = useMemo(
    () => allContacts.filter((c) => c.citizenId === citizen.id),
    [allContacts, citizen.id],
  );

  const form = useForm<StartJourneyValues>({
    resolver: zodResolver(startJourneySchema),
    defaultValues: {
      from: FROM_CURRENT,
      destination: "",
      durationMin: 20,
      intervalMin: 10,
      contactIds: contacts.filter((c) => c.notifyOnJourney).map((c) => c.id),
      consent: false,
    },
  });
  // Every field has a default, so the watched object is always complete.
  const values = useWatch({ control: form.control }) as StartJourneyValues;
  const { errors, isSubmitted } = form.formState;
  const [durationChosen, setDurationChosen] = useState(false);
  const start = useAction(services.journeys.start, {
    success: t("journey.started"),
  });

  const from = fromPlace(citizen, values.from);
  const destination = destinationPlace(values.destination);
  const suggestion = destination ? suggestDuration(from, destination) : null;
  const selected = contacts.filter((c) => values.contactIds.includes(c.id));
  const names = selected.map((c) => c.name).join(", ");
  const arrival = now > 0 ? formatTime(now + values.durationMin * 60_000) : "";

  const setPlace = (field: "from" | "destination", value: string) => {
    form.setValue(field, value, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });
    const nextFrom = fromPlace(citizen, field === "from" ? value : values.from);
    const nextTo = destinationPlace(
      field === "destination" ? value : values.destination,
    );
    // Until the citizen picks a time themselves, keep it in step with the route.
    if (nextTo && !durationChosen)
      form.setValue("durationMin", suggestDuration(nextFrom, nextTo).option);
    if (isSubmitted) void form.trigger("destination");
  };

  const submit = async (data: StartJourneyValues) => {
    const to = destinationPlace(data.destination);
    if (!to) return;
    const journey = await start.run({
      citizenId: citizen.id,
      from: fromPlace(citizen, data.from),
      destination: to,
      durationMin: data.durationMin,
      checkIntervalMin: data.intervalMin,
      contactIds: data.contactIds,
    });
    // The consent given below is recorded in the privacy centre alongside the other choices.
    if (journey && !sharingGranted) setPrivacy("journeySharing", true);
  };

  const consentLines = [
    { icon: Route, text: t("journey.consent.what") },
    {
      icon: Users,
      text: names
        ? t("journey.consent.who", { names })
        : t("journey.consent.whoNone"),
    },
    { icon: Timer, text: t("journey.consent.until") },
    { icon: EyeOff, text: t("journey.consent.police") },
  ];

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      noValidate
      className="md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:items-start md:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <div className="space-y-4">
        {offline && (
          <Notice tone="high" icon={WifiOff} role="status">
            {t("journey.offline")}
          </Notice>
        )}

        <Panel className="rounded-2xl p-5 sm:p-6">
          <SectionTitle hint={t("journey.start.hint")}>
            {t("journey.start.title")}
          </SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
            <div>
              <Label htmlFor="journey-from" className="text-[15px]">
                {t("journey.from")}
              </Label>
              <Select
                value={values.from}
                onValueChange={(value) => setPlace("from", value)}
              >
                <SelectTrigger id="journey-from" className={selectTrigger}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  <SelectItem
                    value={FROM_CURRENT}
                    className="min-h-10 text-[15px]"
                  >
                    {t("journey.from.current", { area: citizen.area })}
                  </SelectItem>
                  {SORTED_AREAS.map(([key, area]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="min-h-10 text-[15px]"
                    >
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="journey-destination" className="text-[15px]">
                {t("journey.destination")}
              </Label>
              <Select
                value={values.destination}
                onValueChange={(value) => setPlace("destination", value)}
              >
                <SelectTrigger
                  id="journey-destination"
                  aria-invalid={Boolean(errors.destination)}
                  aria-describedby="journey-destination-error"
                  className={selectTrigger}
                >
                  <SelectValue
                    placeholder={t("journey.destination.placeholder")}
                  />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {SORTED_AREAS.map(([key, area]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="min-h-10 text-[15px]"
                    >
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                id="journey-destination-error"
                message={errors.destination?.message}
              />
            </div>
          </div>

          <fieldset className="mt-6 min-w-0">
            <legend className="text-[15px] font-medium">
              {t("journey.duration")}
            </legend>
            <p className="mt-1 text-sm text-muted-foreground">
              {suggestion
                ? t("journey.duration.estimate", {
                    min: suggestion.estimateMin,
                  })
                : t("journey.duration.hint")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((minutes) => (
                <ChoiceChip
                  key={minutes}
                  type="radio"
                  name="durationMin"
                  value={String(minutes)}
                  checked={values.durationMin === minutes}
                  onToggle={() => {
                    setDurationChosen(true);
                    form.setValue("durationMin", minutes, {
                      shouldDirty: true,
                    });
                  }}
                >
                  <span className="tnum">
                    {t("journey.minutes", { n: minutes })}
                  </span>
                </ChoiceChip>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6 min-w-0">
            <legend className="text-[15px] font-medium">
              {t("journey.interval")}
            </legend>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("journey.interval.hint")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {INTERVAL_OPTIONS.map((minutes) => (
                <ChoiceChip
                  key={minutes}
                  type="radio"
                  name="intervalMin"
                  value={String(minutes)}
                  checked={values.intervalMin === minutes}
                  onToggle={() =>
                    form.setValue("intervalMin", minutes, {
                      shouldDirty: true,
                    })
                  }
                >
                  <span className="tnum">
                    {t("journey.minutes", { n: minutes })}
                  </span>
                </ChoiceChip>
              ))}
            </div>
          </fieldset>
        </Panel>

        <Panel className="rounded-2xl p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <SectionTitle hint={t("journey.contacts.hint")} className="mb-0">
              {t("journey.contacts")}
            </SectionTitle>
            {contacts.length > 0 && (
              <Button asChild variant="ghost" className="-mr-2 h-11 px-3">
                <Link href="/citizen/contacts">
                  {t("journey.contacts.manage")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
          </div>
          {contacts.length === 0 ? (
            <BlankState
              compact
              icon={UserPlus}
              title={t("journey.contacts.none.title")}
              description={t("journey.contacts.none.body")}
              action={
                <Button asChild size="xl" variant="outline">
                  <Link href="/citizen/contacts">
                    <UserPlus aria-hidden />
                    {t("journey.contacts.none.action")}
                  </Link>
                </Button>
              }
            />
          ) : (
            <fieldset className="min-w-0">
              <legend className="sr-only">{t("journey.contacts")}</legend>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                {contacts.map((contact) => (
                  <ContactOption
                    key={contact.id}
                    contact={contact}
                    checked={values.contactIds.includes(contact.id)}
                    onToggle={(checked) =>
                      form.setValue(
                        "contactIds",
                        checked
                          ? [...values.contactIds, contact.id]
                          : values.contactIds.filter((id) => id !== contact.id),
                        { shouldDirty: true },
                      )
                    }
                  />
                ))}
              </div>
              {selected.length === 0 && (
                <p role="status" className="mt-3 text-sm text-muted-foreground">
                  {t("journey.contacts.noneSelected")}
                </p>
              )}
            </fieldset>
          )}
        </Panel>
      </div>

      <div className="mt-4 space-y-4 md:sticky md:top-6 md:mt-0">
        <Panel
          as="aside"
          aria-labelledby="journey-summary-title"
          className="hidden rounded-2xl p-5 md:block"
        >
          <h2 id="journey-summary-title" className="text-sm font-semibold">
            {t("journey.summary.title")}
          </h2>
          <dl className="mt-3 space-y-3 text-[15px]">
            <div className="flex items-start gap-2.5">
              <Navigation
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0">
                <dt className="text-[13px] text-muted-foreground">
                  {t("journey.from")}
                </dt>
                <dd className="font-medium break-words">{from.label}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0">
                <dt className="text-[13px] text-muted-foreground">
                  {t("journey.destination")}
                </dt>
                <dd className="font-medium break-words">
                  {destination?.label ?? (
                    <span className="font-normal text-subtle">
                      {t("journey.summary.notChosen")}
                    </span>
                  )}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0">
                <dt className="text-[13px] text-muted-foreground">
                  {t("journey.summary.arrival")}
                </dt>
                <dd className="tnum font-medium">
                  {arrival} · {t("journey.minutes", { n: values.durationMin })}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <BellRing
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0">
                <dt className="text-[13px] text-muted-foreground">
                  {t("journey.interval")}
                </dt>
                <dd className="tnum font-medium">
                  {t("journey.minutes", { n: values.intervalMin })}
                </dd>
              </div>
            </div>
          </dl>
        </Panel>

        <Panel
          aria-labelledby="journey-consent-title"
          className="rounded-2xl p-5"
        >
          <h2 id="journey-consent-title" className="text-lg font-semibold">
            {t("journey.consent.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground md:hidden">
            {t("journey.summary.arrivalLine", {
              time: arrival,
              min: values.durationMin,
            })}
          </p>
          <ul className="mt-3 space-y-3">
            {consentLines.map((line) => (
              <li key={line.text} className="flex items-start gap-2.5">
                <line.icon
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <span className="text-[15px] leading-relaxed">{line.text}</span>
              </li>
            ))}
          </ul>

          <label
            htmlFor="journey-consent"
            className={cn(
              "mt-4 flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3.5",
              errors.consent
                ? "border-critical/40 bg-critical-soft"
                : "border-border bg-inset",
            )}
          >
            <Checkbox
              id="journey-consent"
              checked={values.consent}
              onCheckedChange={(checked) =>
                form.setValue("consent", checked === true, {
                  shouldDirty: true,
                  shouldValidate: isSubmitted,
                })
              }
              aria-invalid={Boolean(errors.consent)}
              aria-describedby="journey-consent-error"
              className="mt-0.5 size-5 rounded-[6px]"
            />
            <span className="text-[15px] leading-snug font-medium">
              {t("journey.consent.check")}
            </span>
          </label>
          <FieldError
            id="journey-consent-error"
            message={errors.consent?.message}
          />

          <Button
            type="submit"
            size="2xl"
            disabled={start.pending}
            className="mt-4 hidden w-full md:inline-flex"
          >
            {start.pending ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <ShieldCheck aria-hidden />
            )}
            {t("journey.start.action")}
          </Button>
        </Panel>
      </div>

      <StickyActions className="mt-4 md:hidden">
        <Button
          type="submit"
          size="xl"
          disabled={start.pending}
          className="min-w-0 flex-1"
        >
          {start.pending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <ShieldCheck aria-hidden />
          )}
          <span className="truncate">{t("journey.start.action")}</span>
        </Button>
      </StickyActions>
    </form>
  );
}
