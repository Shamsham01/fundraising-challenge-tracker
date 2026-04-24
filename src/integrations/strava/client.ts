import { isStravaMocked } from "@/lib/env";
import { mockStrava } from "./mock";
import type { StravaActivity, StravaTokenResponse, StravaAthlete } from "./types";

const BASE = "https://www.strava.com";

async function stravaJson<T>(path: string, init: RequestInit & { accessToken: string }): Promise<T> {
  const { accessToken, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(rest.headers || {}),
    },
  });
  if (res.status === 404) {
    await res.text();
    throw new NotFoundError("Strava 404");
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Strava ${res.status}: ${t}`);
  }
  return (await res.json()) as T;
}

export class NotFoundError extends Error {
  constructor(m: string) {
    super(m);
    this.name = "NotFoundError";
  }
}

export async function exchangeAuthorizationCode(
  code: string,
  creds: { clientId: string; clientSecret: string; redirectUri: string },
) {
  if (isStravaMocked()) {
    return mockStrava.exchangeCode(code);
  }
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: creds.redirectUri,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Strava token exchange ${res.status}: ${t}`);
  }
  return (await res.json()) as StravaTokenResponse & { expires_in: number; expires_at?: number };
}

export function computeExpiresAtSeconds(body: { expires_in: number; expires_at?: number }) {
  if (body.expires_at) return body.expires_at;
  return Math.floor(Date.now() / 1000) + body.expires_in;
}

export async function refreshAccessToken(
  refreshToken: string,
  creds: { clientId: string; clientSecret: string },
) {
  if (isStravaMocked()) {
    return mockStrava.exchangeCode("r");
  }
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Strava refresh ${res.status}: ${t}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
  };
}

export async function getActivity(
  stravaId: number,
  accessToken: string,
): Promise<StravaActivity> {
  if (isStravaMocked()) {
    return mockStrava.getActivity(stravaId);
  }
  return stravaJson<StravaActivity>(`/api/v3/activities/${stravaId}`, {
    method: "GET",
    accessToken,
  });
}

/** Returns null if Strava returns 404 (deleted activity). */
export async function getActivityOrNull(
  stravaId: number,
  accessToken: string,
): Promise<StravaActivity | null> {
  if (isStravaMocked()) {
    return mockStrava.getActivity(stravaId);
  }
  try {
    return await getActivity(stravaId, accessToken);
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    throw e;
  }
}

/** Revoke access on Strava's side. Call before deleting user or disconnecting. */
export async function deauthorizeStravaAtSource(accessToken: string) {
  if (isStravaMocked()) {
    return { ok: true as const };
  }
  const res = await fetch(`${BASE}/oauth/deauthorize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Strava deauthorize ${res.status}: ${t}`);
  }
  return (await res.json()) as { id: number };
}

export async function listRecentActivities(
  accessToken: string,
  perPage: number = 30,
  page: number = 1,
) {
  if (isStravaMocked()) {
    return mockStrava.listAthleteActivities();
  }
  return stravaJson<StravaActivity[]>(`/api/v3/athlete/activities?per_page=${perPage}&page=${page}`, {
    method: "GET",
    accessToken,
  });
}

export function buildStravaAuthUrl(redirectUri: string, state: string, clientId: string) {
  const u = new URL("https://www.strava.com/oauth/authorize");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "read,activity:read_all,profile:read_all");
  u.searchParams.set("state", state);
  u.searchParams.set("approval_prompt", "auto");
  return u.toString();
}

export function parseWebhookPayload(
  body: string,
): { events: { object_type: string; object_id: number; owner_id: number; aspect_type: string; event_time: number; subscription_id: number }[] } {
  // Strava may send a single object or an array; normalise
  const raw = JSON.parse(body) as unknown;
  if (Array.isArray(raw)) {
    return { events: raw as never[] };
  }
  return { events: [raw as never] };
}

export type { StravaAthlete, StravaActivity };
