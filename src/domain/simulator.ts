/**
 * Stands in for the outside world: other operators, officers in the field, new calls coming in.
 *
 * Three things happen on a one-second tick while the simulation is running:
 *  1. Incidents raised through the app ("auto") are walked along the response chain so a citizen
 *     sees help being coordinated without anyone driving the other consoles.
 *  2. The escalation policy configured in the admin console is evaluated against open incidents.
 *  3. Roughly every half minute one quiet ambient event occurs.
 *
 * It runs in the browser for the stand-alone demo and inside the API server otherwise — one
 * authority either way, so two open browsers never both invent events.
 */
import { AREAS, type AreaKey } from "@/data/demo/geo";
import { OPERATOR } from "@/data/demo/incidents";
import { INCIDENT_TEMPLATES } from "@/data/demo/simulation";
import { offsetPoint } from "@/lib/geo";
import type { ActorRef, EscalationRule, Incident } from "@/types";
import type { DemoStore } from "./platform-store";

export interface SimulatorHost {
  getState: () => DemoStore;
  /** The stand-alone demo can pretend to be offline; nothing reaches the "control room" then. */
  isOffline?: () => boolean;
}

const SECOND_OPERATOR: ActorRef = {
  id: "stf-farah",
  name: "Farah Sheikh",
  role: "operator",
};
const POLICY: ActorRef = {
  id: "policy",
  name: "Escalation policy",
  role: "admin",
};
const PERSONA_CITIZENS = new Set(["cit-aarav", "cit-kavya"]);

const AUTO_DELAY = { new: 2500, acknowledged: 4500, assigned: 6500 } as const;
const AMBIENT_EVERY: [number, number] = [24_000, 36_000];
const MAX_ACTIVE = 15;

const OPERATOR_REPLIES = [
  "Received. Stay where you are if it is safe to do so.",
  "Thank you. I have passed that to the responding unit.",
  "Understood. Keep this chat open — I am staying with you.",
  "Noted. The officers will look for you there.",
];

/** Escalation level raised by each policy action. The admin console shows the same mapping. */
export const ESCALATION_ACTION_LEVEL: Record<
  EscalationRule["action"],
  1 | 2 | 3
> = {
  alert_supervisor: 1,
  escalate_dispatcher: 1,
  notify_command: 2,
  notify_state: 3,
};

const RULE_REASON: Record<EscalationRule["trigger"], string> = {
  no_acknowledgement: "Not acknowledged",
  no_assignment: "No unit assigned",
  no_progress: "No response progress",
  no_arrival: "Unit has not arrived",
};

const between = ([min, max]: [number, number]) =>
  min + Math.random() * (max - min);
const isOpen = (i: Incident) =>
  !["resolved", "closed", "cancelled"].includes(i.status);

export function createSimulator(host: SimulatorHost) {
  const mem = {
    startedAt: 0,
    nextAmbientAt: 0,
    lastEscalationAt: 0,
    replyIndex: 0,
    templateIndex: 0,
  };

  function progressAutoIncidents(now: number) {
    const store = host.getState();
    for (const incident of store.incidents) {
      if (incident.sync !== "synced" || !isOpen(incident)) continue;

      // Any unit whose ETA has run out arrives, whether or not the incident is scripted.
      if (
        incident.status === "en_route" &&
        incident.etaAt &&
        now >= incident.etaAt
      ) {
        store.advanceIncident(incident.id);
        continue;
      }
      if (!incident.auto) continue;

      if (
        incident.status === "new" &&
        now - incident.createdAt > AUTO_DELAY.new
      )
        store.advanceIncident(incident.id);
      else if (
        incident.status === "acknowledged" &&
        now - (incident.acknowledgedAt ?? now) > AUTO_DELAY.acknowledged
      )
        store.advanceIncident(incident.id);
      else if (
        incident.status === "assigned" &&
        now - (incident.assignedAt ?? now) > AUTO_DELAY.assigned
      )
        store.advanceIncident(incident.id);
    }
  }

  /** When nobody is staffing the control room in the demo, the operator still answers the citizen. */
  function replyToCitizens(now: number) {
    const store = host.getState();
    for (const incident of store.incidents) {
      if (
        !incident.auto ||
        !isOpen(incident) ||
        incident.status === "new" ||
        incident.sync !== "synced"
      )
        continue;
      const thread = store.messages.filter(
        (m) => m.incidentId === incident.id && m.channel === "citizen",
      );
      const last = thread[thread.length - 1];
      if (!last || last.senderRole !== "citizen" || now - last.at < 2800)
        continue;
      const operator: ActorRef = {
        id: incident.operatorId ?? OPERATOR.id,
        name: incident.operatorName ?? OPERATOR.name,
        role: "operator",
      };
      store.sendMessage(
        incident.id,
        "citizen",
        OPERATOR_REPLIES[mem.replyIndex % OPERATOR_REPLIES.length],
        operator,
        `${operator.name.split(" ")[0]} · Control room`,
      );
      mem.replyIndex += 1;
    }
  }

  function evaluateEscalationPolicy(now: number) {
    // One automatic escalation at a time, and none in the first seconds of a session.
    if (now - mem.startedAt < 20_000 || now - mem.lastEscalationAt < 25_000)
      return;
    const store = host.getState();
    for (const incident of store.incidents) {
      if (incident.sync !== "synced" || !isOpen(incident)) continue;
      for (const rule of store.escalationRules) {
        if (!rule.enabled || rule.priority !== incident.priority) continue;
        const since =
          rule.trigger === "no_acknowledgement" && incident.status === "new"
            ? incident.createdAt
            : rule.trigger === "no_assignment" &&
                (incident.status === "new" ||
                  incident.status === "acknowledged")
              ? incident.createdAt
              : rule.trigger === "no_progress" && incident.status === "assigned"
                ? incident.assignedAt
                : rule.trigger === "no_arrival" &&
                    incident.status === "en_route"
                  ? incident.enRouteAt
                  : undefined;
        if (!since || now - since < rule.thresholdSec * 1000) continue;
        if (
          store.escalations.some(
            (e) => e.incidentId === incident.id && e.ruleId === rule.id,
          )
        )
          continue;
        store.escalateIncident(
          incident.id,
          ESCALATION_ACTION_LEVEL[rule.action],
          `${RULE_REASON[rule.trigger]} within the ${rule.priority} threshold (${rule.thresholdSec} sec)`,
          POLICY,
          rule.id,
        );
        mem.lastEscalationAt = now;
        return;
      }
    }
  }

  function ambientEvent(now: number) {
    const store = host.getState();
    // Leave anything a demo persona is part of to the presenter.
    const background = store.incidents.filter(
      (i) =>
        isOpen(i) &&
        i.sync === "synced" &&
        !i.auto &&
        !(i.citizenId && PERSONA_CITIZENS.has(i.citizenId)),
    );
    const options: (() => void)[] = [];

    const unacknowledged = background
      .filter((i) => i.status === "new")
      .sort((a, b) => a.createdAt - b.createdAt)[0];
    if (unacknowledged) {
      options.push(() =>
        store.acknowledgeIncident(unacknowledged.id, SECOND_OPERATOR),
      );
      options.push(() =>
        store.acknowledgeIncident(unacknowledged.id, SECOND_OPERATOR),
      );
    }

    const waiting = background.filter(
      (i) =>
        i.status === "acknowledged" &&
        (i.priority === "P1" || i.priority === "P2" || i.priority === "P3"),
    )[0];
    if (
      waiting &&
      store.units.filter((u) => u.status === "available").length > 2
    )
      options.push(() => store.advanceIncident(waiting.id));

    const accepted = background.find(
      (i) =>
        i.status === "assigned" &&
        i.assignments.some((a) => a.response === "accepted"),
    );
    if (accepted) options.push(() => store.advanceIncident(accepted.id));

    const moving = background.find(
      (i) => i.status === "en_route" && i.etaAt && i.etaAt - now > 60_000,
    );
    if (moving?.etaAt) {
      const shift =
        (Math.random() < 0.6 ? -1 : 1) * (20_000 + Math.random() * 30_000);
      options.push(() =>
        store.setIncidentEta(moving.id, (moving.etaAt as number) + shift),
      );
    }

    const settled = background.find(
      (i) =>
        i.status === "on_scene" &&
        i.arrivedAt &&
        now - i.arrivedAt > 8 * 60_000 &&
        i.priority !== "P1",
    );
    if (settled) {
      options.push(() =>
        store.resolveIncident(
          settled.id,
          "Situation controlled on scene. No further police action required at this time.",
          SECOND_OPERATOR,
        ),
      );
    }

    const resting = store.units.find((u) => u.status === "unavailable");
    if (resting)
      options.push(() =>
        store.setUnitStatus(resting.id, "available", {
          id: resting.officerId,
          name: "Unit crew",
          role: "officer",
        }),
      );

    if (store.incidents.filter(isOpen).length < MAX_ACTIVE) {
      const add = () => {
        const template =
          INCIDENT_TEMPLATES[mem.templateIndex % INCIDENT_TEMPLATES.length];
        mem.templateIndex += 1;
        const area = AREAS[template.area as AreaKey];
        const position = offsetPoint(area, 0.0018, `${template.cat}-${now}`);
        store.createIncident(
          {
            source: template.source,
            categoryId: template.cat,
            priority: template.pr,
            title: template.title,
            description: template.desc,
            location: {
              ...position,
              area: area.name,
              address: `Near ${area.landmarks[0]}, ${area.name}`,
              landmark: area.landmarks[0],
              districtId: "d-ahd",
              stationId: area.stationId,
              source:
                template.source === "sos"
                  ? "device_emergency"
                  : template.source === "call"
                    ? "operator_entered"
                    : "citizen_entered",
            },
            reporterName: template.reporter,
            peopleInDanger: template.danger,
          },
          { id: "external", name: template.reporter, role: "citizen" },
        );
      };
      options.push(add, add);
    }

    if (options.length) options[Math.floor(Math.random() * options.length)]();
  }

  return {
    /** Call when the simulation starts or resumes. */
    start(now = Date.now()) {
      mem.startedAt = now;
      mem.nextAmbientAt = now + 14_000;
    },
    tick(now = Date.now()) {
      if (host.isOffline?.()) return;
      progressAutoIncidents(now);
      replyToCitizens(now);
      evaluateEscalationPolicy(now);
      if (now >= mem.nextAmbientAt) {
        ambientEvent(now);
        mem.nextAmbientAt = now + between(AMBIENT_EVERY);
      }
    },
  };
}
