import type { IncidentPriority, IncidentSource } from "@/types";
import type { AreaKey } from "./geo";

/** Pool the event simulator draws from when it adds an ambient incident. All content is fictional. */
export interface IncidentTemplate {
  cat: string;
  pr: IncidentPriority;
  area: AreaKey;
  source: IncidentSource;
  title: string;
  desc: string;
  reporter: string;
  danger?: boolean;
}

export const INCIDENT_TEMPLATES: IncidentTemplate[] = [
  {
    cat: "road_accident",
    pr: "P2",
    area: "ashram",
    source: "call",
    title: "Road accident",
    reporter: "Auto driver (caller)",
    danger: true,
    desc: "Auto-rickshaw and a car collided near Income Tax Circle. One passenger complaining of shoulder pain.",
  },
  {
    cat: "public_nuisance",
    pr: "P4",
    area: "satellite",
    source: "report",
    title: "Public nuisance",
    reporter: "Resident (report)",
    desc: "Group drinking in a parked car outside a housing society for the past hour.",
  },
  {
    cat: "suspicious_activity",
    pr: "P3",
    area: "memnagar",
    source: "report",
    title: "Suspicious activity",
    reporter: "Security guard (report)",
    desc: "Two people trying door handles of parked cars along Vijay Cross Road.",
  },
  {
    cat: "senior_citizen",
    pr: "P2",
    area: "paldi",
    source: "call",
    title: "Senior citizen assistance",
    reporter: "Daughter (caller)",
    danger: true,
    desc: "Caller's father, 78, is confused and has walked out of the house towards the bus terminus.",
  },
  {
    cat: "harassment",
    pr: "P2",
    area: "gurukul",
    source: "sos",
    title: "Harassment",
    reporter: "Student (SOS)",
    danger: true,
    desc: "Student reports a person repeatedly following her from the coaching class to the bus stop.",
  },
  {
    cat: "traffic_hazard",
    pr: "P3",
    area: "bodakdev",
    source: "report",
    title: "Traffic hazard",
    reporter: "Commuter (report)",
    desc: "Signal at Judges Bungalow Road has been dark for twenty minutes and traffic is crossing blind.",
  },
  {
    cat: "fighting",
    pr: "P3",
    area: "kankaria",
    source: "call",
    title: "Fighting",
    reporter: "Vendor (caller)",
    desc: "Argument between two vendors has turned into a scuffle near Zoo Circle.",
  },
  {
    cat: "online_fraud",
    pr: "P4",
    area: "jodhpur",
    source: "report",
    title: "Cyber fraud",
    reporter: "Citizen (report)",
    desc: "Received a message about an electricity disconnection and paid through the link. Amount lost is about ₹ 9,800.",
  },
  {
    cat: "blocked_road",
    pr: "P4",
    area: "ghatlodia",
    source: "report",
    title: "Blocked road",
    reporter: "Shopkeeper (report)",
    desc: "Delivery truck broken down across the lane near Prabhat Chowk.",
  },
  {
    cat: "threat",
    pr: "P2",
    area: "usmanpura",
    source: "call",
    title: "Threat or intimidation",
    reporter: "Tenant (caller)",
    danger: true,
    desc: "Caller says three people are outside her door demanding she vacate the flat tonight.",
  },
  {
    cat: "medical",
    pr: "P1",
    area: "ellisbridge",
    source: "sos",
    title: "Medical emergency",
    reporter: "Bystander (SOS)",
    danger: true,
    desc: "Elderly man has collapsed outside Town Hall. Breathing but not responding.",
  },
  {
    cat: "drunk_driving",
    pr: "P3",
    area: "prahladnagar",
    source: "call",
    title: "Suspected drunk driving",
    reporter: "Valet (caller)",
    desc: "Driver who could barely stand has left Corporate Road in a grey sedan.",
  },
];
