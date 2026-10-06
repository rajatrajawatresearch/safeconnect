"use client";

import {
  BadgeCheck,
  CopyCheck,
  Info,
  Languages,
  Pencil,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { PriorityBadge, ToneChip } from "@/components/shared/status-chips";
import { ClockStamp } from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_GROUP_LABEL,
  PRIORITIES,
  PRIORITY_META,
} from "@/config/incident";
import { useAction } from "@/hooks/use-action";
import { useCategories, useCategoryLookup } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { CategoryGroup, Incident, IncidentPriority } from "@/types";
import { isActive } from "./incident-rules";

const LANG_CODE: Record<string, string> = { Gujarati: "gu", Hindi: "hi" };

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-3 gap-y-0.5 @sm:grid-cols-[8.5rem_1fr]">
      <dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm leading-5 break-words">{children}</dd>
    </div>
  );
}

/**
 * Assisted triage. The assistant proposes a priority and a category with its reasoning; nothing on
 * the incident changes until an operator confirms or overrides it. The card is drawn with a dashed
 * outline while it is only a suggestion, so it never reads as part of the record.
 */
export function TriageCard({ incident }: { incident: Incident }) {
  const { actor, can } = useSession();
  const categories = useCategories();
  const lookup = useCategoryLookup();
  const ai = incident.ai;
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [priority, setPriority] = useState<IncidentPriority>(incident.priority);
  const [categoryId, setCategoryId] = useState(incident.categoryId);
  const confirm = useAction(services.incidents.confirmTriage, {
    success: "Triage confirmed",
    onSuccess: () => setEditing(false),
  });

  const allowed = can("incident.classify");
  const open = isActive(incident);
  const confirmed = Boolean(ai?.confirmedBy);
  const followsSuggestion =
    !ai ||
    (ai.suggestedPriority === incident.priority &&
      ai.suggestedCategoryId === incident.categoryId);

  const grouped = useMemo(() => {
    const groups = new Map<CategoryGroup, typeof categories>();
    for (const category of categories) {
      if (!category.enabled && category.id !== incident.categoryId) continue;
      const list = groups.get(category.group) ?? [];
      list.push(category);
      groups.set(category.group, list);
    }
    return [...groups.entries()];
  }, [categories, incident.categoryId]);

  const startEditing = () => {
    // Start from the suggestion while it is unreviewed, otherwise from what is on record.
    setPriority(confirmed || !ai ? incident.priority : ai.suggestedPriority);
    setCategoryId(
      confirmed || !ai ? incident.categoryId : ai.suggestedCategoryId,
    );
    setEditing(true);
  };

  return (
    <section
      aria-labelledby={`${fieldId}-title`}
      className={cn(
        "rounded-xl border bg-inset",
        confirmed || !ai ? "border-border/70" : "border-dashed border-input",
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3.5 py-2.5">
        <h3
          id={`${fieldId}-title`}
          className="flex items-center gap-1.5 text-sm font-semibold"
        >
          <Sparkles aria-hidden className="size-4 text-primary" />
          {ai ? "Assistant suggestion" : "Classification"}
        </h3>
        {ai && (
          <ToneChip tone="neutral" variant="outline">
            Advisory
          </ToneChip>
        )}
      </header>

      {ai ? (
        <dl className="space-y-2.5 px-3.5 py-3">
          <Row label="Suggested priority">
            <span className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={ai.suggestedPriority} variant="soft" />
              <span className="text-xs text-muted-foreground">
                {PRIORITY_META[ai.suggestedPriority].definition}
              </span>
            </span>
          </Row>
          <Row label="Suggested category">
            {lookup(ai.suggestedCategoryId)?.label ?? ai.suggestedCategoryId}
          </Row>
          <Row label="Reason">{ai.reason}</Row>
          <Row label="Summary">{ai.summary}</Row>
          <Row label="Missing information">
            {ai.missingInfo.length > 0 ? (
              <ul className="list-disc space-y-0.5 pl-4 marker:text-subtle">
                {ai.missingInfo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground">Nothing flagged.</span>
            )}
          </Row>
          {ai.duplicateOfId && (
            <Row label="Possible duplicate">
              <Link
                href={`/control/incidents?id=${ai.duplicateOfId}`}
                className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
              >
                <CopyCheck aria-hidden className="size-3.5" />
                <span className="tnum font-mono text-[13px]">
                  {ai.duplicateOfId}
                </span>
              </Link>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                May describe the same event. Compare before linking the two.
              </span>
            </Row>
          )}
          {ai.translationOf && (
            <Row label="Translation">
              <span className="flex items-start gap-1.5">
                <Languages
                  aria-hidden
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                />
                <span>
                  Translated by the assistant from {ai.translationOf.language}.
                  <span className="mt-0.5 block text-muted-foreground">
                    Original:{" "}
                    <q lang={LANG_CODE[ai.translationOf.language]}>
                      {ai.translationOf.original}
                    </q>
                  </span>
                </span>
              </span>
            </Row>
          )}
        </dl>
      ) : (
        <p className="px-3.5 py-3 text-sm text-muted-foreground">
          No assistant suggestion was produced for this incident. The priority
          and category were set when it was logged.
        </p>
      )}

      <div className="border-t border-border/70 px-3.5 py-3">
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void confirm.run(incident.id, { priority, categoryId }, actor);
            }}
          >
            <div className="grid gap-3 @sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-priority`}>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as IncidentPriority)}
                >
                  <SelectTrigger id={`${fieldId}-priority`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p} · {PRIORITY_META[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-category`}>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id={`${fieldId}-category`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-72">
                    {grouped.map(([group, items]) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{CATEGORY_GROUP_LABEL[group]}</SelectLabel>
                        {items.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {PRIORITY_META[priority].definition}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={confirm.pending}>
                <BadgeCheck aria-hidden />
                {confirm.pending ? "Confirming…" : "Confirm classification"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : confirmed && ai?.confirmedBy ? (
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm font-medium">
                <BadgeCheck
                  aria-hidden
                  className="size-4 shrink-0 text-resolved-fg"
                />
                Confirmed by {ai.confirmedBy.name}
                {ai.confirmedAt && (
                  <>
                    {" "}
                    at <ClockStamp at={ai.confirmedAt} />
                  </>
                )}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                On record as
                <PriorityBadge priority={incident.priority} variant="soft" />
                {lookup(incident.categoryId)?.label ?? incident.title}
                {!followsSuggestion && (
                  <span className="text-subtle">
                    · changed from the suggestion
                  </span>
                )}
              </p>
            </div>
            {allowed && open && (
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Pencil aria-hidden /> Revise
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {ai && (
              <p
                role="note"
                className="flex items-start gap-2 text-[13px] leading-snug text-medium-fg"
              >
                <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  <span className="font-semibold">
                    Operator confirmation required.
                  </span>{" "}
                  The suggestion is advice only. The incident stays at{" "}
                  {incident.priority} {PRIORITY_META[incident.priority].label}{" "}
                  until an operator confirms or changes it.
                </span>
              </p>
            )}
            {!open ? (
              <p className="text-[13px] text-muted-foreground">
                The incident is no longer open, so its classification cannot be
                changed.
              </p>
            ) : !allowed ? (
              <p className="text-[13px] text-muted-foreground">
                Your role cannot confirm triage. An operator or supervisor
                reviews the suggestion.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ai && (
                  <Button
                    disabled={confirm.pending}
                    onClick={() =>
                      confirm.run(
                        incident.id,
                        {
                          priority: ai.suggestedPriority,
                          categoryId: ai.suggestedCategoryId,
                        },
                        actor,
                      )
                    }
                  >
                    <BadgeCheck aria-hidden />
                    {confirm.pending ? "Confirming…" : "Confirm suggestion"}
                  </Button>
                )}
                <Button variant="outline" onClick={startEditing}>
                  <Pencil aria-hidden /> Change
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
