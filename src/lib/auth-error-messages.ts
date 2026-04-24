const MAP: Record<string, string> = {
  strava_athlete_limit:
    "This Strava app has reached the number of athletes allowed before Strava’s review. The organiser can request a higher limit in the Strava developer program. This is a Strava account limit, not a bug in this site.",
  state: "Sign-in was cancelled or the session changed. Please try “Connect Strava” again from this site.",
  missing_code: "No authorisation code was returned. Please try again.",
  config: "The server is missing Strava configuration. Check environment variables for this deployment.",
};

function decodeE(e: string) {
  try {
    return decodeURIComponent(e);
  } catch {
    return e;
  }
}

export function messageForAuthErrorParam(e: string | undefined): { title: string; body: string } {
  if (!e) {
    return { title: "Sign-in error", body: "An unknown error occurred. Please try again." };
  }
  const d = decodeE(e);
  if (MAP[e] || MAP[d]) {
    return { title: "Can’t sign in with Strava", body: MAP[e] ?? MAP[d] };
  }
  return { title: "Sign-in error", body: d };
}
