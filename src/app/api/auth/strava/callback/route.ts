import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  exchangeAuthorizationCode,
  computeExpiresAtSeconds,
} from "@/integrations/strava/client";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { participantStravaEmail, participantDerivedPassword } from "@/lib/participant-auth";
import { getClientEnv, getServerEnv, isStravaMocked } from "@/lib/env";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const env = getClientEnv();
  const err = url.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?e=${encodeURIComponent(err)}`,
        env.NEXT_PUBLIC_APP_URL,
      ),
    );
  }
  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/error?e=missing_code", env.NEXT_PUBLIC_APP_URL),
    );
  }
  const cStore = await cookies();
  if (!isStravaMocked()) {
    const expected = cStore.get("strava_oauth_state")?.value;
    if (!state || !expected || state !== expected) {
      return NextResponse.redirect(
        new URL("/auth/error?e=state", env.NEXT_PUBLIC_APP_URL),
      );
    }
  }
  const serverEnv = getServerEnv();
  let accessToken: string;
  let refreshToken: string;
  let expiresIso: string;
  let athleteId: number;
  let athleteFirst: string;
  let athleteLast: string;
  let stravaUsername: string | null;
  if (isStravaMocked()) {
    accessToken = "mock_access";
    refreshToken = "mock_refresh";
    expiresIso = new Date(Date.now() + 6 * 3600_000).toISOString();
    athleteId = 1_000_001;
    athleteFirst = "Mock";
    athleteLast = "Athlete";
    stravaUsername = "mock_athlete";
  } else {
    if (!serverEnv.STRAVA_CLIENT_SECRET || !serverEnv.STRAVA_REDIRECT_URI) {
      return NextResponse.redirect(
        new URL("/auth/error?e=config", env.NEXT_PUBLIC_APP_URL),
      );
    }
    const tok = await exchangeAuthorizationCode(code, {
      clientId: serverEnv.STRAVA_CLIENT_ID!,
      clientSecret: serverEnv.STRAVA_CLIENT_SECRET,
      redirectUri: serverEnv.STRAVA_REDIRECT_URI,
    });
    const athlete = (tok as { athlete: { id: number; firstname: string; lastname: string; username: string | null } }).athlete;
    accessToken = (tok as { access_token: string }).access_token;
    refreshToken = (tok as { refresh_token: string }).refresh_token;
    expiresIso = new Date(computeExpiresAtSeconds(tok as { expires_in: number; expires_at?: number }) * 1000).toISOString();
    athleteId = athlete.id;
    athleteFirst = athlete.firstname;
    athleteLast = athlete.lastname;
    stravaUsername = athlete.username;
  }
  const email = participantStravaEmail(athleteId);
  const password = participantDerivedPassword(athleteId);
  const supa = getSupabaseServiceRole();
  const { data: existingProf } = await supa
    .from("athlete_profiles")
    .select("user_id")
    .eq("strava_athlete_id", athleteId)
    .maybeSingle();
  let userId: string;
  if (existingProf?.user_id) {
    userId = existingProf.user_id;
    const { error: uErr } = await supa.auth.admin.updateUserById(userId, {
      password,
      email,
      email_confirm: true,
    });
    if (uErr) {
      return NextResponse.redirect(
        new URL(
          `/auth/error?e=${encodeURIComponent(uErr.message)}`,
          env.NEXT_PUBLIC_APP_URL,
        ),
      );
    }
  } else {
    const { data: created, error: cErr } = await supa.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "participant" as const },
      user_metadata: { display_name: `${athleteFirst} ${athleteLast}`.trim() },
    });
    if (cErr || !created.user) {
      return NextResponse.redirect(
        new URL(
          `/auth/error?e=${encodeURIComponent(cErr?.message ?? "create")}`,
          env.NEXT_PUBLIC_APP_URL,
        ),
      );
    }
    userId = created.user.id;
  }
  await supa.from("users").upsert(
    { id: userId, user_kind: "participant" as const },
    { onConflict: "id" },
  );
  const { error: stErr } = await supa.from("strava_connections").upsert(
    {
      user_id: userId,
      strava_athlete_id: athleteId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresIso,
    },
    { onConflict: "user_id" },
  );
  if (stErr) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?e=${encodeURIComponent(stErr.message)}`,
        env.NEXT_PUBLIC_APP_URL,
      ),
    );
  }
  const { error: apErr } = await supa.from("athlete_profiles").upsert(
    {
      user_id: userId,
      strava_athlete_id: athleteId,
      strava_username: stravaUsername,
      display_name: `${athleteFirst} ${athleteLast}`.trim() || "Strava user",
    },
    { onConflict: "user_id" },
  );
  if (apErr) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?e=${encodeURIComponent(apErr.message)}`,
        env.NEXT_PUBLIC_APP_URL,
      ),
    );
  }
  const redirect = NextResponse.redirect(
    new URL("/dashboard", env.NEXT_PUBLIC_APP_URL),
  );
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cStore.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value, options }) => {
            redirect.cookies.set(name, value, options);
          });
        },
      },
    },
  );
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?e=${encodeURIComponent(signErr.message)}`,
        env.NEXT_PUBLIC_APP_URL,
      ),
    );
  }
  redirect.cookies.set("strava_oauth_state", "", { maxAge: 0, path: "/" });
  return redirect;
}
