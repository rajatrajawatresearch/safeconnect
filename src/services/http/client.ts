import { usePrefsStore } from "@/stores/prefs-store";
import { ServiceError } from "../contracts";
import { apiBaseUrl } from "./config";

/**
 * Token handling and the one function every API call goes through.
 *
 * The demo signs in as the persona chosen in the role switcher; a deployment replaces `signIn`
 * with its identity provider and keeps everything else.
 */
interface Auth {
  personaId: string;
  token: string;
  expiresAt: number;
}

let auth: Auth | null = null;
let signingIn: { personaId: string; promise: Promise<Auth> } | null = null;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function signIn(personaId: string): Promise<Auth> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId }),
    });
  } catch {
    throw new ServiceError("offline", "Cannot reach the server. Reconnecting…");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ServiceError(
      "forbidden",
      body?.message ?? "Sign-in was refused.",
    );
  }
  const data = (await res.json()) as { token: string; expiresAt: number };
  return { personaId, token: data.token, expiresAt: data.expiresAt };
}

/** A valid token for the persona, signing in first if needed. Concurrent callers share one sign-in. */
export async function tokenFor(personaId: string): Promise<string> {
  if (
    auth &&
    auth.personaId === personaId &&
    auth.expiresAt - Date.now() > 60_000
  )
    return auth.token;
  if (!signingIn || signingIn.personaId !== personaId) {
    const promise = signIn(personaId).then(
      (next) => {
        auth = next;
        signingIn = null;
        return next;
      },
      (error) => {
        signingIn = null;
        throw error;
      },
    );
    signingIn = { personaId, promise };
  }
  return (await signingIn.promise).token;
}

export function replaceToken(token: string, expiresAt: number) {
  if (auth) auth = { ...auth, token, expiresAt };
}

interface Options {
  /** Still attempted while the demo's simulated connection is "offline". */
  allowOffline?: boolean;
}

/**
 * Calls the API as the current persona. Failures surface as `ServiceError` so screens can show the
 * same offline, forbidden and not-found states they show in the stand-alone demo.
 */
export async function http<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options: Options = {},
): Promise<T> {
  const { connectivity, personaId } = usePrefsStore.getState();
  if (connectivity === "offline" && !options.allowOffline) {
    await wait(300);
    throw new ServiceError("offline", "Connection interrupted. Reconnecting…");
  }
  if (connectivity === "weak") await wait(900 + Math.random() * 500);

  const send = async (): Promise<Response> => {
    const token = await tokenFor(personaId);
    try {
      return await fetch(`${apiBaseUrl()}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ServiceError(
        "offline",
        "Cannot reach the server. Reconnecting…",
      );
    }
  };

  let res = await send();
  if (res.status === 401) {
    // The token expired or the server restarted with a different key: sign in again once.
    auth = null;
    res = await send();
  }
  const data = (await res.json().catch(() => null)) as
    | (T & { message?: string })
    | null;
  if (res.ok) return data as T;

  const message = data?.message ?? "The request could not be completed.";
  if (res.status === 401 || res.status === 403)
    throw new ServiceError("forbidden", message);
  if (res.status === 404) throw new ServiceError("not_found", message);
  if (res.status >= 500) throw new Error(message);
  throw new ServiceError("invalid", message);
}

/** True when the failure means "the network is down", as opposed to "the server said no". */
export const isOffline = (error: unknown) =>
  error instanceof ServiceError && error.code === "offline";
