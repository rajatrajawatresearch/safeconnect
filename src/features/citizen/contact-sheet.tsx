"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
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
import { useAction } from "@/hooks/use-action";
import { useT } from "@/hooks/use-t";
import { services } from "@/services";
import type { EmergencyContact } from "@/types";
import { ResponsiveSheet } from "./responsive-sheet";

export const RELATIONS = [
  "Mother",
  "Father",
  "Partner",
  "Friend",
  "Guardian",
  "Sibling",
  "Other",
] as const satisfies readonly EmergencyContact["relation"][];

/** Strips formatting, the +91 country code and a leading trunk zero. */
const mobileDigits = (value: string) =>
  value.replace(/\D/g, "").replace(/^(?:91|0)(?=\d{10}$)/, "");

const isIndianMobile = (value: string) =>
  /^[6-9]\d{9}$/.test(mobileDigits(value));

/** Only the masked form is ever stored: "+91 98XXX XX412". */
export function maskPhone(value: string): string {
  const d = mobileDigits(value);
  return `+91 ${d.slice(0, 2)}XXX XX${d.slice(7)}`;
}

interface FormValues {
  name: string;
  relation: EmergencyContact["relation"];
  phone: string;
}

/**
 * Add or edit one trusted contact. When editing, the number may be left blank to keep the one
 * already saved, because the full number is never kept and so cannot be shown back.
 */
export function ContactSheet({
  open,
  onOpenChange,
  citizenId,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citizenId: string;
  /** The contact being edited, or `null` to add a new one. */
  contact: EmergencyContact | null;
}) {
  const t = useT();
  const formId = useId();
  const editing = contact !== null;

  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(2, t("citizen.contacts.nameError"))
          .max(60, t("citizen.contacts.nameError")),
        relation: z.enum(RELATIONS),
        phone: z
          .string()
          .refine(
            (value) =>
              (editing && value.trim() === "") || isIndianMobile(value),
            t("citizen.contacts.phoneError"),
          ),
      }),
    [t, editing],
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: contact?.name ?? "",
      relation: contact?.relation ?? "Friend",
      phone: "",
    },
  });

  const close = () => onOpenChange(false);
  const add = useAction(services.contacts.add, {
    success: t("citizen.contacts.added"),
    onSuccess: close,
  });
  const update = useAction(services.contacts.update, {
    success: t("citizen.contacts.updated"),
    onSuccess: close,
  });
  const pending = add.pending || update.pending;

  const submit = handleSubmit((values) => {
    const name = values.name.trim();
    if (contact) {
      void update.run(contact.id, {
        name,
        relation: values.relation,
        ...(values.phone.trim()
          ? { phoneMasked: maskPhone(values.phone) }
          : {}),
      });
      return;
    }
    void add.run({
      citizenId,
      name,
      relation: values.relation,
      phoneMasked: maskPhone(values.phone),
      notifyOnSos: true,
      notifyOnJourney: false,
      shareLocation: false,
    });
  });

  const fieldClass = "h-12 rounded-xl px-3.5 text-base md:text-base";

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t(
        editing ? "citizen.contacts.editTitle" : "citizen.contacts.addTitle",
      )}
      description={t("citizen.contacts.formBody")}
      footer={
        <>
          <Button type="button" variant="outline" size="xl" onClick={close}>
            {t("action.cancel")}
          </Button>
          <Button type="submit" form={formId} size="xl" disabled={pending}>
            {t(editing ? "action.save" : "citizen.contacts.add")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${formId}-name`} className="text-[15px]">
            {t("citizen.contacts.name")}
          </Label>
          <Input
            id={`${formId}-name`}
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
            className={fieldClass}
            {...register("name")}
          />
          {errors.name && (
            <p
              id={`${formId}-name-error`}
              role="alert"
              className="text-sm font-medium text-critical-fg"
            >
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${formId}-relation`} className="text-[15px]">
            {t("citizen.contacts.relation")}
          </Label>
          <Controller
            control={control}
            name="relation"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id={`${formId}-relation`}
                  className="w-full rounded-xl px-3.5 text-base data-[size=default]:h-12"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {RELATIONS.map((relation) => (
                    <SelectItem
                      key={relation}
                      value={relation}
                      className="min-h-11 text-base"
                    >
                      {t(`citizen.relation.${relation}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${formId}-phone`} className="text-[15px]">
            {t("citizen.contacts.phone")}
          </Label>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="grid h-12 shrink-0 place-items-center rounded-xl border border-input bg-inset px-3.5 font-mono text-base text-muted-foreground"
            >
              +91
            </span>
            <Input
              id={`${formId}-phone`}
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              maxLength={16}
              placeholder={
                editing
                  ? contact.phoneMasked.replace("+91 ", "")
                  : "98765 43210"
              }
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={`${formId}-phone-help`}
              className={`${fieldClass} tnum font-mono`}
              {...register("phone")}
            />
          </div>
          {errors.phone ? (
            <p
              id={`${formId}-phone-help`}
              role="alert"
              className="text-sm font-medium text-critical-fg"
            >
              {errors.phone.message}
            </p>
          ) : (
            <p
              id={`${formId}-phone-help`}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {t(
                editing
                  ? "citizen.contacts.phoneKeep"
                  : "citizen.contacts.phoneHelp",
              )}
            </p>
          )}
        </div>
      </form>
    </ResponsiveSheet>
  );
}
