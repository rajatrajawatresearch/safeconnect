"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Fragment, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { LANGUAGES } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import type { LanguageCode, NotificationTemplate } from "@/types";
import { CHANNEL_LABEL, placeholdersIn } from "./admin-meta";
import { Spinner } from "./admin-ui";

const MAX_LENGTH = 320;

/** Message text with its `{placeholder}` tokens set apart so they read as slots, not words. */
export function TemplateText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {text.split(/(\{\w+\})/g).map((part, index) =>
        /^\{\w+\}$/.test(part) ? (
          <code
            key={index}
            className="rounded bg-muted px-1 py-px font-mono text-[0.85em] text-foreground"
          >
            {part}
          </code>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </span>
  );
}

const joinTokens = (tokens: string[]) =>
  tokens.length <= 1
    ? tokens.join("")
    : `${tokens.slice(0, -1).join(", ")} and ${tokens[tokens.length - 1]}`;

function bodyField(language: string, tokens: string[]) {
  return z
    .string()
    .trim()
    .min(1, `Enter the ${language} text.`)
    .max(MAX_LENGTH, `Keep the message under ${MAX_LENGTH} characters.`)
    .superRefine((value, ctx) => {
      if (!value) return;
      const used = placeholdersIn(value);
      const missing = tokens.filter((t) => !used.includes(t));
      const unknown = used.filter((t) => !tokens.includes(t));
      if (missing.length)
        ctx.addIssue({
          code: "custom",
          message: `Keep ${joinTokens(missing)} in the ${language} text.`,
        });
      if (unknown.length)
        ctx.addIssue({
          code: "custom",
          message: `${joinTokens(unknown)} ${unknown.length === 1 ? "is not a placeholder" : "are not placeholders"} this message can fill.`,
        });
    });
}

const languageName = (code: LanguageCode) =>
  LANGUAGES.find((l) => l.code === code)?.english ?? code;

const buildSchema = (tokens: string[]) =>
  z.object({
    en: bodyField(languageName("en"), tokens),
    gu: bodyField(languageName("gu"), tokens),
    hi: bodyField(languageName("hi"), tokens),
  }) satisfies z.ZodType<Record<LanguageCode, string>>;

type FormValues = Record<LanguageCode, string>;

export function TemplateDialog({
  template,
  onClose,
}: {
  template: NotificationTemplate;
  onClose: () => void;
}) {
  const { actor } = useSession();
  // The placeholders a message can fill are fixed by the event that sends it, so they are read
  // from the stored English text and must survive every edit and every translation.
  const tokens = useMemo(
    () => placeholdersIn(template.body.en),
    [template.body.en],
  );
  const schema = useMemo(() => buildSchema(tokens), [tokens]);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...template.body },
  });
  const draft = useWatch({ control });

  const save = useAction(services.admin.updateTemplate, {
    success: "Template saved",
    onSuccess: onClose,
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit “{template.name}”</DialogTitle>
          <DialogDescription>
            {CHANNEL_LABEL[template.channel]} message. Shown in the
            recipient&apos;s language. No message is sent from this prototype.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="grid grid-cols-1 gap-4"
          onSubmit={handleSubmit(
            (values) => void save.run(template.id, { body: values }, actor),
          )}
        >
          <div className="rounded-xl border border-border bg-inset px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              {tokens.length === 0
                ? "This message has no placeholders."
                : "Placeholders are filled in when the message is sent. Keep each one, exactly as written, in every language."}
            </p>
            {tokens.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {tokens.map((token) => (
                  <li key={token}>
                    <code className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-xs">
                      {token}
                    </code>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {LANGUAGES.map((language) => {
            const id = `template-body-${language.code}`;
            const error = errors[language.code]?.message;
            const value = draft[language.code] ?? "";
            const missing = tokens.filter((t) => !value.includes(t));
            return (
              <div key={language.code} className="grid grid-cols-1 gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor={id}>
                    <span lang={language.htmlLang}>{language.native}</span>
                    {language.native !== language.english && (
                      <span className="font-normal text-muted-foreground">
                        {language.english}
                      </span>
                    )}
                  </Label>
                  <span
                    className={cn(
                      "tnum text-xs",
                      value.length > MAX_LENGTH
                        ? "text-destructive"
                        : "text-subtle",
                    )}
                  >
                    {value.length} / {MAX_LENGTH}
                  </span>
                </div>
                <Textarea
                  id={id}
                  lang={language.htmlLang}
                  rows={2}
                  aria-invalid={Boolean(error)}
                  aria-describedby={`${id}-status`}
                  {...register(language.code)}
                />
                <p
                  id={`${id}-status`}
                  role={error ? "alert" : undefined}
                  className={cn(
                    "text-xs",
                    error
                      ? "text-destructive"
                      : missing.length
                        ? "text-high-fg"
                        : "text-muted-foreground",
                  )}
                >
                  {error ??
                    (missing.length
                      ? `Missing ${joinTokens(missing)}.`
                      : tokens.length
                        ? "All placeholders present."
                        : "Plain text.")}
                </p>
              </div>
            );
          })}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="lg" disabled={!isDirty || save.pending}>
              {save.pending && <Spinner />}
              Save template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
