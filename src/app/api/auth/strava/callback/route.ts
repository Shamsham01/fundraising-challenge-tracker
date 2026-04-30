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
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LINK_ADMIN_COOKIE = "strava_oauth_link_admin";

function clearStravaOAuthCookies(res: NextResponse) {
  res.cookies.set("strava_oauth_state", "", { maxAge: 0, path: "/" });
  res.cookies.set(LINK_ADMIN_COOKIE, "", { maxAge: 0, path: "/" });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const env = getClientEnv();
  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const err = url.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?e=${encodeURIComponent(err)}`,
        baseUrl,
      ),
    );
  }
  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/error?e=missing_code", baseUrl),
    );
  }
  const cStore = await cookies();
  if (!isStravaMocked()) {
    const expected = cStore.get("strava_oauth_state")?.value;
    if (!state || !expected || state !== expected) {
      return NextResponse.redirect(
        new URL("/auth/error?e=state", baseUrl),
      );
    }
  }

  const linkCookie = cStore.get(LINK_ADMIN_COOKIE)?.value === "1";
  const supaSession = await createSupabaseServerClient();
  const { data: sessionUserData } = await supaSession.auth.getUser();
  const sessionUser = sessionUserData.user;

  if (linkCookie) {
    if (sessionUser?.app_metadata?.role !== "admin") {
      const res = NextResponse.redirect(
        new URL("/auth/error?e=strava_admin_link_session", baseUrl),
      );
      clearStravaOAuthCookies(res);
      return res;
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
        new URL("/auth/error?e=config", baseUrl),
      );
    }
    try {
      const tok = await exchangeAuthorizationCode(code, {
        clientId: serverEnv.STRAVA_CLIENT_ID!,
        clientSecret: serverEnv.STRAVA_CLIENT_SECRET,
        redirectUri: serverEnv.STRAVA_REDIRECT_URI,
      });
      const athlete = (tok as { athlete: { id: number; firstname: string; lastname: string; username: string | null } })
        .athlete;
      accessToken = (tok as { access_token: string }).access_token;
      refreshToken = (tok as { refresh_token: string }).refresh_token;
      expiresIso = new Date(computeExpiresAtSeconds(tok as { expires_in: number; expires_at?: number }) * 1000).toISOString();
      athleteId = athlete.id;
      athleteFirst = athlete.firstname;
      athleteLast = athlete.lastname;
      stravaUsername = athlete.username;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (
        msg.includes("403") ||
        lower.includes("limit of connected athletes") ||
        (lower.includes("athlete") && lower.includes("limit"))
      ) {
        return NextResponse.redirect(
          new URL("/auth/error?e=strava_athlete_limit", baseUrl),
        );
      }
      return NextResponse.redirect(
        new URL(
          `/auth/error?e=${encodeURIComponent(msg.slice(0, 400))}`,
          baseUrl,
        ),
      );
    }
  }

  const supa = getSupabaseServiceRole();
  const displayName = `${athleteFirst} ${athleteLast}`.trim() || "Strava user";

  if (linkCookie && sessionUser?.app_metadata?.role === "admin") {
    const adminUserId = sessionUser.id;

    const { data: existingProf } = await supa
      .from("athlete_profiles")
      .select("user_id")
      .eq("strava_athlete_id", athleteId)
      .maybeSingle();

    if (existingProf?.user_id && existingProf.user_id !== adminUserId) {
      const otherId = existingProf.user_id;
      await supa
        .from("campaigns")
        .update({ manual_winner_user_id: null })
        .eq("manual_winner_user_id", otherId);
      await supa
        .from("campaigns")
        .update({ automatic_winner_user_id: null })
        .eq("automatic_winner_user_id", otherId);
      await supa.from("strava_connections").delete().eq("user_id", otherId);
      await supa.from("athlete_profiles").delete().eq("user_id", otherId);
    }

    const { error: userErr } = await supa.from("users").upsert(
      { id: adminUserId, user_kind: "admin" as const },
      { onConflict: "id" },
    );
    if (userErr) {
      return NextResponse.redirect(
        new URL(
          `/auth/error?e=${encodeURIComponent(userErr.message)}`,
          baseUrl,
        ),
      );
    }

    const { error: stErr } = await supa.from("strava_connections").upsert(
      {
        user_id: adminUserId,
        strava_athlete_id: athleteId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresIso,
        deauthorized_at: null,
      },
      { onConflict: "user_id" },
    );
    if (stErr) {
      return NextResponse.redirect(
        new URL(
          `/auth/error?e=${encodeURIComponent(stErr.message)}`,
          baseUrl,
        ),
      );
    }

    const { error: apErr } = await supa.from("athlete_profiles").upsert(
      {
        user_id: adminUserId,
        strava_athlete_id: athleteId,
        strava_username: stravaUsername,
        display_name: displayName,
      },
      { onConflict: "user_id" },
    );
    if (apErr) {
      return NextResponse.redirect(
        new URL(
          `/auth/error?e=${encodeURIComponent(apErr.message)}`,
          baseUrl,
        ),
      );
    }

    const redirect = NextResponse.redirect(new URL("/dashboard", baseUrl));
    clearStravaOAuthCookies(redirect);
    return redirect;
  }

  const email = participantStravaEmail(athleteId);
  const password = participantDerivedPassword(athleteId);
  const { data: existingByAthlete } = await supa
    .from("athlete_profiles")
    .select("user_id")
    .eq("strava_athlete_id", athleteId)
    .maybeSingle();
  let userId: string;
  if (existingByAthlete?.user_id) {
    userId = existingByAthlete.user_id;
    const { error: uErr } = await supa.auth.admin.updateUserById(userId, {
      password,
      email,
      email_confirm: true,
    });
    if (uErr) {
      return NextResponse.redirect(
        new URL(
          `/auth/error?e=${encodeURIComponent(uErr.message)}`,
          baseUrl,
        ),
      );
    }
  } else {
    const { data: created, error: cErr } = await supa.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "participant" as const },
      user_metadata: { display_name: displayName },
    });
    if (cErr || !created.user) {
      return NextResponse.redirect(
        new URL(
          `/auth/error?e=${encodeURIComponent(cErr?.message ?? "create")}`,
          baseUrl,
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
        baseUrl,
      ),
    );
  }
  const { error: apErr } = await supa.from("athlete_profiles").upsert(
    {
      user_id: userId,
      strava_athlete_id: athleteId,
      strava_username: stravaUsername,
      display_name: displayName,
    },
    { onConflict: "user_id" },
  );
  if (apErr) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?e=${encodeURIComponent(apErr.message)}`,
        baseUrl,
      ),
    );
  }
  const redirect = NextResponse.redirect(
    new URL("/dashboard", baseUrl),
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
        baseUrl,
      ),
    );
  }
  clearStravaOAuthCookies(redirect);
  return redirect;
}
