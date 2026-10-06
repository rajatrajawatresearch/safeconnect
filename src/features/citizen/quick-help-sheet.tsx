"use client";

import {
  Baby,
  Flame,
  HeartPulse,
  MapPin,
  Shield,
  ShieldUser,
  Tag,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage, useT } from "@/hooks/use-t";
import type { TKey } from "@/lib/i18n";
import type { Citizen } from "@/types";
import { ResponsiveSheet } from "./responsive-sheet";
import { joinNames, useSosContacts } from "./use-citizen-data";

export interface QuickHelp {
  key: "police" | "medical" | "fire" | "women" | "child";
  categoryId: string;
  icon: LucideIcon;
  labelKey: TKey;
  /** One line on who the control room brings in for this kind of request. */
  bodyKey: TKey;
}

export const QUICK_HELP: QuickHelp[] = [
  {
    key: "police",
    categoryId: "police_help",
    icon: Shield,
    labelKey: "citizen.quick.police",
    bodyKey: "citizen.quick.policeBody",
  },
  {
    key: "medical",
    categoryId: "medical",
    icon: HeartPulse,
    labelKey: "citizen.quick.medical",
    bodyKey: "citizen.quick.medicalBody",
  },
  {
    key: "fire",
    categoryId: "fire",
    icon: Flame,
    labelKey: "citizen.quick.fire",
    bodyKey: "citizen.quick.fireBody",
  },
  {
    key: "women",
    categoryId: "woman_safety",
    icon: ShieldUser,
    labelKey: "citizen.quick.women",
    bodyKey: "citizen.quick.womenBody",
  },
  {
    key: "child",
    categoryId: "child_safety",
    icon: Baby,
    labelKey: "citizen.quick.child",
    bodyKey: "citizen.quick.childBody",
  },
];

function SentItem({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: string;
}) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 pt-1 text-[15px] leading-snug">{children}</span>
    </li>
  );
}

/**
 * Second step of a quick action. Spells out exactly what leaves the phone before anything is sent,
 * so a single tap on the home screen can never raise an emergency.
 */
export function QuickHelpSheet({
  help,
  citizen,
  shareLive,
  pending,
  onOpenChange,
  onConfirm,
}: {
  /** The request being confirmed, or `null` when the sheet is closed. */
  help: QuickHelp | null;
  citizen: Citizen;
  shareLive: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (help: QuickHelp, note: string) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const { contacts } = useSosContacts(citizen.id);
  const [note, setNote] = useState("");
  // Keep the last request on screen while the sheet animates out.
  const [shown, setShown] = useState<QuickHelp | null>(help);
  if (help && help !== shown) setShown(help);
  const current = help ?? shown;
  if (!current) return null;

  const kind = t(current.labelKey);
  const place = `${citizen.area}, ${citizen.city}`;

  return (
    <ResponsiveSheet
      open={help !== null}
      onOpenChange={(open) => {
        if (!open) setNote("");
        onOpenChange(open);
      }}
      title={t("citizen.quick.sheetTitle", { kind })}
      description={t(current.bodyKey)}
      footer={
        <>
          <Button
            variant="outline"
            size="xl"
            onClick={() => onOpenChange(false)}
          >
            {t("action.cancel")}
          </Button>
          <Button
            variant="critical"
            size="xl"
            disabled={pending}
            onClick={() => onConfirm(current, note)}
          >
            {pending ? t("citizen.home.sending") : t("citizen.quick.send")}
          </Button>
        </>
      }
    >
      <h3 className="text-sm font-semibold text-muted-foreground">
        {t("citizen.quick.willSend")}
      </h3>
      <ul className="mt-1 divide-y divide-border/70">
        <SentItem icon={MapPin}>
          {t(
            shareLive ? "citizen.quick.sendLocation" : "citizen.quick.sendArea",
            { place },
          )}
        </SentItem>
        <SentItem icon={UserRound}>{t("citizen.quick.sendIdentity")}</SentItem>
        <SentItem icon={Tag}>{t("citizen.quick.sendKind", { kind })}</SentItem>
        {contacts.length > 0 && (
          <SentItem icon={Users}>
            {t("citizen.quick.sendContacts", {
              names: joinNames(contacts, language),
            })}
          </SentItem>
        )}
      </ul>

      <div className="mt-4 space-y-2">
        <Label htmlFor="quick-help-note" className="text-[15px]">
          {t("citizen.quick.noteLabel")}
        </Label>
        <Textarea
          id="quick-help-note"
          value={note}
          maxLength={240}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("citizen.quick.notePlaceholder")}
          className="min-h-20 rounded-xl text-base md:text-[15px]"
        />
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
        {t("citizen.quick.demoNote")}
      </p>
    </ResponsiveSheet>
  );
}
