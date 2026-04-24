import { createHmac } from "crypto";
import { getServerEnv, type ServerEnv } from "@/lib/env";

/** Synthetic email for Supabase email/password bridge after Strava OAuth. */
export function participantStravaEmail(athleteId: number) {
  const e = getServerEnv() as ServerEnv;
  const domain = e.STRAVA_PARTICIPANT_EMAIL_DOMAIN ?? "participants.local";
  if (!e.STRAVA_PARTICIPANT_EMAIL_DOMAIN) {
    console.warn(
      "STRAVA_PARTICIPANT_EMAIL_DOMAIN not set; using participants.local. Configure a dedicated subdomain for production.",
    );
  }
  return `strava+${athleteId}@${domain}`;
}

/** Derives a long-lived password for the Supabase user linked to a Strava athlete. Server-only. */
export function participantDerivedPassword(athleteId: number) {
  const e = getServerEnv() as ServerEnv;
  const secret = e.STRAVA_OAUTH_DERIVE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("STRAVA_OAUTH_DERIVE_SECRET must be set to at least 32 characters.");
  }
  return createHmac("sha256", secret)
    .update(`strava:oauth:${athleteId}`)
    .digest("hex");
}
