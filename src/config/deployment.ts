import type { LatLng } from "@/types";

/**
 * Everything that changes between deployments lives here. Pointing the platform at another
 * state or a central agency means editing this file and the seed/organisation data — no UI code.
 */
export interface DeploymentConfig {
  productName: string;
  productTagline: string;
  orgName: string;
  stateName: string;
  stateCode: string;
  primaryCity: string;
  /** Prefix used when minting incident, unit and complaint references. */
  idPrefix: string;
  demoMode: boolean;
  disclaimer: string;
  disclaimerShort: string;
  /** Shown beside the disclaimer so nobody mistakes the demo for a live line. */
  realEmergencyHint: string;
  cityCenter: LatLng;
  cityZoom: number;
  stateCenter: LatLng;
  stateZoom: number;
  tiles: { url: string; attribution: string };
}

export const deployment: DeploymentConfig = {
  productName: "Sanket",
  productTagline: "Public Safety Platform",
  orgName: "Gujarat Public Safety",
  stateName: "Gujarat",
  stateCode: "GJ",
  primaryCity: "Ahmedabad",
  idPrefix: "GJ-AHD",
  demoMode: true,
  disclaimer:
    "Prototype / Demonstration Environment — Not connected to real emergency services.",
  disclaimerShort: "Demo — not connected to emergency services",
  realEmergencyHint: "In a real emergency, call 112.",
  cityCenter: { lat: 23.0365, lng: 72.5511 },
  cityZoom: 13,
  stateCenter: { lat: 22.45, lng: 71.6 },
  stateZoom: 7,
  tiles: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};
