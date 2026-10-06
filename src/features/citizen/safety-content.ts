import {
  Accessibility,
  Car,
  CreditCard,
  EyeOff,
  Footprints,
  Hand,
  MapPin,
  Siren,
  type LucideIcon,
} from "lucide-react";
import type { TKey } from "@/lib/i18n";

/**
 * Safety centre guidance. Titles and summaries are translated; the step-by-step text is English
 * for now and falls back cleanly in other languages.
 *
 * Editorial rules: practical, short, and never an instruction to confront, follow or detain anyone.
 */
export interface Guide {
  id: string;
  icon: LucideIcon;
  titleKey: TKey;
  summaryKey: TKey;
  steps: string[];
  /** Where the guide sends the reader next. */
  links: ("sos" | "report" | "journey" | "privacy" | "contacts")[];
}

export const SITUATIONS: Guide[] = [
  {
    id: "followed",
    icon: Footprints,
    titleKey: "citizen.safety.followed",
    summaryKey: "citizen.safety.followedSummary",
    steps: [
      "Walk towards people and light: a shop, a petrol pump, a hotel lobby, a security desk. Stay where others can see you.",
      "Do not head home if you think you are still being followed, and do not approach or speak to the person.",
      "Hold the SOS button. If talking would draw attention, use Silent SOS and answer in chat.",
      "Call or message someone you trust and keep them on the line until help reaches you.",
      "If this is a route you take often, start Journey safety before you set off next time.",
    ],
    links: ["sos", "journey"],
  },
  {
    id: "harassment",
    icon: Hand,
    titleKey: "citizen.safety.harassment",
    summaryKey: "citizen.safety.harassmentSummary",
    steps: [
      "Put distance between you and the person. Move towards staff, security or a group of people.",
      "You do not owe anyone a reply or an explanation. Leaving is enough.",
      "If you feel unsafe right now, hold the SOS button.",
      "When you are somewhere safe, note the time, the place and what was said or done. Photos and screenshots help.",
      "Report it from Report something. You can choose to keep your name off the report.",
    ],
    links: ["sos", "report"],
  },
  {
    id: "accident",
    icon: Car,
    titleKey: "citizen.safety.accident",
    summaryKey: "citizen.safety.accidentSummary",
    steps: [
      "Get yourself out of the traffic first. If you are in a vehicle, switch on the hazard lights.",
      "Do not move an injured person unless staying put is more dangerous, such as a fire or oncoming traffic.",
      "Hold the SOS button, or use Medical under quick help, and say how many people are hurt.",
      "If it is safe, warn approaching vehicles from the roadside, never from the carriageway.",
      "A photo of the scene helps the responders. You can share one from the emergency screen.",
    ],
    links: ["sos", "report"],
  },
  {
    id: "cyber",
    icon: CreditCard,
    titleKey: "citizen.safety.cyber",
    summaryKey: "citizen.safety.cyberSummary",
    steps: [
      "End the call or chat. Do not share an OTP, PIN, card number or screen-sharing access with anyone.",
      "Ring your bank on the number printed on your card and ask them to block the card or account.",
      "Keep everything: messages, call logs, transaction references and screenshots.",
      "Report it from Report something under Cyber and financial. The sooner it is reported, the more can be done.",
      "No police officer and no bank will ever ask you to move money to a “safe account”.",
    ],
    links: ["report"],
  },
  {
    id: "vulnerable",
    icon: Accessibility,
    titleKey: "citizen.safety.vulnerable",
    summaryKey: "citizen.safety.vulnerableSummary",
    steps: [
      "If a child or an older person is lost, confused or hurt, stay with them somewhere safe and visible if you can.",
      "Hold the SOS button, or use Child safety under quick help for a child.",
      "Do not hand a child to anyone who cannot show they are the parent or guardian. Wait for the police to arrive.",
      "For an older person, look for a phone, a medical card or an address they carry and tell the operator.",
      "If your own child or parent is missing, raise an SOS straight away. There is no waiting period.",
    ],
    links: ["sos"],
  },
];

export const HOW_IT_WORKS: Guide[] = [
  {
    id: "sos",
    icon: Siren,
    titleKey: "citizen.safety.howSos",
    summaryKey: "citizen.safety.howSosSummary",
    steps: [
      "Hold the button for three seconds. A stray tap does nothing, and letting go early cancels it.",
      "Your request appears on a control room operator's screen with your name and your location.",
      "The operator stays with you by chat, voice or video and sends the nearest available unit.",
      "You see each step as it happens, and you can end the emergency yourself once you are safe.",
      "With no connection, the request is saved on your phone and sent when the connection returns. Nothing is sent by SMS.",
    ],
    links: ["sos", "contacts"],
  },
  {
    id: "silent",
    icon: EyeOff,
    titleKey: "citizen.safety.howSilent",
    summaryKey: "citizen.safety.howSilentSummary",
    steps: [
      "Silent SOS raises the same emergency with no sound, and opens a dim screen with chat only.",
      "The control room is told that you cannot speak, so the operator writes instead of calling.",
      "It only changes what this screen shows. It does not record audio or video.",
      "You can switch back to the full view, or end the emergency, at any time.",
    ],
    links: ["sos"],
  },
  {
    id: "location",
    icon: MapPin,
    titleKey: "citizen.safety.howLocation",
    summaryKey: "citizen.safety.howLocationSummary",
    steps: [
      "Your location is read when you raise an SOS, start a shared journey, or choose to attach it to a report. Not at any other time.",
      "During an emergency it is shown to the operator handling it and to the unit sent to you. Sharing stops when the emergency ends.",
      "Staff access depends on their role, and every time a record is opened it is written to an audit log.",
      "You can switch emergency location sharing off in the privacy centre. An SOS then carries only your saved area.",
    ],
    links: ["privacy"],
  },
];

export const HELPLINES: { titleKey: TKey; bodyKey: TKey }[] = [
  {
    titleKey: "citizen.safety.helpline.women",
    bodyKey: "citizen.safety.helpline.womenBody",
  },
  {
    titleKey: "citizen.safety.helpline.child",
    bodyKey: "citizen.safety.helpline.childBody",
  },
  {
    titleKey: "citizen.safety.helpline.cyber",
    bodyKey: "citizen.safety.helpline.cyberBody",
  },
  {
    titleKey: "citizen.safety.helpline.senior",
    bodyKey: "citizen.safety.helpline.seniorBody",
  },
];
