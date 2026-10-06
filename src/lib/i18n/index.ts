import type { LanguageCode } from "@/types";
import { citizen } from "./dictionaries/citizen";
import { citizenFlows } from "./dictionaries/citizen-flows";
import { officer } from "./dictionaries/officer";
import { common } from "./dictionaries/common";
import { staff } from "./dictionaries/staff";

/**
 * Adding a language: add its code to `LanguageCode`, an entry to `LANGUAGES`, and a block to each
 * dictionary file. Missing keys fall back to English, so a language can be rolled out screen by screen.
 */
export const LANGUAGES: {
  code: LanguageCode;
  native: string;
  english: string;
  htmlLang: string;
}[] = [
  { code: "en", native: "English", english: "English", htmlLang: "en-IN" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", htmlLang: "gu-IN" },
  { code: "hi", native: "हिन्दी", english: "Hindi", htmlLang: "hi-IN" },
];

const en = { ...common.en, ...citizen.en, ...citizenFlows.en, ...staff.en, ...officer.en };

export type TKey = keyof typeof en;

const DICTIONARIES: Record<LanguageCode, Partial<Record<TKey, string>>> = {
  en,
  gu: { ...common.gu, ...citizen.gu, ...citizenFlows.gu, ...staff.gu, ...officer.gu },
  hi: { ...common.hi, ...citizen.hi, ...citizenFlows.hi, ...staff.hi, ...officer.hi },
};

export type TVars = Record<string, string | number>;

export function translate(
  language: LanguageCode,
  key: TKey,
  vars?: TVars,
): string {
  const template = DICTIONARIES[language][key] ?? en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
