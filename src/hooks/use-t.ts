"use client";

import { useCallback } from "react";
import { translate, type TKey, type TVars } from "@/lib/i18n";
import { usePrefsStore } from "@/stores/prefs-store";

/** `const t = useT(); t("citizen.sos.hold")` — follows the language chosen in the header. */
export function useT() {
  const language = usePrefsStore((s) => s.language);
  return useCallback(
    (key: TKey, vars?: TVars) => translate(language, key, vars),
    [language],
  );
}

export const useLanguage = () => usePrefsStore((s) => s.language);
