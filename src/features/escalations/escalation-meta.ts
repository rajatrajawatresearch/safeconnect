import type { Tone } from "@/config/incident";
import { formatSeconds } from "@/lib/format";
import type { Escalation, EscalationRule } from "@/types";

export const ESCALATION_LEVELS: (1 | 2 | 3)[] = [1, 2, 3];

/** Colour rises with the level an incident has been raised to. */
export const LEVEL_TONE: Record<1 | 2 | 3, Tone> = {
  1: "medium",
  2: "high",
  3: "critical",
};

export const LEVEL_NOTE: Record<1 | 2 | 3, string> = {
  1: "The station in charge reviews the incident.",
  2: "District command is informed and can move resources.",
  3: "State command is informed. For major incidents only.",
};

export const ESCALATION_STATUS_META: Record<
  Escalation["status"],
  { label: string; tone: Tone }
> = {
  open: { label: "Open", tone: "high" },
  acknowledged: { label: "Acknowledged", tone: "normal" },
  resolved: { label: "Resolved", tone: "resolved" },
};

export const TRIGGER_PHRASE: Record<EscalationRule["trigger"], string> = {
  no_acknowledgement: "is not acknowledged",
  no_assignment: "has no unit assigned",
  no_progress: "shows no response progress",
  no_arrival: "has no unit on scene",
};

export const TRIGGER_SHORT: Record<EscalationRule["trigger"], string> = {
  no_acknowledgement: "No acknowledgement",
  no_assignment: "No unit assigned",
  no_progress: "No response progress",
  no_arrival: "No arrival",
};

export const ACTION_PHRASE: Record<EscalationRule["action"], string> = {
  alert_supervisor: "alert the station supervisor",
  escalate_dispatcher: "escalate to the dispatcher",
  notify_command: "notify district command",
  notify_state: "notify state command",
};

/** "If a P3 incident has no unit assigned within 4 min, alert the station supervisor." */
export const ruleSentence = (rule: EscalationRule) =>
  `If a ${rule.priority} incident ${TRIGGER_PHRASE[rule.trigger]} within ${formatSeconds(rule.thresholdSec)}, ${ACTION_PHRASE[rule.action]}.`;

/** "No unit assigned within 4 min → alert the station supervisor" — for a list already grouped by priority. */
export const ruleLine = (rule: EscalationRule) =>
  `${TRIGGER_SHORT[rule.trigger]} within ${formatSeconds(rule.thresholdSec)}`;
