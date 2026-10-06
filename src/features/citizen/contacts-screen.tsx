"use client";

import {
  BellRing,
  ChevronRight,
  MapPin,
  Pencil,
  Route,
  Trash2,
  TriangleAlert,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { BlankState, RestrictedState } from "@/components/shared/states";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { initialsOf } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import { services } from "@/services";
import { usePrefsStore } from "@/stores/prefs-store";
import type { Citizen, EmergencyContact } from "@/types";
import { ContactSheet } from "./contact-sheet";
import { useCitizenContacts } from "./use-citizen-data";

const MAX_CONTACTS = 5;

type ToggleKey = "notifyOnSos" | "notifyOnJourney" | "shareLocation";

const TOGGLES: {
  key: ToggleKey;
  icon: LucideIcon;
  labelKey: TKey;
  bodyKey: TKey;
}[] = [
  {
    key: "notifyOnSos",
    icon: BellRing,
    labelKey: "citizen.contacts.notifySos",
    bodyKey: "citizen.contacts.notifySosBody",
  },
  {
    key: "notifyOnJourney",
    icon: Route,
    labelKey: "citizen.contacts.notifyJourney",
    bodyKey: "citizen.contacts.notifyJourneyBody",
  },
  {
    key: "shareLocation",
    icon: MapPin,
    labelKey: "citizen.contacts.shareLocation",
    bodyKey: "citizen.contacts.shareLocationBody",
  },
];

function ContactCard({
  contact,
  onEdit,
  onRemove,
}: {
  contact: EmergencyContact;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const update = useAction(services.contacts.update, {
    success: t("citizen.contacts.updated"),
  });

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-3.5 p-4">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-base font-semibold text-accent-foreground"
        >
          {initialsOf(contact.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg leading-snug font-semibold">
            {contact.name}
          </h3>
          <p className="flex flex-wrap gap-x-1.5 text-sm text-muted-foreground">
            <span>{t(`citizen.relation.${contact.relation}`)}</span>
            <span className="tnum font-mono text-[13px] whitespace-nowrap">
              {contact.phoneMasked}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xl"
          className="size-11 shrink-0"
          onClick={onEdit}
          aria-label={t("citizen.contacts.editNamed", { name: contact.name })}
        >
          <Pencil aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-xl"
          className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={t("citizen.contacts.removeNamed", { name: contact.name })}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
      <ul className="divide-y divide-border/70 border-t border-border/70">
        {TOGGLES.map((toggle) => {
          const id = `${contact.id}-${toggle.key}`;
          return (
            <li key={toggle.key}>
              <label
                htmlFor={id}
                className="flex min-h-16 cursor-pointer items-center gap-3.5 px-4 py-3"
              >
                <toggle.icon
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">
                    {t(toggle.labelKey)}
                  </span>
                  <span className="block text-sm leading-snug text-muted-foreground">
                    {t(toggle.bodyKey)}
                  </span>
                </span>
                <Switch
                  id={id}
                  checked={contact[toggle.key]}
                  disabled={update.pending}
                  onCheckedChange={(checked) =>
                    void update.run(contact.id, { [toggle.key]: checked })
                  }
                />
              </label>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function Contacts({ citizen }: { citizen: Citizen }) {
  const t = useT();
  const contacts = useCitizenContacts(citizen.id);
  const allowed = usePrefsStore((s) => s.privacy.emergencyContacts);
  const [sheet, setSheet] = useState<{
    open: boolean;
    contact: EmergencyContact | null;
    /** Bumped on every opening so the form always starts from the right values. */
    nonce: number;
  }>({ open: false, contact: null, nonce: 0 });
  const [removing, setRemoving] = useState<EmergencyContact | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const remove = useAction(services.contacts.remove, {
    success: t("citizen.contacts.removed"),
    onSuccess: () => setRemoveOpen(false),
  });

  const openSheet = (contact: EmergencyContact | null) =>
    setSheet((s) => ({ open: true, contact, nonce: s.nonce + 1 }));
  const full = contacts.length >= MAX_CONTACTS;

  return (
    <PageContainer width="wide">
      <PageHeader
        title={t("citizen.section.contacts")}
        description={t("citizen.contacts.description")}
        actions={
          contacts.length > 0 && (
            <Button size="xl" disabled={full} onClick={() => openSheet(null)}>
              <UserPlus aria-hidden />
              {t("citizen.contacts.add")}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="@container min-w-0 space-y-4">
          {!allowed && (
            <Link
              href="/citizen/privacy"
              className="flex items-start gap-3 rounded-2xl border border-medium/40 bg-medium-soft p-4 text-medium-fg"
            >
              <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
              <span className="min-w-0 flex-1 text-[15px] leading-snug">
                <span className="block font-semibold">
                  {t("citizen.contacts.offTitle")}
                </span>
                {t("citizen.contacts.offBody")}
              </span>
              <ChevronRight aria-hidden className="mt-0.5 size-5 shrink-0" />
            </Link>
          )}

          {contacts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card shadow-card">
              <BlankState
                icon={Users}
                title={t("citizen.contacts.empty")}
                description={t("citizen.contacts.emptyBody")}
                action={
                  <Button size="xl" onClick={() => openSheet(null)}>
                    <UserPlus aria-hidden />
                    {t("citizen.contacts.add")}
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 @min-[44rem]:grid-cols-2">
              {contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onEdit={() => openSheet(contact)}
                  onRemove={() => {
                    setRemoving(contact);
                    setRemoveOpen(true);
                  }}
                />
              ))}
            </ul>
          )}

          {contacts.length > 0 && (
            <p className="px-1 text-sm text-muted-foreground">
              {t(
                full
                  ? "citizen.contacts.limitReached"
                  : "citizen.contacts.limit",
                { count: contacts.length, max: MAX_CONTACTS },
              )}
            </p>
          )}
        </div>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-card lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold">
            {t("citizen.contacts.howTitle")}
          </h2>
          <ul className="mt-3 space-y-3 text-[15px] leading-relaxed">
            <li>{t("citizen.contacts.how1")}</li>
            <li>{t("citizen.contacts.how2")}</li>
            <li>{t("citizen.contacts.how3")}</li>
          </ul>
          <p className="mt-4 border-t border-border/70 pt-3 text-[13px] leading-relaxed text-muted-foreground">
            {t("citizen.sos.contactsDemo")}
          </p>
        </aside>
      </div>

      <ContactSheet
        key={sheet.nonce}
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        citizenId={citizen.id}
        contact={sheet.contact}
      />

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent className="gap-5 rounded-2xl p-5 data-[size=default]:sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">
              {t("citizen.contacts.removeTitle", {
                name: removing?.name ?? "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-relaxed">
              {t("citizen.contacts.removeBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="-mx-5 -mb-5 rounded-b-2xl p-5">
            <AlertDialogCancel size="xl">
              {t("citizen.contacts.keep")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              size="xl"
              disabled={remove.pending}
              onClick={() => removing && void remove.run(removing.id)}
            >
              {t("citizen.contacts.remove")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

export function ContactsScreen() {
  const { citizen } = useSession();
  if (!citizen)
    return (
      <RestrictedState description="This screen is for the citizen app. Switch to a citizen from the demo role menu." />
    );
  return <Contacts citizen={citizen} />;
}
