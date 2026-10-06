"use client";

import { ToneChip } from "@/components/shared/status-chips";
import { STATUS_META, UNIT_STATUS_META } from "@/config/incident";
import { useT } from "@/hooks/use-t";
import type { IncidentStatus, UnitStatus } from "@/types";

/**
 * The shared status chip with its label in the citizen's language.
 * Tone and shape come from the same maps the staff consoles use, so a status reads the same
 * everywhere; only the wording follows the language switch.
 */
export function IncidentStatusLabel({
  status,
  size,
}: {
  status: IncidentStatus;
  size?: "sm" | "md";
}) {
  const t = useT();
  return (
    <ToneChip tone={STATUS_META[status].tone} size={size} dot>
      {t(`status.${status}`)}
    </ToneChip>
  );
}

/** Where the responding unit is in its run, as far as a citizen needs to know. */
export function UnitProgressLabel({ status }: { status: UnitStatus }) {
  const t = useT();
  const meta = UNIT_STATUS_META[status];
  return (
    <ToneChip tone={meta.tone} dot>
      {status === "assigned" || status === "en_route" || status === "on_scene"
        ? t(`status.${status}`)
        : meta.label}
    </ToneChip>
  );
}
