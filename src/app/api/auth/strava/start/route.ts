import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildStravaAuthUrl } from "@/integrations/strava/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientEnv, getServerEnv, isStravaMocked } from "@/lib/env";

const LINK_ADMIN_COOKIE = "strava_oauth_link_admin";

export async function GET() {
  const env = getClientEnv();
  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (isStravaMocked()) {
    const res = NextResponse.redirect(
      new URL("/api/auth/strava/callback?code=mock&state=dev", baseUrl),
    );
    await setLinkAdminCookieOnResponse(res);
    return res;
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
  await setLinkAdminCookieOnResponse(res);
  return res;
}

/** If the current session is an admin, Strava OAuth will attach tokens to that user instead of signing in as a synthetic participant. */
async function setLinkAdminCookieOnResponse(res: NextResponse) {
  const supa = await createSupabaseServerClient();
  const { data: s } = await supa.auth.getUser();
  if (s.user?.app_metadata?.role === "admin") {
    res.cookies.set(LINK_ADMIN_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  } else {
    res.cookies.set(LINK_ADMIN_COOKIE, "", { maxAge: 0, path: "/" });
  }
}
