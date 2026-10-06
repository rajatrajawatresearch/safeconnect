import { format } from "date-fns";
import type { LatLng, Timestamp } from "@/types";

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

/** 272 → "04:32", 3723 → "01:02:03". `forceHours` always shows the hour group, as on the response timer. */
export function formatDuration(
  totalSeconds: number,
  forceHours = false,
): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 || forceHours
    ? `${pad(h)}:${pad(m)}:${pad(sec)}`
    : `${pad(m)}:${pad(sec)}`;
}

/** Feed-style age: "00:42 ago" under an hour, then "2 h 05 min ago", then a date. */
export function formatAgo(at: Timestamp, now: Timestamp): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 3600) return `${formatDuration(s)} ago`;
  if (s < 86400)
    return `${Math.floor(s / 3600)} h ${pad(Math.floor((s % 3600) / 60))} min ago`;
  return format(at, "d MMM, HH:mm");
}

/** Plain-language age for citizen screens: "just now", "4 min ago", "2 h ago". */
export function formatAgoFriendly(at: Timestamp, now: Timestamp): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
  return format(at, "d MMM yyyy");
}

export const formatClock = (at: Timestamp) => format(at, "HH:mm:ss");
export const formatTime = (at: Timestamp) => format(at, "HH:mm");
export const formatDate = (at: Timestamp) => format(at, "d MMM yyyy");
export const formatDateTime = (at: Timestamp) =>
  format(at, "d MMM yyyy, HH:mm");

/** Remaining minutes and seconds until `at`, clamped at zero. */
export function formatEta(at: Timestamp | undefined, now: Timestamp): string {
  if (!at) return "—";
  return formatDuration(Math.max(0, (at - now) / 1000));
}

export function etaMinutes(
  at: Timestamp | undefined,
  now: Timestamp,
): number | null {
  if (!at) return null;
  return Math.max(0, Math.ceil((at - now) / 60000));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const formatKm = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

export const formatCoords = (p: LatLng) =>
  `${p.lat.toFixed(4)}° N, ${p.lng.toFixed(4)}° E`;

export function formatSeconds(sec: number): string {
  if (sec < 60) return `${sec} sec`;
  const m = sec / 60;
  return Number.isInteger(m) ? `${m} min` : `${m.toFixed(1)} min`;
}

export function greetingFor(date: Date): "morning" | "afternoon" | "evening" {
  const h = date.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export function initialsOf(name: string): string {
  return name
    .replace(/^(PSI|ASI|HC|DCP|IG|Inspector|W-PSI)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export interface Shift {
  name: "A" | "B" | "C";
  /** e.g. "Shift B · 14:00 – 22:00" */
  label: string;
  endsAt: Timestamp;
}

/** Three eight-hour shifts: A 06:00–14:00, B 14:00–22:00, C 22:00–06:00. */
export function shiftAt(now: Timestamp): Shift {
  const d = new Date(now);
  const h = d.getHours();
  const name = h >= 6 && h < 14 ? "A" : h >= 14 && h < 22 ? "B" : "C";
  const endHour = name === "A" ? 14 : name === "B" ? 22 : 6;
  const end = new Date(d);
  end.setHours(endHour, 0, 0, 0);
  if (end.getTime() <= now) end.setDate(end.getDate() + 1);
  const range = name === "A" ? "06:00 – 14:00" : name === "B" ? "14:00 – 22:00" : "22:00 – 06:00";
  return { name, label: `Shift ${name} · ${range}`, endsAt: end.getTime() };
}
