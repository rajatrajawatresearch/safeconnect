"use client";

import { format } from "date-fns";
import {
  ArrowRight,
  Ban,
  Building2,
  CalendarDays,
  CircleCheck,
  CircleHelp,
  Clock,
  EyeOff,
  Hand,
  Loader2,
  LocateFixed,
  MapPin,
  MapPinned,
  MessageCircle,
  Pencil,
  PhoneCall,
  ShieldCheck,
  Siren,
  TriangleAlert,
  WifiOff,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Path, PathValue, UseFormReturn } from "react-hook-form";
import { CategoryIcon } from "@/components/shared/category-icon";
import { MediaPicker, PickedMediaList } from "@/components/shared/media-picker";
import { OpsMap } from "@/components/shared/ops-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_GROUP_LABEL } from "@/config/incident";
import { AREAS, stationById } from "@/data/demo/geo";
import { useCategories } from "@/hooks/use-demo-data";
import { useNow } from "@/hooks/use-now";
import { useT } from "@/hooks/use-t";
import { formatDateTime } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  CategoryGroup,
  Citizen,
  IncidentCategory,
  Location,
} from "@/types";
import {
  ChoiceCard,
  ChoiceChip,
  DemoRecordNote,
  FieldError,
  Notice,
} from "../ui";
import {
  DESCRIPTION_MAX,
  INVOLVED_TAGS,
  KIND_META,
  MAX_MEDIA,
  STEPS,
  type InvolvedTag,
  type ReportData,
  type ReportKind,
  type ReportValues,
  type StepId,
} from "./model";

export type SetField = <K extends Path<ReportValues>>(
  name: K,
  value: PathValue<ReportValues, K>,
) => void;

export interface StepProps {
  form: UseFormReturn<ReportValues, unknown, ReportData>;
  values: ReportValues;
  set: SetField;
  /** Errors stay hidden until the citizen has tried to continue past the step. */
  showErrors: boolean;
  kind: ReportKind;
}

const GROUPS = Object.keys(CATEGORY_GROUP_LABEL) as CategoryGroup[];

const GROUP_KEY: Record<CategoryGroup, TKey> = {
  immediate_safety: "report.group.immediate_safety",
  public_safety: "report.group.public_safety",
  traffic: "report.group.traffic",
  crime_intel: "report.group.crime_intel",
  cyber: "report.group.cyber",
  emergency_assist: "report.group.emergency_assist",
};

/** The group a citizen most likely needs first for each kind of report. */
const FIRST_GROUP: Record<ReportKind, CategoryGroup> = {
  emergency: "immediate_safety",
  report: "public_safety",
  tip: "crime_intel",
};

const fieldClass = "h-12 rounded-xl px-3.5 text-base md:text-base";

/* ───────────────────────── 1. What happened? ───────────────────────── */

function CategoryTile({
  category,
  checked,
  onSelect,
}: {
  category: IncidentCategory;
  checked: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <label
      className={cn(
        "group relative flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2 text-sm leading-snug font-medium transition-colors hover:border-input",
        "has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-accent-foreground",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
      )}
    >
      <input
        type="radio"
        name="categoryId"
        value={category.id}
        checked={checked}
        onChange={() => onSelect(category.id)}
        className="sr-only"
      />
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-has-[:checked]:bg-primary group-has-[:checked]:text-primary-foreground">
        <CategoryIcon categoryId={category.id} />
      </span>
      <span className="min-w-0 break-words">{category.short}</span>
    </label>
  );
}

export function WhatStep({ form, values, set, showErrors, kind }: StepProps) {
  const t = useT();
  const categories = useCategories();
  const errors = form.formState.errors;

  const groups = useMemo(() => {
    const visible = categories.filter((c) => c.enabled && c.citizenVisible);
    return GROUPS.map((group) => ({
      group,
      items: visible.filter((c) => c.group === group),
    })).filter((g) => g.items.length > 0);
  }, [categories]);

  const selected = categories.find((c) => c.id === values.categoryId);
  const [group, setGroup] = useState<CategoryGroup | "all">(
    () => selected?.group ?? FIRST_GROUP[kind],
  );
  const shown =
    group === "all" ? groups : groups.filter((g) => g.group === group);
  const length = values.description.length;

  // On phones the group chips scroll sideways; keep the chosen one in view without moving the page.
  const chipRow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = chipRow.current;
    const chip = row?.querySelector("input:checked")?.parentElement;
    if (!row || !chip) return;
    const left =
      chip.getBoundingClientRect().left -
      row.getBoundingClientRect().left +
      row.scrollLeft;
    row.scrollTo({ left: left - (row.clientWidth - chip.clientWidth) / 2 });
  }, [group]);

  return (
    <div className="space-y-6">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-[15px] font-medium">
          {t("report.what.category")}
        </legend>
        <div
          role="radiogroup"
          aria-label={t("report.what.groupLabel")}
          ref={chipRow}
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 min-[400px]:-mx-5 min-[400px]:px-5 sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          {groups.map((g) => (
            <ChoiceChip
              key={g.group}
              type="radio"
              name="category-group"
              value={g.group}
              checked={group === g.group}
              onToggle={(value) => setGroup(value)}
              className="shrink-0 whitespace-nowrap"
            >
              {t(GROUP_KEY[g.group])}
            </ChoiceChip>
          ))}
          <ChoiceChip
            type="radio"
            name="category-group"
            value="all"
            checked={group === "all"}
            onToggle={() => setGroup("all")}
            className="shrink-0 whitespace-nowrap"
          >
            {t("report.what.allGroups")}
          </ChoiceChip>
        </div>

        <div className="mt-3 space-y-4">
          {shown.map((g) => (
            <div key={g.group}>
              {group === "all" && (
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  {t(GROUP_KEY[g.group])}
                </h3>
              )}
              <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-3">
                {g.items.map((c) => (
                  <CategoryTile
                    key={c.id}
                    category={c}
                    checked={values.categoryId === c.id}
                    onSelect={(id) => set("categoryId", id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <p
            role="status"
            className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <CircleCheck aria-hidden className="size-4 text-resolved-fg" />
            {t("report.what.selected")}:{" "}
            <span className="font-medium text-foreground">
              {selected.label}
            </span>
          </p>
        )}
        <FieldError
          message={showErrors ? errors.categoryId?.message : undefined}
        />
      </fieldset>

      <div>
        <Label htmlFor="report-description" className="text-[15px]">
          {t("report.what.description")}
        </Label>
        <p
          id="report-description-hint"
          className="mt-1 text-sm text-muted-foreground"
        >
          {kind === "tip"
            ? t("report.what.tipHint")
            : t("report.what.descriptionHint")}
        </p>
        <Textarea
          id="report-description"
          {...form.register("description")}
          maxLength={DESCRIPTION_MAX}
          rows={4}
          placeholder={t("report.what.descriptionPlaceholder")}
          aria-invalid={showErrors && Boolean(errors.description)}
          aria-describedby="report-description-hint report-description-error"
          className="mt-2 min-h-28 rounded-xl px-3.5 py-3 text-base md:text-base"
        />
        <div className="flex items-start justify-between gap-3">
          <FieldError
            id="report-description-error"
            message={showErrors ? errors.description?.message : undefined}
          />
          <p className="tnum mt-2 ml-auto shrink-0 text-xs text-subtle">
            {length}/{DESCRIPTION_MAX}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 2. Is anyone currently in danger? ───────────────────────── */

export function DangerStep({
  form,
  values,
  set,
  showErrors,
  kind,
  onSwitchToEmergency,
}: StepProps & { onSwitchToEmergency: () => void }) {
  const t = useT();
  return (
    <div className="space-y-4">
      <fieldset className="min-w-0">
        <legend className="sr-only">{t("report.step.danger")}</legend>
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
          <ChoiceCard
            name="danger"
            value="yes"
            checked={values.danger === "yes"}
            onSelect={(v) => set("danger", v)}
            icon={TriangleAlert}
            title={t("report.danger.yes")}
            description={t("report.danger.yesBody")}
          />
          <ChoiceCard
            name="danger"
            value="no"
            checked={values.danger === "no"}
            onSelect={(v) => set("danger", v)}
            icon={ShieldCheck}
            title={t("report.danger.no")}
            description={t("report.danger.noBody")}
          />
          <ChoiceCard
            name="danger"
            value="unsure"
            checked={values.danger === "unsure"}
            onSelect={(v) => set("danger", v)}
            icon={CircleHelp}
            title={t("report.danger.unsure")}
            description={t("report.danger.unsureBody")}
          />
        </div>
        <FieldError
          message={
            showErrors ? form.formState.errors.danger?.message : undefined
          }
        />
      </fieldset>

      {values.danger === "yes" && (
        <Notice
          tone="critical"
          icon={Siren}
          role="status"
          title={t("report.danger.sosTitle")}
          action={
            <Button asChild variant="critical" size="xl">
              <Link href="/citizen/sos">
                {t("report.danger.openSos")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        >
          <p>{t("report.danger.sosBody")}</p>
          <p className="mt-1 text-foreground/70">
            {t("report.danger.sosLeaves")}
          </p>
        </Notice>
      )}

      {values.danger === "yes" && kind === "report" && (
        <Notice
          tone="high"
          icon={Zap}
          title={t("report.danger.switchTitle")}
          action={
            <Button
              type="button"
              variant="outline"
              size="xl"
              onClick={onSwitchToEmergency}
            >
              {t("report.danger.switch")}
            </Button>
          }
        >
          {t("report.danger.switchBody")}
        </Notice>
      )}
    </div>
  );
}

/* ───────────────────────── 3. Where did it happen? ───────────────────────── */

const SORTED_AREAS = Object.entries(AREAS).sort(([, a], [, b]) =>
  a.name.localeCompare(b.name),
);

function LocationPreview({
  location,
  marker,
}: {
  location: Location;
  /** `me` for the device position, `pin` for a place the citizen chose. */
  marker: "me" | "pin";
}) {
  const t = useT();
  const point = useMemo(
    () => ({ lat: location.lat, lng: location.lng }),
    [location.lat, location.lng],
  );
  const focus = useMemo(() => [point], [point]);
  const station = stationById(location.stationId);
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative h-44 sm:h-52">
        <OpsMap
          center={point}
          zoom={15}
          focus={focus}
          me={marker === "me" ? point : undefined}
          interactive={false}
          showZoom={false}
          label={t("report.where.mapLabel")}
          className="size-full"
        />
        {marker === "pin" && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-full text-primary drop-shadow"
          >
            <MapPin className="size-9 fill-card" strokeWidth={2.2} />
          </span>
        )}
      </div>
      <figcaption className="space-y-1 px-4 py-3">
        <p className="flex items-start gap-2 text-[15px] font-medium">
          <MapPin
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 break-words">{location.address}</span>
        </p>
        {station && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Building2 aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t("report.where.station", { station: station.name })}
          </p>
        )}
      </figcaption>
    </figure>
  );
}

export function WhereStep({
  form,
  values,
  set,
  showErrors,
  kind,
  location,
  locating,
  locationAllowed,
  onUseCurrent,
}: StepProps & {
  location: Location | null;
  locating: boolean;
  /** Device location permission from the privacy centre. */
  locationAllowed: boolean;
  onUseCurrent: () => void;
}) {
  const t = useT();
  const errors = form.formState.errors;
  const area = AREAS[values.areaKey];
  const isTip = kind === "tip";

  return (
    <div className="space-y-4">
      {isTip ? (
        <Notice tone="neutral" icon={EyeOff}>
          {t("report.where.tipNoDevice")}
        </Notice>
      ) : (
        <fieldset className="min-w-0">
          <legend className="sr-only">{t("report.step.where")}</legend>
          <div className="grid gap-3">
            <ChoiceCard
              name="locationMode"
              value="current"
              checked={values.locationMode === "current"}
              onSelect={onUseCurrent}
              icon={LocateFixed}
              title={t("report.where.current")}
              description={t("report.where.currentBody")}
            >
              {values.locationMode === "current" && locating && (
                <span
                  role="status"
                  className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t("report.where.locating")}
                </span>
              )}
              {values.locationMode === "current" &&
                location?.accuracyM !== undefined && (
                  <span className="mt-2 block text-sm text-muted-foreground">
                    {t("report.where.accuracy", { m: location.accuracyM })}
                  </span>
                )}
            </ChoiceCard>
            <ChoiceCard
              name="locationMode"
              value="area"
              checked={values.locationMode === "area"}
              onSelect={(v) => set("locationMode", v)}
              icon={MapPinned}
              title={t("report.where.area")}
              description={t("report.where.areaBody")}
            />
          </div>
          {/* With location access off, the notice below already says what to do. */}
          <FieldError
            message={
              showErrors &&
              !(values.locationMode === "current" && !locationAllowed)
                ? errors.locationMode?.message
                : undefined
            }
          />
        </fieldset>
      )}

      {values.locationMode === "current" && !locationAllowed && (
        <Notice
          tone="high"
          icon={Ban}
          role="alert"
          title={t("report.where.permissionOff")}
          action={
            <Button asChild variant="outline" size="xl">
              <Link href="/citizen/privacy">
                {t("report.where.openPrivacy")}
              </Link>
            </Button>
          }
        >
          {t("report.where.permissionOffBody")}
        </Notice>
      )}

      {values.locationMode === "area" && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="report-area" className="text-[15px]">
              {t("report.where.areaLabel")}
            </Label>
            <Select
              value={values.areaKey}
              onValueChange={(value) => {
                set("areaKey", value);
                set("landmark", "");
              }}
            >
              <SelectTrigger
                id="report-area"
                aria-invalid={showErrors && Boolean(errors.areaKey)}
                className="mt-2 w-full rounded-xl px-3.5 text-base data-[size=default]:h-12"
              >
                <SelectValue placeholder={t("report.where.areaPlaceholder")} />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                {SORTED_AREAS.map(([key, a]) => (
                  <SelectItem
                    key={key}
                    value={key}
                    className="min-h-10 text-[15px]"
                  >
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError
              message={showErrors ? errors.areaKey?.message : undefined}
            />
          </div>

          <div>
            <Label htmlFor="report-landmark" className="text-[15px]">
              {t("report.where.landmark")}
              <span className="font-normal text-muted-foreground">
                · {t("flow.optional")}
              </span>
            </Label>
            <Input
              id="report-landmark"
              {...form.register("landmark")}
              maxLength={80}
              autoComplete="off"
              placeholder={t("report.where.landmarkPlaceholder")}
              className={cn("mt-2", fieldClass)}
            />
            {area && (
              <div className="mt-2 flex flex-wrap gap-2">
                {area.landmarks.map((landmark) => (
                  <button
                    key={landmark}
                    type="button"
                    aria-pressed={values.landmark === landmark}
                    onClick={() =>
                      set(
                        "landmark",
                        values.landmark === landmark ? "" : landmark,
                      )
                    }
                    className="min-h-11 rounded-full border border-border bg-card px-3.5 text-sm font-medium transition-colors hover:border-input aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
                  >
                    {landmark}
                  </button>
                ))}
              </div>
            )}
            <FieldError
              message={showErrors ? errors.landmark?.message : undefined}
            />
          </div>
        </div>
      )}

      {location && (
        <LocationPreview
          location={location}
          marker={values.locationMode === "current" ? "me" : "pin"}
        />
      )}

      {values.locationMode === "current" && (
        <p className="text-sm text-muted-foreground">
          {t("report.where.shownOnce")}
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── 4. When? ───────────────────────── */

export function WhenStep({ form, values, set, showErrors }: StepProps) {
  const t = useT();
  const now = useNow(60_000);
  const errors = form.formState.errors;
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="sr-only">{t("report.step.when")}</legend>
      <ChoiceCard
        name="whenMode"
        value="now"
        checked={values.whenMode === "now"}
        onSelect={(v) => set("whenMode", v)}
        icon={Zap}
        title={t("report.when.now")}
        description={t("report.when.nowBody")}
      />
      <ChoiceCard
        name="whenMode"
        value="today"
        checked={values.whenMode === "today"}
        onSelect={(v) => set("whenMode", v)}
        icon={Clock}
        title={t("report.when.today")}
        description={t("report.when.todayBody")}
      />
      {values.whenMode === "today" && (
        <div className="pl-1">
          <Label htmlFor="report-when-time" className="text-[15px]">
            {t("report.when.time")}
            <span className="font-normal text-muted-foreground">
              · {t("flow.optional")}
            </span>
          </Label>
          <Input
            id="report-when-time"
            type="time"
            {...form.register("whenTime")}
            aria-invalid={showErrors && Boolean(errors.whenTime)}
            className={cn("mt-2 max-w-48", fieldClass)}
          />
          <FieldError
            message={showErrors ? errors.whenTime?.message : undefined}
          />
        </div>
      )}
      <ChoiceCard
        name="whenMode"
        value="custom"
        checked={values.whenMode === "custom"}
        onSelect={(v) => set("whenMode", v)}
        icon={CalendarDays}
        title={t("report.when.custom")}
        description={t("report.when.customBody")}
      />
      {values.whenMode === "custom" && (
        <div className="pl-1">
          <Label htmlFor="report-when-custom" className="text-[15px]">
            {t("report.when.dateTime")}
          </Label>
          <Input
            id="report-when-custom"
            type="datetime-local"
            max={now > 0 ? format(now, "yyyy-MM-dd'T'HH:mm") : undefined}
            {...form.register("whenCustom")}
            aria-invalid={showErrors && Boolean(errors.whenCustom)}
            className={cn("mt-2 max-w-72", fieldClass)}
          />
          <FieldError
            message={showErrors ? errors.whenCustom?.message : undefined}
          />
        </div>
      )}
    </fieldset>
  );
}

/* ───────────────────────── 5. Who or what was involved? ───────────────────────── */

const TAG_KEY: Record<InvolvedTag, TKey> = {
  vehicle: "report.involved.tag.vehicle",
  multiple: "report.involved.tag.multiple",
  weapon: "report.involved.tag.weapon",
  ongoing: "report.involved.tag.ongoing",
};

export function InvolvedStep({ form, values, set, showErrors }: StepProps) {
  const t = useT();
  return (
    <div className="space-y-5">
      <Notice
        tone="medium"
        icon={Hand}
        title={t("report.involved.safetyTitle")}
      >
        {t("report.involved.safety")}
      </Notice>

      <div>
        <Label htmlFor="report-involved" className="text-[15px]">
          {t("report.involved.label")}
          <span className="font-normal text-muted-foreground">
            · {t("flow.optional")}
          </span>
        </Label>
        <Textarea
          id="report-involved"
          {...form.register("involved")}
          maxLength={600}
          rows={3}
          placeholder={t("report.involved.placeholder")}
          className="mt-2 min-h-24 rounded-xl px-3.5 py-3 text-base md:text-base"
        />
        <FieldError
          message={
            showErrors ? form.formState.errors.involved?.message : undefined
          }
        />
      </div>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-[15px] font-medium">
          {t("report.involved.tagsLabel")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {INVOLVED_TAGS.map((tag) => (
            <ChoiceChip
              key={tag}
              type="checkbox"
              name="involvedTags"
              value={tag}
              checked={values.involvedTags.includes(tag)}
              onToggle={(value, checked) =>
                set(
                  "involvedTags",
                  checked
                    ? [...values.involvedTags, value]
                    : values.involvedTags.filter((x) => x !== value),
                )
              }
            >
              {t(TAG_KEY[tag])}
            </ChoiceChip>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/* ───────────────────────── 6. Evidence ───────────────────────── */

export function EvidenceStep({ form, values, set, showErrors }: StepProps) {
  const t = useT();
  const full = values.media.length >= MAX_MEDIA;
  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        {t("report.evidence.body")}
      </p>
      {full ? (
        <Notice tone="neutral">
          {t("report.evidence.limit", { max: MAX_MEDIA })}
        </Notice>
      ) : (
        <MediaPicker onPick={(m) => set("media", [...values.media, m])} />
      )}
      <div>
        <p
          role="status"
          className="mb-2 text-sm font-medium text-muted-foreground"
        >
          {values.media.length === 0
            ? t("report.evidence.none")
            : t("report.evidence.count", { count: values.media.length })}
        </p>
        <PickedMediaList
          items={values.media}
          onRemove={(index) =>
            set(
              "media",
              values.media.filter((_, i) => i !== index),
            )
          }
        />
      </div>
      <FieldError
        message={showErrors ? form.formState.errors.media?.message : undefined}
      />
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t("report.evidence.safety")}
      </p>
    </div>
  );
}

/* ───────────────────────── 7. Contact preference ───────────────────────── */

export function ContactStep({
  values,
  set,
  kind,
  citizen,
}: StepProps & { citizen: Citizen }) {
  const t = useT();
  const locked = kind === "tip";
  return (
    <div className="space-y-4">
      {locked && (
        <Notice tone="neutral" icon={EyeOff}>
          {t("report.contact.tipLocked")}
        </Notice>
      )}
      <fieldset disabled={locked} className="min-w-0">
        <legend className="sr-only">{t("report.step.contact")}</legend>
        <div className="grid gap-3">
          <ChoiceCard
            name="contact"
            value="call"
            checked={values.contact === "call"}
            onSelect={(v) => set("contact", v)}
            disabled={locked}
            icon={PhoneCall}
            title={t("report.contact.call")}
            description={
              locked
                ? undefined
                : t("report.contact.callBody", {
                    phone: citizen.phoneMasked ?? "",
                  })
            }
          />
          <ChoiceCard
            name="contact"
            value="chat"
            checked={values.contact === "chat"}
            onSelect={(v) => set("contact", v)}
            disabled={locked}
            icon={MessageCircle}
            title={t("report.contact.chat")}
            description={locked ? undefined : t("report.contact.chatBody")}
          />
          <ChoiceCard
            name="contact"
            value="none"
            checked={values.contact === "none"}
            onSelect={(v) => set("contact", v)}
            disabled={locked}
            icon={Ban}
            title={t("report.contact.none")}
            description={locked ? undefined : t("report.contact.noneBody")}
          />
        </div>
      </fieldset>
    </div>
  );
}

/* ───────────────────────── 8. Review and submit ───────────────────────── */

export const DANGER_KEY: Record<"yes" | "no" | "unsure", TKey> = {
  yes: "report.danger.yes",
  no: "report.danger.no",
  unsure: "report.danger.unsure",
};

export const CONTACT_KEY: Record<ReportValues["contact"], TKey> = {
  call: "report.contact.call",
  chat: "report.contact.chat",
  none: "report.contact.none",
};

/** One short line per step, used by the side summary and the review list. */
export function useStepAnswers(
  values: ReportValues,
  location: Location | null,
): Record<StepId, string | null> {
  const t = useT();
  const categories = useCategories();
  return useMemo(() => {
    const category = categories.find((c) => c.id === values.categoryId);
    const tags = values.involvedTags.map((tag) => t(TAG_KEY[tag]));
    const involved = [values.involved.trim(), tags.join(", ")]
      .filter(Boolean)
      .join(" · ");
    const custom = values.whenCustom
      ? new Date(values.whenCustom).getTime()
      : Number.NaN;
    return {
      what: category?.label ?? null,
      danger: values.danger ? t(DANGER_KEY[values.danger]) : null,
      where: location?.address ?? null,
      when:
        values.whenMode === "now"
          ? t("report.when.now")
          : values.whenMode === "today"
            ? `${t("report.when.today")}${values.whenTime ? ` · ${values.whenTime}` : ""}`
            : Number.isNaN(custom)
              ? null
              : formatDateTime(custom),
      involved: involved || null,
      evidence:
        values.media.length > 0
          ? t("report.evidence.count", { count: values.media.length })
          : null,
      contact: t(CONTACT_KEY[values.contact]),
      review: null,
    };
  }, [categories, location, t, values]);
}

export function ReviewStep({
  values,
  kind,
  answers,
  onEdit,
  failed,
  offline,
}: {
  values: ReportValues;
  kind: ReportKind;
  answers: Record<StepId, string | null>;
  onEdit: (step: number) => void;
  /** The last attempt to send did not go through. */
  failed: boolean;
  offline: boolean;
}) {
  const t = useT();
  const meta = KIND_META[kind];
  const KindIcon = meta.icon;

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-muted-foreground">
        {t("report.review.intro")}
      </p>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-inset p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-foreground shadow-card">
          <KindIcon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold">{t(meta.title)}</p>
          <p className="text-sm text-muted-foreground">
            {kind === "tip"
              ? t("report.review.identity.tip")
              : t("report.review.identity.report")}
          </p>
        </div>
      </div>

      <dl className="divide-y divide-border rounded-2xl border border-border">
        {STEPS.slice(0, -1).map((step, index) => {
          const answer = answers[step.id];
          return (
            <div key={step.id} className="flex items-start gap-3 px-4 py-3">
              <step.icon
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <dt className="text-sm text-muted-foreground">
                  {t(step.title)}
                </dt>
                <dd className="mt-0.5 text-[15px] font-medium break-words">
                  {answer ?? (
                    <span className="font-normal text-subtle">
                      {t("report.review.none")}
                    </span>
                  )}
                  {step.id === "what" && (
                    <span className="mt-1 block font-normal whitespace-pre-line text-muted-foreground">
                      {values.description.trim()}
                    </span>
                  )}
                </dd>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onEdit(index)}
                aria-label={`${t("flow.edit")}: ${t(step.title)}`}
                className="-mr-2 h-11 px-3 text-primary"
              >
                <Pencil aria-hidden />
                <span className="hidden sm:inline">{t("flow.edit")}</span>
              </Button>
            </div>
          );
        })}
      </dl>

      {offline && !failed && (
        <Notice tone="high" icon={WifiOff} role="status">
          {t("report.review.offline")}
        </Notice>
      )}

      {failed && (
        <Notice
          tone="critical"
          icon={WifiOff}
          role="alert"
          title={t("report.review.failedTitle")}
        >
          {t("report.review.failedBody")}
        </Notice>
      )}

      <DemoRecordNote />
    </div>
  );
}
