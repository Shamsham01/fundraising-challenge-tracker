import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { buildStravaAuthUrl } from "@/integrations/strava/client";
import { getServerEnv, isStravaMocked } from "@/lib/env";

export async function GET() {
  if (isStravaMocked()) {
    return NextResponse.redirect(
      new URL(
        "/api/auth/strava/callback?code=mock&state=dev",
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      ),
    );
  }
  const e = getServerEnv();
  if (!e.STRAVA_CLIENT_ID || !e.STRAVA_REDIRECT_URI) {
    return new NextResponse(
      "Strava is not configured. Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI or enable NEXT_PUBLIC_STRAVA_OAUTH_MOCK=1 for local dev.",
      { status: 503 },
    );
  }
  const state = randomBytes(16).toString("hex");
  const url = buildStravaAuthUrl(
    e.STRAVA_REDIRECT_URI,
    state,
    e.STRAVA_CLIENT_ID,
  );
  const res = NextResponse.redirect(url);
  res.cookies.set("strava_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
