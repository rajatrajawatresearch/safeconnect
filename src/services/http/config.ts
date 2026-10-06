/**
 * Where the API lives, if anywhere.
 *
 *  - `NEXT_PUBLIC_API_URL`  full base URL, e.g. https://api.example.gov.in
 *  - `NEXT_PUBLIC_API_PORT` same host as the page, given port — what `npm run dev:full` uses, so a
 *    phone on the LAN reaches the API on the computer's address without any extra configuration.
 *
 * With neither set the app runs as the stand-alone browser demo.
 */
const url = process.env.NEXT_PUBLIC_API_URL;
const port = process.env.NEXT_PUBLIC_API_PORT;

export const API_MODE = Boolean(url || port);

export function apiBaseUrl(): string {
  if (url) return url.replace(/\/$/, "");
  if (typeof window === "undefined") return `http://127.0.0.1:${port}`;
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}
