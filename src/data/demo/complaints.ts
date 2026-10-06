import { deployment } from "@/config/deployment";
import type {
  Complaint,
  ComplaintKind,
  ComplaintStatus,
  EvidenceType,
  Journey,
  Timestamp,
} from "@/types";
import { AREAS, type AreaKey } from "./geo";
import { incidentId } from "./incidents";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const complaintId = (n: number) =>
  `CMP-${deployment.idPrefix.split("-")[1]}-2026-0${n}`;

interface Step {
  /** Hours after submission. */
  afterH: number;
  status: ComplaintStatus;
  note: string;
  by: string;
}

interface Spec {
  n: number;
  kind: ComplaintKind;
  citizenId?: string;
  anonymous?: boolean;
  cat: string;
  title: string;
  desc: string;
  area: AreaKey;
  dept: string;
  /** Days since submission. */
  agoD: number;
  steps: Step[];
  authority?: string;
  contact: Complaint["contactPreference"];
  docs?: { name: string; kind: EvidenceType; size: number }[];
  linkedSeq?: number;
}

const SPECS: Spec[] = [
  {
    n: 1872,
    kind: "report",
    citizenId: "cit-aarav",
    cat: "public_nuisance",
    area: "navrangpura",
    dept: "Station desk",
    agoD: 2.2,
    contact: "chat",
    title: "Late-night loudspeakers near Stadium Circle",
    desc: "Loudspeakers from a temporary stall run past midnight on most days, opposite the residential block.",
    authority: "ASI Kiran Chauhan",
    steps: [
      {
        afterH: 0,
        status: "submitted",
        note: "Complaint submitted from the app.",
        by: "Aarav Shah",
      },
      {
        afterH: 1.5,
        status: "received",
        note: "Received at Navrangpura Police Station.",
        by: "Station desk",
      },
      {
        afterH: 9,
        status: "under_review",
        note: "Reviewed by the duty officer.",
        by: "Station desk",
      },
      {
        afterH: 22,
        status: "assigned",
        note: "Assigned to a beat officer for a site visit.",
        by: "Inspector Neha Desai",
      },
      {
        afterH: 31,
        status: "in_progress",
        note: "Site visited at 22:40. Stall owner informed of the permitted hours. A follow-up check is planned for the weekend.",
        by: "ASI Kiran Chauhan",
      },
    ],
    docs: [{ name: "Audio recording 23-45.m4a", kind: "audio", size: 940_000 }],
  },
  {
    n: 1841,
    kind: "report",
    citizenId: "cit-aarav",
    cat: "online_fraud",
    area: "navrangpura",
    dept: "Cybercrime desk",
    agoD: 5.5,
    contact: "call",
    title: "Refund link took money from my account",
    desc: "Clicked a refund link sent after an online order and ₹ 6,200 was debited.",
    authority: "Cybercrime desk",
    steps: [
      {
        afterH: 0,
        status: "submitted",
        note: "Complaint submitted from the app.",
        by: "Aarav Shah",
      },
      {
        afterH: 2,
        status: "received",
        note: "Received and referred to the cybercrime desk.",
        by: "Station desk",
      },
      {
        afterH: 20,
        status: "under_review",
        note: "Under review by the cybercrime desk.",
        by: "Cybercrime desk",
      },
      {
        afterH: 70,
        status: "info_required",
        note: "Please add the transaction reference and the bank's message so the receiving account can be traced.",
        by: "Cybercrime desk",
      },
    ],
    docs: [{ name: "Order confirmation.pdf", kind: "document", size: 120_000 }],
  },
  {
    n: 1790,
    kind: "report",
    citizenId: "cit-aarav",
    cat: "vandalism",
    area: "usmanpura",
    dept: "Station desk",
    agoD: 16,
    contact: "chat",
    title: "Society wall defaced and street lights broken",
    desc: "Compound wall defaced overnight and two street lights broken outside the society gate.",
    authority: "HC Sanjay Rabari",
    steps: [
      {
        afterH: 0,
        status: "submitted",
        note: "Complaint submitted from the app.",
        by: "Aarav Shah",
      },
      {
        afterH: 1,
        status: "received",
        note: "Received at Naranpura Police Station.",
        by: "Station desk",
      },
      {
        afterH: 5,
        status: "assigned",
        note: "Assigned for a site visit.",
        by: "Inspector Parth Zala",
      },
      {
        afterH: 28,
        status: "in_progress",
        note: "Photographs taken. Night patrol added to the lane for one week.",
        by: "HC Sanjay Rabari",
      },
      {
        afterH: 190,
        status: "resolved",
        note: "No further damage reported after the patrol week. Civic body has replaced the lights.",
        by: "HC Sanjay Rabari",
      },
    ],
    docs: [
      { name: "Wall photo 1.jpg", kind: "photo", size: 2_300_000 },
      { name: "Wall photo 2.jpg", kind: "photo", size: 2_150_000 },
    ],
  },
  {
    n: 1866,
    kind: "report",
    citizenId: "cit-kavya",
    cat: "stalking",
    area: "cgroad",
    dept: "Women's help desk",
    agoD: 3.1,
    contact: "call",
    title: "Being followed on my way home from work",
    desc: "The same person on a motorcycle has followed me from my office towards Panchvati Circle on several evenings.",
    authority: "PSI Tanvi Shah",
    steps: [
      {
        afterH: 0,
        status: "submitted",
        note: "Complaint submitted from the app.",
        by: "Kavya Patel",
      },
      {
        afterH: 0.5,
        status: "received",
        note: "Received by the women's help desk.",
        by: "Women's help desk",
      },
      {
        afterH: 3,
        status: "under_review",
        note: "An officer will call you on the number you chose.",
        by: "Women's help desk",
      },
      {
        afterH: 8,
        status: "assigned",
        note: "Assigned to PSI Tanvi Shah. Evening patrol added on your route.",
        by: "Inspector Neha Desai",
      },
    ],
    docs: [{ name: "Motorcycle photo.jpg", kind: "photo", size: 1_900_000 }],
  },
  {
    n: 1802,
    kind: "report",
    citizenId: "cit-kavya",
    cat: "identity_misuse",
    area: "navrangpura",
    dept: "Cybercrime desk",
    agoD: 12,
    contact: "chat",
    title: "Fake profile using my photographs",
    desc: "A social media profile is using my name and photographs to message my contacts.",
    authority: "Cybercrime desk",
    steps: [
      {
        afterH: 0,
        status: "submitted",
        note: "Complaint submitted from the app.",
        by: "Kavya Patel",
      },
      {
        afterH: 3,
        status: "received",
        note: "Received and referred to the cybercrime desk.",
        by: "Station desk",
      },
      {
        afterH: 30,
        status: "in_progress",
        note: "Takedown request sent to the platform.",
        by: "Cybercrime desk",
      },
      {
        afterH: 96,
        status: "resolved",
        note: "The platform has removed the profile.",
        by: "Cybercrime desk",
      },
      {
        afterH: 200,
        status: "closed",
        note: "Closed after your confirmation.",
        by: "Cybercrime desk",
      },
    ],
  },
  {
    n: 1869,
    kind: "report",
    cat: "reckless_driving",
    area: "sindhubhavan",
    dept: "Traffic branch",
    agoD: 2.8,
    contact: "none",
    title: "Night-time racing on Sindhu Bhavan Road",
    desc: "Cars racing between the food street and the highway junction after 23:00 on weekends.",
    authority: "Traffic branch",
    steps: [
      {
        afterH: 0,
        status: "submitted",
        note: "Complaint submitted from the app.",
        by: "Citizen",
      },
      {
        afterH: 4,
        status: "received",
        note: "Received by the traffic branch.",
        by: "Traffic branch",
      },
      {
        afterH: 26,
        status: "under_review",
        note: "Checking weekend deployment for the stretch.",
        by: "Traffic branch",
      },
    ],
  },
  {
    n: 1874,
    kind: "confidential_tip",
    anonymous: true,
    cat: "drug_dealing",
    area: "kankaria",
    dept: "Information desk",
    agoD: 0.9,
    contact: "none",
    linkedSeq: 28482,
    title: "Information about evening hand-offs near the lakefront",
    desc: "Confidential information received. The source asked not to be contacted.",
    steps: [
      {
        afterH: 0,
        status: "submitted",
        note: "Confidential tip received. No identity stored.",
        by: "Confidential source",
      },
      {
        afterH: 2,
        status: "received",
        note: "Passed to the information desk.",
        by: "System",
      },
    ],
  },
  {
    n: 1860,
    kind: "report",
    cat: "public_nuisance",
    area: "maninagar",
    dept: "Station desk",
    agoD: 4.4,
    contact: "chat",
    title: "Vehicles parked across a school gate",
    desc: "Vans and autos block the school gate at pickup time, forcing children onto the road.",
    authority: "ASI Alpesh Bharwad",
    steps: [
      {
        afterH: 0,
        status: "submitted",
        note: "Complaint submitted from the app.",
        by: "Citizen",
      },
      {
        afterH: 3,
        status: "received",
        note: "Received at Maninagar Police Station.",
        by: "Station desk",
      },
      {
        afterH: 20,
        status: "assigned",
        note: "Assigned for a pickup-time check.",
        by: "Inspector Shabnam Qureshi",
      },
      {
        afterH: 44,
        status: "in_progress",
        note: "Officer present at pickup time this week. School asked to mark a waiting bay.",
        by: "ASI Alpesh Bharwad",
      },
    ],
  },
  {
    n: 1855,
    kind: "report",
    cat: "financial_scam",
    area: "satellite",
    dept: "Cybercrime desk",
    agoD: 6.3,
    contact: "call",
    title: "Investment group asked for a 'release fee'",
    desc: "A messaging group promised returns and then asked for a fee to release the money.",
    authority: "Cybercrime desk",
    steps: [
      {
        afterH: 0,
        status: "submitted",
        note: "Complaint submitted from the app.",
        by: "Citizen",
      },
      {
        afterH: 5,
        status: "received",
        note: "Received and referred to the cybercrime desk.",
        by: "Station desk",
      },
      {
        afterH: 50,
        status: "under_review",
        note: "Group details and account numbers under review.",
        by: "Cybercrime desk",
      },
    ],
  },
];

export function seedComplaints(now: Timestamp): Complaint[] {
  return SPECS.map((s) => {
    const submittedAt = now - s.agoD * DAY;
    const area = AREAS[s.area];
    const updates = s.steps.map((step, i) => ({
      id: `${complaintId(s.n)}-u${i + 1}`,
      at: Math.min(
        submittedAt + step.afterH * HOUR,
        now - (s.steps.length - i) * MIN,
      ),
      status: step.status,
      note: step.note,
      by: step.by,
    }));
    return {
      id: complaintId(s.n),
      kind: s.kind,
      citizenId: s.citizenId,
      anonymous: Boolean(s.anonymous),
      categoryId: s.cat,
      title: s.title,
      description: s.desc,
      stationId: area.stationId,
      department: s.dept,
      location: {
        address: `${area.landmarks[0]}, ${area.name}`,
        area: area.name,
      },
      occurredAt: submittedAt - 6 * HOUR,
      submittedAt,
      status: s.steps[s.steps.length - 1].status,
      assignedAuthority: s.authority,
      contactPreference: s.contact,
      updates,
      documents: (s.docs ?? []).map((d, i) => ({
        id: `${complaintId(s.n)}-d${i + 1}`,
        name: d.name,
        kind: d.kind,
        sizeBytes: d.size,
        addedAt: submittedAt + i * MIN,
      })),
      linkedIncidentId: s.linkedSeq ? incidentId(s.linkedSeq) : undefined,
    } satisfies Complaint;
  }).sort((a, b) => b.submittedAt - a.submittedAt);
}

export function seedJourneys(now: Timestamp): Journey[] {
  const mk = (
    id: string,
    agoD: number,
    from: AreaKey,
    to: AreaKey,
    durMin: number,
  ): Journey => {
    const startedAt = now - agoD * DAY;
    return {
      id,
      citizenId: "cit-aarav",
      from: {
        label: AREAS[from].name,
        lat: AREAS[from].lat,
        lng: AREAS[from].lng,
      },
      destination: {
        label: AREAS[to].name,
        lat: AREAS[to].lat,
        lng: AREAS[to].lng,
      },
      startedAt,
      expectedArrivalAt: startedAt + (durMin + 4) * MIN,
      checkIntervalMin: 10,
      lastCheckInAt: startedAt + durMin * MIN,
      contactIds: ["ec-1"],
      status: "completed",
      endedAt: startedAt + durMin * MIN,
    };
  };
  return [
    mk("jr-102", 1.1, "sghighway", "navrangpura", 26),
    mk("jr-101", 4.2, "navrangpura", "maninagar", 34),
  ];
}
