import { deployment } from "@/config/deployment";
import { etaMinutesBetween, offsetPoint, roadKm } from "@/lib/geo";
import { shiftAt } from "@/lib/format";
import { fakeDigest } from "@/lib/prng";
import type {
  ActorRef,
  AiTriage,
  Assignment,
  Evidence,
  EvidenceAccess,
  EvidenceClassification,
  EvidenceIntegrity,
  EvidenceType,
  Incident,
  IncidentPriority,
  IncidentSource,
  IncidentStatus,
  LatLng,
  Message,
  OfficerStage,
  RoleKey,
  TimelineEvent,
  Timestamp,
  Unit,
  UnitStatus,
  VehicleType,
} from "@/types";
import { AREAS, type AreaKey } from "./geo";
import { OFFICERS } from "./people";

export const OPERATOR: ActorRef = {
  id: "stf-meera",
  name: "Meera Joshi",
  role: "operator",
};
const SEC = 1000;
const MIN = 60 * SEC;

export const incidentId = (seq: number) => `${deployment.idPrefix}-2026-${seq}`;

/* ───────────────────────── Units ───────────────────────── */

interface UnitSpec {
  n: string;
  officerId: string;
  vehicle: VehicleType;
  plate: string;
  stationId: string;
  status: UnitStatus;
  pos: LatLng;
  crew: number;
  incidentSeq?: number;
}

const UNIT_SPECS: UnitSpec[] = [
  {
    n: "01",
    officerId: "of-kiran",
    vehicle: "PCR van",
    plate: "GJ-01-DM-4101",
    stationId: "st-nav",
    status: "available",
    pos: { lat: 23.0318, lng: 72.5648 },
    crew: 3,
  },
  {
    n: "03",
    officerId: "of-yusuf",
    vehicle: "Motorcycle",
    plate: "GJ-01-DM-4103",
    stationId: "st-ell",
    status: "unavailable",
    pos: { lat: 23.0238, lng: 72.5716 },
    crew: 1,
  },
  {
    n: "04",
    officerId: "of-imran",
    vehicle: "Traffic interceptor",
    plate: "GJ-01-DM-4104",
    stationId: "st-bod",
    status: "en_route",
    pos: { lat: 23.0468, lng: 72.5152 },
    crew: 2,
    incidentSeq: 28490,
  },
  {
    n: "06",
    officerId: "of-ritu",
    vehicle: "Patrol SUV",
    plate: "GJ-01-DM-4106",
    stationId: "st-sat",
    status: "available",
    pos: { lat: 23.0252, lng: 72.5198 },
    crew: 3,
  },
  {
    n: "08",
    officerId: "of-nilesh",
    vehicle: "Motorcycle",
    plate: "GJ-01-DM-4108",
    stationId: "st-vas",
    status: "available",
    pos: { lat: 23.0452, lng: 72.5358 },
    crew: 1,
  },
  {
    n: "09",
    officerId: "of-sneha",
    vehicle: "Patrol SUV",
    plate: "GJ-01-DM-4109",
    stationId: "st-vas",
    status: "on_scene",
    pos: { lat: 23.0384, lng: 72.5294 },
    crew: 3,
    incidentSeq: 28488,
  },
  {
    n: "11",
    officerId: "of-sanjay",
    vehicle: "PCR van",
    plate: "GJ-01-DM-4111",
    stationId: "st-nar",
    status: "available",
    pos: { lat: 23.0655, lng: 72.5492 },
    crew: 3,
  },
  {
    n: "12",
    officerId: "of-bhavesh",
    vehicle: "Patrol SUV",
    plate: "GJ-01-DM-4112",
    stationId: "st-nar",
    status: "en_route",
    pos: { lat: 23.0622, lng: 72.5498 },
    crew: 2,
    incidentSeq: 28487,
  },
  {
    n: "14",
    officerId: "of-harsh",
    vehicle: "Traffic interceptor",
    plate: "GJ-01-DM-4114",
    stationId: "st-bod",
    status: "en_route",
    pos: { lat: 23.0455, lng: 72.5075 },
    crew: 2,
    incidentSeq: 28480,
  },
  {
    n: "15",
    officerId: "of-tanvi",
    vehicle: "Women's help unit",
    plate: "GJ-01-DM-4115",
    stationId: "st-nav",
    status: "on_scene",
    pos: { lat: 23.0376, lng: 72.5286 },
    crew: 3,
    incidentSeq: 28488,
  },
  {
    n: "17",
    officerId: "stf-arjun",
    vehicle: "Patrol SUV",
    plate: "GJ-01-DM-4117",
    stationId: "st-nav",
    status: "assigned",
    pos: { lat: 23.0459, lng: 72.5563 },
    crew: 2,
    incidentSeq: 28491,
  },
  {
    n: "19",
    officerId: "of-mahesh",
    vehicle: "Motorcycle",
    plate: "GJ-01-DM-4119",
    stationId: "st-bod",
    status: "assigned",
    pos: { lat: 23.0431, lng: 72.5098 },
    crew: 1,
    incidentSeq: 28483,
  },
  {
    n: "21",
    officerId: "of-jignesh",
    vehicle: "PCR van",
    plate: "GJ-01-DM-4121",
    stationId: "st-ell",
    status: "on_scene",
    pos: { lat: 23.0222, lng: 72.5726 },
    crew: 3,
    incidentSeq: 28484,
  },
  {
    n: "22",
    officerId: "of-dinesh",
    vehicle: "PCR van",
    plate: "GJ-01-DM-4122",
    stationId: "st-man",
    status: "off_duty",
    pos: { lat: 22.9985, lng: 72.6048 },
    crew: 3,
  },
  {
    n: "23",
    officerId: "of-pooja",
    vehicle: "Patrol SUV",
    plate: "GJ-01-DM-4123",
    stationId: "st-sab",
    status: "on_scene",
    pos: { lat: 23.1086, lng: 72.5846 },
    crew: 3,
    incidentSeq: 28479,
  },
  {
    n: "25",
    officerId: "of-alpesh",
    vehicle: "PCR van",
    plate: "GJ-01-DM-4125",
    stationId: "st-man",
    status: "available",
    pos: { lat: 23.0031, lng: 72.6062 },
    crew: 3,
  },
];

export const unitIdOf = (n: string) => `u-${n}`;
export const callSignOf = (n: string) => `${deployment.idPrefix}-${n}`;

export function seedUnits(now: Timestamp): Unit[] {
  return UNIT_SPECS.map((u, index) => ({
    id: unitIdOf(u.n),
    callSign: callSignOf(u.n),
    officerId: u.officerId,
    crew: u.crew,
    vehicle: u.vehicle,
    vehicleNo: u.plate,
    stationId: u.stationId,
    status: u.status,
    position: u.pos,
    positionAt: now - 20 * SEC,
    currentIncidentId: u.incidentSeq ? incidentId(u.incidentSeq) : null,
    shiftEndsAt: shiftAt(now).endsAt + (index % 4 === 3 ? 4 * 60 * MIN : 0) - (index % 5 === 2 ? 60 * MIN : 0),
    routeFrom: u.status === "en_route" ? u.pos : undefined,
  }));
}

/* ───────────────────────── Incidents ───────────────────────── */

interface Spec {
  seq: number;
  cat: string;
  pr: IncidentPriority;
  status: IncidentStatus;
  area: AreaKey;
  landmark?: number;
  /** Seconds since the incident was created. */
  ago: number;
  source: IncidentSource;
  title: string;
  desc: string;
  reporter: string;
  phone?: string;
  citizenId?: string;
  anonymous?: boolean;
  danger?: boolean;
  units?: string[];
  pending?: boolean;
  etaInSec?: number;
  resolvedAfterMin?: number;
  resolution?: string;
  cancelReason?: string;
  ai?: Omit<AiTriage, "confirmedBy" | "confirmedAt">;
  aiConfirmed?: boolean;
  escalation?: 0 | 1 | 2 | 3;
  backup?: boolean;
  notes?: string[];
  silent?: boolean;
  reportPending?: boolean;
}

const SPECS: Spec[] = [
  {
    seq: 28491,
    cat: "woman_safety",
    pr: "P1",
    status: "assigned",
    area: "navrangpura",
    landmark: 0,
    ago: 42,
    source: "sos",
    title: "Woman safety / Harassment",
    reporter: "Kavya P.",
    phone: "+91 97XXX XX806",
    citizenId: "cit-kavya",
    danger: true,
    desc: "Citizen reports being followed by two individuals near Navrangpura. Citizen states she is currently inside a shop. No weapon reported.",
    units: ["17"],
    pending: true,
    aiConfirmed: true,
    ai: {
      suggestedPriority: "P1",
      suggestedCategoryId: "woman_safety",
      reason:
        "SOS raised with an active pursuit reported; caller is sheltering in place.",
      summary:
        "Citizen reports being followed by two individuals near Navrangpura. Citizen states she is currently inside a shop. No weapon reported.",
      missingInfo: [
        "Description of the two individuals",
        "Whether the citizen is alone in the shop",
      ],
      translationOf: {
        language: "Gujarati",
        original: "બે જણ મારો પીછો કરી રહ્યા છે.",
      },
    },
    notes: [
      "Caller is inside a stationery shop near Swastik Cross Road. Two individuals waiting outside. No weapon seen.",
    ],
  },
  {
    seq: 28490,
    cat: "road_accident",
    pr: "P2",
    status: "en_route",
    area: "sghighway",
    landmark: 0,
    ago: 133,
    source: "call",
    title: "Road accident",
    reporter: "Passer-by (caller)",
    phone: "+91 90XXX XX551",
    danger: true,
    desc: "Two-vehicle collision on the northbound service road. One rider reported injured and conscious. Left lane blocked.",
    units: ["04"],
    etaInSec: 205,
    aiConfirmed: true,
    ai: {
      suggestedPriority: "P2",
      suggestedCategoryId: "road_accident",
      reason: "Injury reported with a live traffic obstruction.",
      summary:
        "Collision between a car and a two-wheeler near Pakwan Junction. One injured, conscious. Ambulance needed. One lane blocked.",
      missingInfo: ["Number of vehicles still on the carriageway"],
    },
    notes: [
      "Ambulance requested through the emergency medical desk (demo adapter).",
    ],
  },
  {
    seq: 28489,
    cat: "public_disturbance",
    pr: "P3",
    status: "acknowledged",
    area: "maninagar",
    landmark: 1,
    ago: 291,
    source: "report",
    title: "Public disturbance",
    reporter: "Shopkeeper (report)",
    phone: "+91 88XXX XX203",
    desc: "Loud argument between two groups outside a row of shops. About fifteen people gathered. No injuries reported so far.",
    escalation: 1,
    ai: {
      suggestedPriority: "P3",
      suggestedCategoryId: "public_disturbance",
      reason: "Crowd forming, no violence or injury reported yet.",
      summary:
        "Verbal dispute between two groups at Jawahar Chowk with a growing crowd. No weapons or injuries reported.",
      missingInfo: ["Whether the dispute is still in progress"],
    },
  },
  {
    seq: 28488,
    citizenId: "cit-guardian-28488",
    cat: "missing_person",
    pr: "P1",
    status: "on_scene",
    area: "vastrapur",
    landmark: 0,
    ago: 680,
    source: "call",
    title: "Missing child",
    reporter: "Guardian (caller)",
    phone: "+91 93XXX XX147",
    danger: true,
    desc: "Six-year-old child separated from guardian near the lake garden about fifteen minutes before the call. Wearing a yellow T-shirt and blue shorts.",
    units: ["09", "15"],
    backup: true,
    escalation: 2,
    aiConfirmed: true,
    ai: {
      suggestedPriority: "P1",
      suggestedCategoryId: "missing_person",
      reason:
        "Missing minor; time since last seen is short and the search area is bounded.",
      summary:
        "Child, 6, last seen near Lake Garden Gate 2. Yellow T-shirt, blue shorts. Guardian is waiting at the gate with a recent photograph.",
      missingInfo: ["Whether the child knows a contact number"],
    },
    notes: [
      "Garden security asked to hold all exits.",
      "CCTV pull requested from the gate camera.",
    ],
  },
  {
    seq: 28487,
    citizenId: "cit-resident-28487",
    cat: "domestic_violence",
    pr: "P1",
    status: "en_route",
    area: "naranpura",
    landmark: 0,
    ago: 400,
    source: "silent_sos",
    title: "Domestic violence",
    reporter: "Resident (silent SOS)",
    danger: true,
    silent: true,
    desc: "Silent SOS raised from a residence. Chat only: caller says she cannot speak and is locked in a room. One other adult present.",
    units: ["12"],
    etaInSec: 95,
    aiConfirmed: true,
    ai: {
      suggestedPriority: "P1",
      suggestedCategoryId: "domestic_violence",
      reason: "Silent SOS with the caller unable to speak safely.",
      summary:
        "Caller is locked in a bedroom and communicating by chat only. Do not call back. Approach without sirens was requested.",
      missingInfo: ["Flat number", "Whether children are in the home"],
    },
    notes: ["Do not place a voice call to the citizen. Chat only."],
  },
  {
    seq: 28486,
    cat: "suspicious_activity",
    pr: "P3",
    status: "new",
    area: "paldi",
    landmark: 0,
    ago: 95,
    source: "report",
    title: "Suspicious activity",
    reporter: "Aditi R.",
    phone: "+91 91XXX XX660",
    desc: "A parked van with its engine running outside the bus terminus for over an hour. Two occupants watching the entrance.",
    ai: {
      suggestedPriority: "P3",
      suggestedCategoryId: "suspicious_activity",
      reason: "Observation only; no threat or offence described.",
      summary:
        "Idling van with two occupants near the bus terminus for roughly an hour.",
      missingInfo: ["Vehicle colour or number"],
    },
  },
  {
    seq: 28485,
    cat: "online_fraud",
    pr: "P4",
    status: "acknowledged",
    area: "satellite",
    ago: 1080,
    source: "report",
    title: "Cyber fraud",
    reporter: "Nirav K.",
    phone: "+91 98XXX XX915",
    desc: "Received a call claiming to be from a courier company and paid a 'customs fee' through a payment link. Amount lost is about ₹ 18,400.",
    ai: {
      suggestedPriority: "P4",
      suggestedCategoryId: "online_fraud",
      reason: "Financial loss with no immediate physical risk.",
      summary:
        "Courier-impersonation payment fraud. Transfer made about three hours ago through a payment link.",
      missingInfo: ["Transaction reference", "Receiving account or handle"],
    },
    notes: ["Routing to the cybercrime desk (demo adapter)."],
  },
  {
    seq: 28484,
    cat: "senior_citizen",
    pr: "P2",
    status: "on_scene",
    area: "ellisbridge",
    landmark: 0,
    ago: 870,
    source: "call",
    title: "Senior citizen assistance",
    reporter: "Neighbour (caller)",
    phone: "+91 79XXX XX410",
    danger: true,
    desc: "Elderly resident living alone has not answered the door since morning. Neighbour can hear a television but no response.",
    units: ["21"],
    aiConfirmed: true,
    ai: {
      suggestedPriority: "P2",
      suggestedCategoryId: "senior_citizen",
      reason:
        "Welfare concern for a senior living alone; possible medical need.",
      summary:
        "Welfare check requested for a resident in their eighties. Neighbour holds a spare key.",
      missingInfo: [],
    },
  },
  {
    seq: 28483,
    cat: "traffic_hazard",
    pr: "P3",
    status: "assigned",
    area: "thaltej",
    landmark: 0,
    ago: 490,
    source: "report",
    title: "Traffic hazard",
    reporter: "Commuter (report)",
    desc: "Oil spill across two lanes just before the underpass. Two-wheelers are skidding.",
    units: ["19"],
    aiConfirmed: true,
    ai: {
      suggestedPriority: "P3",
      suggestedCategoryId: "traffic_hazard",
      reason: "Hazard on a live carriageway, no collision yet.",
      summary:
        "Oil on the road surface ahead of Thaltej Underpass affecting two lanes.",
      missingInfo: [],
    },
  },
  {
    seq: 28482,
    cat: "drug_dealing",
    pr: "P4",
    status: "new",
    area: "kankaria",
    landmark: 0,
    ago: 1320,
    source: "tip",
    anonymous: true,
    title: "Drug-related confidential tip",
    reporter: "Confidential source",
    desc: "Tip describes repeated late-evening hand-offs near a lakefront gate over the past week. Source asked not to be contacted.",
    ai: {
      suggestedPriority: "P4",
      suggestedCategoryId: "drug_dealing",
      reason: "Information report with no immediate danger described.",
      summary:
        "Confidential information about suspected hand-offs near Lakefront Gate 3 on several evenings.",
      missingInfo: ["Approximate time window"],
    },
  },
  {
    seq: 28481,
    cat: "harassment",
    pr: "P2",
    status: "new",
    area: "lawgarden",
    landmark: 0,
    ago: 58,
    source: "report",
    title: "Harassment",
    reporter: "Sana M.",
    phone: "+91 96XXX XX338",
    danger: true,
    desc: "A group of three is passing comments and blocking the path of women leaving the night market lane. Reporter is standing near a stall.",
    ai: {
      suggestedPriority: "P2",
      suggestedCategoryId: "harassment",
      reason: "Reported active harassment.",
      summary:
        "Three individuals harassing passers-by at Night Market Lane. Reporter is nearby and can identify them.",
      missingInfo: ["Whether the reporter feels safe where she is"],
    },
  },
  {
    seq: 28480,
    cat: "drunk_driving",
    pr: "P3",
    status: "en_route",
    area: "sindhubhavan",
    landmark: 1,
    ago: 570,
    source: "call",
    title: "Suspected drunk driving",
    reporter: "Restaurant staff (caller)",
    desc: "Driver appeared heavily intoxicated before leaving the food street in a white hatchback heading towards the highway.",
    units: ["14"],
    etaInSec: 150,
    aiConfirmed: true,
    ai: {
      suggestedPriority: "P3",
      suggestedCategoryId: "drunk_driving",
      reason: "Risk to road users; vehicle is mobile.",
      summary:
        "White hatchback leaving Food Street towards SG Highway, driver reported as intoxicated.",
      missingInfo: ["Registration number"],
    },
  },
  {
    seq: 28479,
    cat: "fire",
    pr: "P2",
    status: "on_scene",
    area: "chandkheda",
    landmark: 0,
    ago: 1005,
    source: "call",
    title: "Fire — police assistance",
    reporter: "Resident (caller)",
    danger: true,
    desc: "Smoke from a closed shop on the ground floor of a residential block. Fire service informed. Police needed for crowd and traffic control.",
    units: ["23"],
    aiConfirmed: true,
    ai: {
      suggestedPriority: "P2",
      suggestedCategoryId: "fire",
      reason:
        "Fire service is leading; police support is needed to keep the approach clear.",
      summary:
        "Shop fire under a residential block on New CG Road. Residents evacuating by the rear stairs.",
      missingInfo: [],
    },
    notes: [
      "Fire control informed (demo adapter). Two tenders reported moving.",
    ],
  },
  {
    seq: 28467,
    cat: "financial_scam",
    pr: "P4",
    status: "acknowledged",
    area: "vejalpur",
    ago: 2100,
    source: "report",
    title: "Financial scam",
    reporter: "Hemal S.",
    phone: "+91 99XXX XX072",
    desc: "Paid a 'customs fee' after a call from someone claiming to be a courier company. Same payment link was shared with two neighbours.",
    ai: {
      suggestedPriority: "P4",
      suggestedCategoryId: "financial_scam",
      reason: "Matches the pattern of an existing report.",
      summary:
        "Courier-impersonation payment fraud. Details closely match an earlier report from Satellite.",
      missingInfo: ["Transaction reference"],
      duplicateOfId: incidentId(28485),
    },
  },
  {
    seq: 28478,
    cat: "fighting",
    pr: "P3",
    status: "resolved",
    area: "sabarmati",
    landmark: 0,
    ago: 2880,
    source: "call",
    title: "Fighting",
    reporter: "Tea stall owner (caller)",
    units: ["23"],
    resolvedAfterMin: 24,
    reportPending: true,
    desc: "Scuffle between four people near the railway colony gate.",
    resolution:
      "Both parties separated and counselled. No injuries. No complaint requested by either side.",
  },
  {
    seq: 28477,
    cat: "medical",
    pr: "P2",
    status: "resolved",
    area: "memnagar",
    landmark: 1,
    ago: 4200,
    source: "sos",
    title: "Medical emergency",
    reporter: "Jatin B.",
    phone: "+91 97XXX XX481",
    units: ["08"],
    resolvedAfterMin: 19,
    desc: "Person collapsed at a bus stop. Bystander raised an SOS.",
    resolution:
      "Unit kept the approach clear and assisted the ambulance crew. Patient moved to hospital conscious.",
  },
  {
    seq: 28476,
    cat: "vandalism",
    pr: "P4",
    status: "resolved",
    area: "usmanpura",
    landmark: 0,
    ago: 6000,
    source: "report",
    title: "Vandalism",
    reporter: "Aarav S.",
    phone: "+91 98XXX XX412",
    citizenId: "cit-aarav",
    units: ["11"],
    resolvedAfterMin: 52,
    desc: "Compound wall of a housing society defaced overnight and two street lights broken.",
    resolution:
      "Site visited and photographed. Society secretary advised on filing a formal complaint. Patrol frequency raised for the week.",
  },
  {
    seq: 28475,
    cat: "stalking",
    pr: "P2",
    status: "resolved",
    area: "cgroad",
    landmark: 0,
    ago: 7500,
    source: "sos",
    title: "Stalking",
    reporter: "Ishani V.",
    phone: "+91 95XXX XX209",
    units: ["15"],
    resolvedAfterMin: 31,
    reportPending: true,
    desc: "Citizen followed by a person on a motorcycle from her office to Panchvati Circle on three consecutive evenings.",
    resolution:
      "Citizen escorted home. Vehicle details recorded. Complaint process explained and started at her request.",
  },
  {
    seq: 28474,
    cat: "road_rage",
    pr: "P3",
    status: "resolved",
    area: "prahladnagar",
    landmark: 1,
    ago: 9000,
    source: "call",
    title: "Road rage",
    reporter: "Driver (caller)",
    units: ["06"],
    resolvedAfterMin: 17,
    desc: "Two drivers stopped in the carriageway arguing after a minor scrape.",
    resolution:
      "Vehicles moved to the side. Details exchanged. Traffic restored.",
  },
  {
    seq: 28473,
    cat: "blocked_road",
    pr: "P4",
    status: "resolved",
    area: "ghatlodia",
    landmark: 0,
    ago: 10800,
    source: "report",
    title: "Blocked road",
    reporter: "Resident (report)",
    units: ["11"],
    resolvedAfterMin: 38,
    desc: "Fallen tree branch blocking one lane after strong wind.",
    resolution: "Civic team cleared the branch. Road reopened.",
  },
  {
    seq: 28472,
    cat: "threat",
    pr: "P2",
    status: "resolved",
    area: "isanpur",
    landmark: 0,
    ago: 12600,
    source: "call",
    title: "Threat or intimidation",
    reporter: "Shop owner (caller)",
    units: ["25"],
    resolvedAfterMin: 44,
    desc: "Shop owner threatened by two people over a payment dispute.",
    resolution:
      "Both parties identified. Shop owner advised of the complaint process. Patrol check scheduled for the evening.",
  },
  {
    seq: 28471,
    cat: "child_safety",
    pr: "P1",
    status: "resolved",
    area: "jodhpur",
    landmark: 1,
    ago: 15000,
    source: "sos",
    title: "Child safety",
    reporter: "School staff (SOS)",
    units: ["06", "15"],
    resolvedAfterMin: 27,
    escalation: 1,
    backup: true,
    desc: "Unknown adult attempting to collect a child from a primary school without authorisation.",
    resolution:
      "Child safe with school staff. Adult identified as a relative without pickup authorisation. Guardian informed and attended.",
  },
  {
    seq: 28470,
    cat: "cyber_harassment",
    pr: "P4",
    status: "closed",
    area: "bodakdev",
    ago: 18000,
    source: "report",
    title: "Cyber harassment",
    reporter: "Tanisha G.",
    phone: "+91 94XXX XX517",
    resolvedAfterMin: 95,
    desc: "Repeated abusive messages from an unknown account after blocking.",
    resolution:
      "Handed to the cybercrime desk with screenshots. Citizen given reference and next steps.",
  },
  {
    seq: 28469,
    cat: "dangerous_crowd",
    pr: "P2",
    status: "resolved",
    area: "motera",
    landmark: 0,
    ago: 20400,
    source: "call",
    title: "Dangerous crowd",
    reporter: "Venue security (caller)",
    units: ["23", "01"],
    resolvedAfterMin: 63,
    backup: true,
    desc: "Crowd pressing at a stadium gate after an event, with barricades shifting.",
    resolution:
      "Second gate opened and the queue split. No injuries. Barricades reset.",
  },
  {
    seq: 28468,
    cat: "reckless_driving",
    pr: "P4",
    status: "cancelled",
    area: "gurukul",
    landmark: 0,
    ago: 21600,
    source: "sos",
    title: "Reckless driving",
    reporter: "Rahul T.",
    phone: "+91 90XXX XX884",
    desc: "SOS raised from a moving vehicle.",
    cancelReason: "Pressed by mistake — citizen confirmed they are safe.",
  },
  {
    seq: 28466,
    cat: "suspicious_object",
    pr: "P2",
    status: "resolved",
    area: "khokhra",
    landmark: 0,
    ago: 25200,
    source: "report",
    title: "Suspicious object",
    reporter: "Bus conductor (report)",
    units: ["25"],
    resolvedAfterMin: 41,
    desc: "Unattended bag left under a bench at a bus stop for over an hour.",
    resolution:
      "Area cordoned and bag checked. Contained school books. Owner traced and bag returned.",
  },
];

const STAGE_SEC = {
  ack: 6,
  triage: 14,
  assigned: 22,
  accepted: 44,
  enRoute: 58,
  arrived: 330,
} as const;
const STAGE_FRAC = {
  ack: 0.12,
  triage: 0.25,
  assigned: 0.4,
  accepted: 0.6,
  enRoute: 0.75,
  arrived: 0.85,
} as const;

const reached = (status: IncidentStatus) => {
  const order: IncidentStatus[] = [
    "new",
    "acknowledged",
    "assigned",
    "en_route",
    "on_scene",
    "resolved",
    "closed",
  ];
  const idx = order.indexOf(status);
  return (s: IncidentStatus) => idx >= order.indexOf(s);
};

function sourceTitle(source: IncidentSource): string {
  switch (source) {
    case "sos":
      return "SOS created";
    case "silent_sos":
      return "Silent SOS created";
    case "call":
      return "Emergency call logged";
    case "tip":
      return "Confidential tip received";
    case "journey":
      return "Journey safety alert";
    default:
      return "Report received";
  }
}

function buildIncident(spec: Spec, now: Timestamp): Incident {
  const t0 = now - spec.ago * SEC;
  const area = AREAS[spec.area];
  const landmark =
    spec.landmark !== undefined ? area.landmarks[spec.landmark] : undefined;
  const position = offsetPoint(area, 0.0016, String(spec.seq));
  const id = incidentId(spec.seq);
  const is = reached(spec.status);
  const cancelled = spec.status === "cancelled";
  const at = (stage: keyof typeof STAGE_SEC) =>
    t0 +
    Math.min(STAGE_SEC[stage], Math.floor(spec.ago * STAGE_FRAC[stage])) * SEC;

  const timeline: TimelineEvent[] = [];
  let n = 0;
  const push = (
    time: Timestamp,
    kind: TimelineEvent["kind"],
    title: string,
    detail: string | undefined,
    actor: string | undefined,
    citizenVisible: boolean,
  ) => {
    n += 1;
    timeline.push({
      id: `${id}-t${n}`,
      at: time,
      kind,
      title,
      detail,
      actor,
      citizenVisible,
    });
  };

  push(
    t0,
    "created",
    sourceTitle(spec.source),
    spec.source === "sos" || spec.source === "silent_sos"
      ? "Location attached from the citizen's device"
      : undefined,
    spec.reporter,
    true,
  );

  const acknowledgedAt =
    is("acknowledged") || cancelled ? at("ack") : undefined;
  if (acknowledgedAt)
    push(
      acknowledgedAt,
      "acknowledged",
      "Control room acknowledged",
      `${OPERATOR.name} opened the incident`,
      OPERATOR.name,
      true,
    );

  const triageConfirmed = spec.ai && (spec.aiConfirmed || is("assigned"));
  if (triageConfirmed && acknowledgedAt) {
    push(
      at("triage"),
      "triage",
      `Priority confirmed as ${spec.pr}`,
      "Operator reviewed the assisted triage suggestion",
      OPERATOR.name,
      false,
    );
  }

  const unitNs = spec.units ?? [];
  const assignedAt =
    unitNs.length && is("assigned") ? at("assigned") : undefined;
  const accepted = Boolean(assignedAt) && !spec.pending;
  const acceptedAt = accepted ? at("accepted") : undefined;
  const enRouteAt = unitNs.length && is("en_route") ? at("enRoute") : undefined;
  const arrivedAt = unitNs.length && is("on_scene") ? at("arrived") : undefined;
  const resolvedAt =
    is("resolved") && spec.resolvedAfterMin
      ? t0 + spec.resolvedAfterMin * MIN
      : undefined;

  const primaryCall = unitNs[0] ? callSignOf(unitNs[0]) : undefined;
  if (assignedAt && primaryCall)
    push(
      assignedAt,
      "assigned",
      `Unit ${primaryCall} assigned`,
      undefined,
      OPERATOR.name,
      true,
    );
  if (acceptedAt && primaryCall)
    push(
      acceptedAt,
      "accepted",
      "Officer accepted",
      primaryCall,
      primaryCall,
      false,
    );
  if (enRouteAt && primaryCall)
    push(
      enRouteAt,
      "en_route",
      "Unit en route",
      primaryCall,
      primaryCall,
      true,
    );
  if (spec.backup && enRouteAt)
    push(
      enRouteAt + 40 * SEC,
      "backup",
      "Backup requested",
      unitNs[1] ? `Unit ${callSignOf(unitNs[1])} added` : undefined,
      primaryCall,
      false,
    );
  if (arrivedAt && primaryCall)
    push(
      arrivedAt,
      "arrived",
      "Officer arrived",
      primaryCall,
      primaryCall,
      true,
    );
  if (spec.escalation && acknowledgedAt) {
    push(
      (arrivedAt ?? acknowledgedAt) + 30 * SEC,
      "escalated",
      spec.escalation >= 2
        ? "Escalated to district command"
        : "Escalated to station supervisor",
      undefined,
      "Escalation policy",
      false,
    );
  }
  if (resolvedAt)
    push(
      resolvedAt,
      "resolved",
      "Incident resolved",
      spec.resolution,
      primaryCall ?? OPERATOR.name,
      true,
    );
  if (spec.status === "closed" && resolvedAt)
    push(
      resolvedAt + 20 * MIN,
      "handoff",
      "Closed after supervisor review",
      undefined,
      "Inspector Neha Desai",
      true,
    );
  if (cancelled)
    push(
      t0 + 50 * SEC,
      "cancelled",
      "Cancelled by citizen",
      spec.cancelReason,
      spec.reporter,
      true,
    );
  timeline.sort((a, b) => a.at - b.at);

  const stage: OfficerStage = (() => {
    if (resolvedAt) return spec.reportPending ? "report_pending" : "completed";
    if (arrivedAt) return "on_scene";
    if (enRouteAt) return "en_route";
    return accepted ? "accepted" : "assigned";
  })();

  const assignments: Assignment[] = unitNs
    .filter(() => Boolean(assignedAt))
    .map((unitN, i) => {
      const unit = UNIT_SPECS.find((u) => u.n === unitN);
      const from = unit?.pos ?? area;
      return {
        id: `${id}-a${i + 1}`,
        incidentId: id,
        unitId: unitIdOf(unitN),
        assignedBy: OPERATOR,
        assignedAt: (assignedAt as Timestamp) + i * 45 * SEC,
        response: accepted ? "accepted" : "pending",
        respondedAt: acceptedAt,
        stage,
        role: i === 0 ? "primary" : "backup",
        distanceKm: Number(Math.max(0.6, roadKm(from, position)).toFixed(1)),
        etaMin: etaMinutesBetween(from, position),
      };
    });

  const resolvedDone = Boolean(resolvedAt);
  return {
    id,
    source: spec.source,
    categoryId: spec.cat,
    priority: spec.pr,
    status: spec.status,
    title: spec.title,
    description: spec.desc,
    location: {
      ...position,
      area: area.name,
      address: landmark
        ? `Near ${landmark}, ${area.name}, ${deployment.primaryCity}`
        : `${area.name}, ${deployment.primaryCity}`,
      landmark,
      districtId: "d-ahd",
      stationId: area.stationId,
      source:
        spec.source === "sos" || spec.source === "silent_sos"
          ? "device_emergency"
          : spec.source === "call"
            ? "operator_entered"
            : "citizen_entered",
      accuracyM:
        spec.source === "sos" || spec.source === "silent_sos" ? 18 : undefined,
    },
    citizenId: spec.citizenId,
    reporterName: spec.reporter,
    reporterPhoneMasked: spec.anonymous ? undefined : spec.phone,
    anonymous: Boolean(spec.anonymous),
    peopleInDanger: spec.danger,
    createdAt: t0,
    acknowledgedAt,
    assignedAt,
    enRouteAt,
    arrivedAt,
    resolvedAt,
    etaAt:
      spec.status === "en_route"
        ? now + (spec.etaInSec ?? 200) * SEC
        : undefined,
    operatorId: acknowledgedAt ? OPERATOR.id : undefined,
    operatorName: acknowledgedAt ? OPERATOR.name : undefined,
    assignments,
    backupRequested: Boolean(spec.backup),
    escalationLevel: spec.escalation ?? 0,
    timeline,
    notes: (spec.notes ?? []).map((text, i) => ({
      id: `${id}-n${i + 1}`,
      at: (acknowledgedAt ?? t0) + (i + 1) * 18 * SEC,
      author: OPERATOR,
      text,
    })),
    evidenceIds: [],
    ai: spec.ai
      ? {
          ...spec.ai,
          confirmedBy: triageConfirmed ? OPERATOR : undefined,
          confirmedAt: triageConfirmed ? at("triage") : undefined,
        }
      : undefined,
    handoff: resolvedDone
      ? {
          reportStatus: spec.reportPending
            ? "draft"
            : spec.status === "closed"
              ? "reviewed"
              : "submitted",
          reportDraft: spec.resolution,
          evidencePackageRef: `PKG-${spec.seq}`,
          reviewedBy:
            spec.status === "closed" ? "Inspector Neha Desai" : undefined,
        }
      : { reportStatus: "not_started" },
    resolution: spec.resolution,
    cancelReason: spec.cancelReason,
    auto: false,
    sync: "synced",
    silent: spec.silent,
  };
}

/* ───────────────────────── Messages ───────────────────────── */

interface MsgSpec {
  seq: number;
  afterSec: number;
  channel: Message["channel"];
  role: RoleKey | "system";
  name: string;
  text: string;
  translated?: Message["translated"];
}

const MESSAGE_SPECS: MsgSpec[] = [
  {
    seq: 28491,
    afterSec: 7,
    channel: "citizen",
    role: "citizen",
    name: "Kavya",
    text: "Two people are following me.",
    translated: {
      language: "Gujarati (original)",
      text: "બે જણ મારો પીછો કરી રહ્યા છે.",
    },
  },
  {
    seq: 28491,
    afterSec: 19,
    channel: "citizen",
    role: "operator",
    name: "Meera · Control room",
    text: "Stay inside the shop. A response unit has been assigned.",
  },
  {
    seq: 28491,
    afterSec: 24,
    channel: "internal",
    role: "operator",
    name: "Meera Joshi",
    text: "Caller is sheltering in a stationery shop near Swastik Cross Road. Two individuals outside, no weapon seen.",
  },
  {
    seq: 28491,
    afterSec: 31,
    channel: "citizen",
    role: "citizen",
    name: "Kavya",
    text: "Okay. The shopkeeper has closed the shutter halfway.",
  },
  {
    seq: 28490,
    afterSec: 40,
    channel: "internal",
    role: "operator",
    name: "Meera Joshi",
    text: "Ambulance requested. Unit 04, please confirm lane status on arrival.",
  },
  {
    seq: 28490,
    afterSec: 70,
    channel: "internal",
    role: "officer",
    name: "HC Imran Pathan",
    text: "Unit 04 en route. Three minutes out.",
  },
  {
    seq: 28488,
    afterSec: 60,
    channel: "citizen",
    role: "operator",
    name: "Meera · Control room",
    text: "Please stay at Gate 2. Officers are on their way to you with the description.",
  },
  {
    seq: 28488,
    afterSec: 95,
    channel: "citizen",
    role: "citizen",
    name: "Guardian",
    text: "I am at the gate. I have a photo from this morning.",
  },
  {
    seq: 28488,
    afterSec: 360,
    channel: "internal",
    role: "officer",
    name: "PSI Sneha Rathod",
    text: "On scene. Splitting the search: Unit 09 lakeside path, Unit 15 play area and food court.",
  },
  {
    seq: 28488,
    afterSec: 420,
    channel: "internal",
    role: "supervisor",
    name: "Inspector Ketan Barot",
    text: "Garden staff are holding exits. Keep me posted every five minutes.",
  },
  {
    seq: 28487,
    afterSec: 20,
    channel: "citizen",
    role: "citizen",
    name: "Resident",
    text: "cant talk. locked in room",
  },
  {
    seq: 28487,
    afterSec: 34,
    channel: "citizen",
    role: "operator",
    name: "Meera · Control room",
    text: "Understood. We will not call you. Officers are coming without sirens. Reply with 1 if you are hurt, 2 if you are not.",
  },
  {
    seq: 28487,
    afterSec: 52,
    channel: "citizen",
    role: "citizen",
    name: "Resident",
    text: "2",
  },
  {
    seq: 28487,
    afterSec: 60,
    channel: "internal",
    role: "operator",
    name: "Meera Joshi",
    text: "Chat only. Caller is not injured. Silent approach requested.",
  },
  {
    seq: 28484,
    afterSec: 400,
    channel: "internal",
    role: "officer",
    name: "HC Jignesh Vaghela",
    text: "On scene with the neighbour. Using the spare key now.",
  },
  {
    seq: 28479,
    afterSec: 380,
    channel: "internal",
    role: "officer",
    name: "PSI Pooja Bhatt",
    text: "Approach road cleared for tenders. Residents gathered at the rear lane, all accounted for.",
  },
];

/* ───────────────────────── Evidence ───────────────────────── */

interface EvSpec {
  n: number;
  seq: number;
  type: EvidenceType;
  title: string;
  file: string;
  size: number;
  dur?: number;
  source: Evidence["source"];
  by: string;
  byRole: RoleKey;
  cls: EvidenceClassification;
  integrity: EvidenceIntegrity;
  afterSec: number;
  device?: string;
  exported?: boolean;
}

const EVIDENCE_SPECS: EvSpec[] = [
  {
    n: 4521,
    seq: 28491,
    type: "audio",
    title: "Voice note from citizen",
    file: "voice-note-2026-28491.m4a",
    size: 284_000,
    dur: 18,
    source: "citizen",
    by: "Kavya P.",
    byRole: "citizen",
    cls: "sensitive",
    integrity: "verified",
    afterSec: 12,
    device: "Citizen app · Android",
  },
  {
    n: 4522,
    seq: 28491,
    type: "photo",
    title: "View from shop entrance",
    file: "photo-shop-entrance.jpg",
    size: 2_140_000,
    source: "citizen",
    by: "Kavya P.",
    byRole: "citizen",
    cls: "sensitive",
    integrity: "pending",
    afterSec: 28,
    device: "Citizen app · Android",
  },
  {
    n: 4518,
    seq: 28490,
    type: "video",
    title: "Dashcam clip from witness",
    file: "dashcam-sg-highway.mp4",
    size: 18_600_000,
    dur: 42,
    source: "citizen",
    by: "Passer-by",
    byRole: "citizen",
    cls: "standard",
    integrity: "verified",
    afterSec: 80,
    device: "Web upload",
  },
  {
    n: 4512,
    seq: 28488,
    type: "photo",
    title: "Recent photograph of the child (from guardian)",
    file: "child-reference-photo.jpg",
    size: 1_820_000,
    source: "citizen",
    by: "Guardian",
    byRole: "citizen",
    cls: "restricted",
    integrity: "verified",
    afterSec: 110,
    device: "Citizen app · iOS",
    exported: true,
  },
  {
    n: 4513,
    seq: 28488,
    type: "video",
    title: "CCTV — Lake Garden Gate 2",
    file: "cctv-gate2-1640.mp4",
    size: 46_200_000,
    dur: 130,
    source: "operator",
    by: "Meera Joshi",
    byRole: "operator",
    cls: "restricted",
    integrity: "verified",
    afterSec: 300,
    device: "Control room ingest",
  },
  {
    n: 4509,
    seq: 28487,
    type: "audio",
    title: "Background audio shared by citizen",
    file: "citizen-shared-audio.m4a",
    size: 1_020_000,
    dur: 64,
    source: "citizen",
    by: "Resident",
    byRole: "citizen",
    cls: "restricted",
    integrity: "verified",
    afterSec: 70,
    device: "Citizen app · Android",
  },
  {
    n: 4506,
    seq: 28484,
    type: "photo",
    title: "Residence entrance on arrival",
    file: "arrival-entrance.jpg",
    size: 2_480_000,
    source: "officer",
    by: "HC Jignesh Vaghela",
    byRole: "officer",
    cls: "standard",
    integrity: "verified",
    afterSec: 380,
    device: "Officer app · GJ-AHD-21",
  },
  {
    n: 4503,
    seq: 28479,
    type: "photo",
    title: "Smoke from shop shutter",
    file: "shop-shutter-smoke.jpg",
    size: 3_010_000,
    source: "citizen",
    by: "Resident",
    byRole: "citizen",
    cls: "standard",
    integrity: "verified",
    afterSec: 30,
    device: "Citizen app · Android",
  },
  {
    n: 4504,
    seq: 28479,
    type: "video",
    title: "Approach road cleared",
    file: "approach-road.mp4",
    size: 22_400_000,
    dur: 37,
    source: "officer",
    by: "PSI Pooja Bhatt",
    byRole: "officer",
    cls: "standard",
    integrity: "verified",
    afterSec: 420,
    device: "Officer app · GJ-AHD-23",
  },
  {
    n: 4498,
    seq: 28485,
    type: "document",
    title: "Payment message screenshots",
    file: "payment-messages.pdf",
    size: 640_000,
    source: "citizen",
    by: "Nirav K.",
    byRole: "citizen",
    cls: "sensitive",
    integrity: "pending",
    afterSec: 90,
    device: "Web upload",
  },
  {
    n: 4490,
    seq: 28478,
    type: "document",
    title: "Preliminary response report",
    file: "response-report-28478.pdf",
    size: 212_000,
    source: "officer",
    by: "PSI Pooja Bhatt",
    byRole: "officer",
    cls: "standard",
    integrity: "verified",
    afterSec: 1500,
    device: "Officer app · GJ-AHD-23",
  },
  {
    n: 4487,
    seq: 28477,
    type: "document",
    title: "Preliminary response report",
    file: "response-report-28477.pdf",
    size: 198_000,
    source: "officer",
    by: "ASI Nilesh Dave",
    byRole: "officer",
    cls: "standard",
    integrity: "verified",
    afterSec: 1300,
    device: "Officer app · GJ-AHD-08",
  },
  {
    n: 4484,
    seq: 28476,
    type: "photo",
    title: "Defaced compound wall",
    file: "compound-wall.jpg",
    size: 2_760_000,
    source: "citizen",
    by: "Aarav S.",
    byRole: "citizen",
    cls: "standard",
    integrity: "verified",
    afterSec: 60,
    device: "Citizen app · iOS",
  },
  {
    n: 4480,
    seq: 28475,
    type: "photo",
    title: "Motorcycle seen following the citizen",
    file: "motorcycle-cg-road.jpg",
    size: 1_940_000,
    source: "citizen",
    by: "Ishani V.",
    byRole: "citizen",
    cls: "sensitive",
    integrity: "verified",
    afterSec: 45,
    device: "Citizen app · iOS",
    exported: true,
  },
  {
    n: 4481,
    seq: 28475,
    type: "document",
    title: "Statement summary",
    file: "statement-summary-28475.pdf",
    size: 164_000,
    source: "officer",
    by: "PSI Tanvi Shah",
    byRole: "officer",
    cls: "sensitive",
    integrity: "verified",
    afterSec: 2100,
    device: "Officer app · GJ-AHD-15",
  },
  {
    n: 4472,
    seq: 28471,
    type: "video",
    title: "Body-worn camera excerpt",
    file: "bwc-excerpt-28471.mp4",
    size: 88_300_000,
    dur: 202,
    source: "officer",
    by: "PSI Ritu Makwana",
    byRole: "officer",
    cls: "restricted",
    integrity: "verified",
    afterSec: 900,
    device: "Body-worn camera · GJ-AHD-06",
  },
  {
    n: 4466,
    seq: 28469,
    type: "video",
    title: "Crowd at Stadium Gate 4",
    file: "gate4-crowd.mp4",
    size: 31_900_000,
    dur: 58,
    source: "citizen",
    by: "Venue security",
    byRole: "citizen",
    cls: "standard",
    integrity: "flagged",
    afterSec: 120,
    device: "Web upload",
  },
  {
    n: 4461,
    seq: 28466,
    type: "photo",
    title: "Unattended bag at bus stop",
    file: "bus-stop-bag.jpg",
    size: 2_050_000,
    source: "citizen",
    by: "Bus conductor",
    byRole: "citizen",
    cls: "standard",
    integrity: "verified",
    afterSec: 40,
    device: "Citizen app · Android",
  },
];

const MIME: Record<EvidenceType, string> = {
  photo: "image/jpeg",
  video: "video/mp4",
  audio: "audio/mp4",
  document: "application/pdf",
};

export const evidenceId = (n: number) => `EV-2026-00${n}`;

export const retentionFor = (cls: EvidenceClassification) =>
  cls === "restricted"
    ? "Held until case closure plus review (demo policy)"
    : cls === "sensitive"
      ? "3 years after closure (demo policy)"
      : "1 year after closure (demo policy)";

function buildEvidence(spec: EvSpec, incident: Incident): Evidence {
  const id = evidenceId(spec.n);
  const submittedAt = incident.createdAt + spec.afterSec * SEC;
  const access: EvidenceAccess[] = [
    {
      id: `${id}-x1`,
      at: submittedAt,
      actorName: spec.by,
      actorRole: spec.byRole,
      action: "uploaded",
      detail: spec.device,
    },
    {
      id: `${id}-x2`,
      at: submittedAt + 2 * SEC,
      actorName: "Evidence service",
      actorRole: "system",
      action: "integrity_recorded",
      detail:
        spec.integrity === "pending"
          ? "Digest queued"
          : "Digest recorded at ingestion",
    },
    {
      id: `${id}-x3`,
      at: submittedAt + 3 * SEC,
      actorName: "Evidence service",
      actorRole: "system",
      action: "linked",
      detail: `Linked to ${incident.id}`,
    },
  ];
  if (spec.integrity !== "pending") {
    access.push({
      id: `${id}-x4`,
      at: submittedAt + 45 * SEC,
      actorName: spec.cls === "restricted" ? "Inspector Neha Desai" : OPERATOR.name,
      actorRole: spec.cls === "restricted" ? "supervisor" : "operator",
      action: "viewed",
      detail: "Viewed from incident panel",
    });
  }
  if (spec.exported) {
    access.push({
      id: `${id}-x5`,
      at: submittedAt + 6 * MIN,
      actorName: "Inspector Neha Desai",
      actorRole: "supervisor",
      action: "export_requested",
      detail: "Requested for case hand-off package",
    });
  }
  if (spec.integrity === "flagged") {
    access.push({
      id: `${id}-x6`,
      at: submittedAt + 9 * MIN,
      actorName: "Evidence service",
      actorRole: "system",
      action: "integrity_recorded",
      detail:
        "Re-check produced a different digest. Original preserved, copy quarantined.",
    });
  }
  return {
    id,
    incidentId: incident.id,
    type: spec.type,
    title: spec.title,
    fileName: spec.file,
    mime: MIME[spec.type],
    sizeBytes: spec.size,
    durationSec: spec.dur,
    source: spec.source,
    uploadedByName: spec.by,
    uploadedByRole: spec.byRole,
    capturedAt: submittedAt - 25 * SEC,
    submittedAt,
    integrity: spec.integrity,
    hash: fakeDigest(id),
    hashAlgorithm: "SHA-256 (demo)",
    classification: spec.cls,
    retention: retentionFor(spec.cls),
    device: spec.device,
    access,
  };
}

export function seedIncidentData(now: Timestamp): {
  incidents: Incident[];
  messages: Message[];
  evidence: Evidence[];
} {
  const incidents = SPECS.map((s) => buildIncident(s, now)).sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  const byId = new Map(incidents.map((i) => [i.id, i]));

  const messages: Message[] = MESSAGE_SPECS.flatMap((m, i) => {
    const incident = byId.get(incidentId(m.seq));
    if (!incident) return [];
    // Seeded chatter is clamped so nothing is stamped in the future for young incidents.
    const at = Math.min(
      incident.createdAt + m.afterSec * SEC,
      now - (MESSAGE_SPECS.length - i) * 400,
    );
    return [
      {
        id: `msg-${i + 1}`,
        incidentId: incident.id,
        channel: m.channel,
        senderRole: m.role,
        senderName: m.name,
        text: m.text,
        at,
        translated: m.translated,
      },
    ];
  });

  const evidence: Evidence[] = EVIDENCE_SPECS.flatMap((e) => {
    const incident = byId.get(incidentId(e.seq));
    if (!incident) return [];
    const record = buildEvidence(e, incident);
    record.submittedAt = Math.min(record.submittedAt, now - 4 * SEC);
    record.capturedAt = Math.min(
      record.capturedAt,
      record.submittedAt - 5 * SEC,
    );
    // Nothing in the access history may be stamped later than the moment of seeding.
    for (const entry of record.access) entry.at = Math.min(entry.at, now - 2 * SEC);
    incident.evidenceIds.push(record.id);
    return [record];
  });
  evidence.sort((a, b) => b.submittedAt - a.submittedAt);

  return { incidents, messages, evidence };
}

export const OFFICER_NAME_BY_UNIT = Object.fromEntries(
  UNIT_SPECS.map((u) => [
    unitIdOf(u.n),
    OFFICERS.find((o) => o.id === u.officerId)?.name ?? "Officer",
  ]),
) as Record<string, string>;
