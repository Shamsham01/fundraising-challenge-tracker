import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { evaluateEligibility } from "@/domain/eligibility";
import { initialModerationStatus } from "@/domain/moderation";
import { scoreFromActivity } from "@/domain/objectives";
import type { CampaignObjective, ModerationStatus } from "@/domain/types";
import {
  getActivityOrNull,
  deauthorizeStravaAtSource,
} from "@/integrations/strava/client";
import { getServerEnv, type ServerEnv } from "@/lib/env";
import { refreshAccessToken, computeExpiresAtSeconds } from "@/integrations/strava/client";
import { buildLeaderboard, selectAutomaticWinner } from "@/domain/leaderboard";
import { isStravaMocked } from "@/lib/env";
import { mockStrava } from "@/integrations/strava/mock";

type ReviewMode = "auto_approve" | "manual_review" | "hybrid";

function creds() {
  const e = getServerEnv() as ServerEnv;
  if (isStravaMocked() || e.STRAVA_OAUTH_MOCK === "1") {
    return null;
  }
  if (!e.STRAVA_CLIENT_ID || !e.STRAVA_CLIENT_SECRET) {
    throw new Error("Strava app credentials are not configured.");
  }
  return {
    clientId: e.STRAVA_CLIENT_ID,
    clientSecret: e.STRAVA_CLIENT_SECRET,
  };
}

export async function ensureStravaAccessToken(userId: string) {
  const supa = getSupabaseServiceRole();
  const { data: sc } = await supa
    .from("strava_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!sc) return { access: null, error: "no_strava" as const };
  const c = creds();
  if (!c) {
    if (isStravaMocked()) {
      return { access: (sc as { access_token: string }).access_token, expiresAt: new Date() };
    }
  }
  const expires = new Date((sc as { expires_at: string }).expires_at).getTime();
  if (Date.now() < expires - 60_000) {
    return { access: (sc as { access_token: string }).access_token };
  }
  if (!c) return { access: (sc as { access_token: string }).access_token };
  const r = await refreshAccessToken(
    (sc as { refresh_token: string }).refresh_token,
    c,
  );
  const expiresAt = new Date(computeExpiresAtSeconds(r) * 1000).toISOString();
  const { error } = await supa
    .from("strava_connections")
    .update({
      access_token: r.access_token,
      refresh_token: r.refresh_token,
      expires_at: expiresAt,
    })
    .eq("user_id", userId);
  if (error) throw error;
  return { access: r.access_token, expiresAt: new Date(expiresAt) };
}

export async function removeActivityByStravaId(
  userId: string,
  stravaActivityId: number,
) {
  const supa = getSupabaseServiceRole();
  const { data: act } = await supa
    .from("activities")
    .select("id")
    .eq("user_id", userId)
    .eq("strava_activity_id", stravaActivityId)
    .maybeSingle();
  if (!act) return { kind: "absent" as const };
  const { data: revs } = await supa
    .from("activity_reviews")
    .select("campaign_id")
    .eq("activity_id", act.id);
  await supa.from("activities").delete().eq("id", act.id);
  for (const c of revs ?? []) {
    await recomputeLeaderboard(c.campaign_id as string);
  }
  return { kind: "removed" as const, activityId: act.id as string };
}

/**
 * When Strava revokes the athlete, clear connection + tokens and mark deauth time.
 */
export async function markStravaDeauthorized(athleteStravaId: number) {
  const supa = getSupabaseServiceRole();
  const { data: ap } = await supa
    .from("athlete_profiles")
    .select("user_id")
    .eq("strava_athlete_id", athleteStravaId)
    .maybeSingle();
  if (!ap?.user_id) return;
  const uid = ap.user_id as string;
  const { data: sc } = await supa
    .from("strava_connections")
    .select("access_token")
    .eq("user_id", uid)
    .maybeSingle();
  if (isStravaMocked()) {
    /* skip remote revoke */
  } else if (sc?.access_token) {
    try {
      await deauthorizeStravaAtSource(sc.access_token as string);
    } catch {
      // still clear local
    }
  }
  await supa
    .from("strava_connections")
    .update({
      access_token: "",
      refresh_token: "",
      deauthorized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid);
  await supa.from("sync_jobs").insert({
    job_type: "strava_deauth_cleanup",
    state: "completed",
    related_user_id: uid,
    result: { reason: "webhook" } as object,
  });
}

export async function fetchAndUpsertStravaActivity(userId: string, stravaActivityId: number) {
  const token = await ensureStravaAccessToken(userId);
  if (!token.access) throw new Error("No token");
  const a = isStravaMocked()
    ? await mockStrava.getActivity(stravaActivityId)
    : await getActivityOrNull(stravaActivityId, token.access);
  if (!a) {
    return await removeActivityByStravaId(userId, stravaActivityId);
  }
  const supa = getSupabaseServiceRole();
  const { data: act, error } = await supa
    .from("activities")
    .upsert(
      {
        user_id: userId,
        strava_activity_id: a.id,
        name: a.name,
        sport_type: a.type,
        start_date: a.start_date,
        distance_m: a.distance,
        moving_time_s: a.moving_time,
        total_elevation_gain_m: a.total_elevation_gain,
        raw_payload: a as object,
        sync_status: "synced",
        last_error: null,
      },
      { onConflict: "user_id,strava_activity_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return { kind: "upsert" as const, activityId: act!.id, activity: a };
}

export async function recomputeActivityForUserCampaigns(activityUuid: string) {
  const supa = getSupabaseServiceRole();
  const { data: act } = await supa
    .from("activities")
    .select("id, user_id, sport_type, start_date, distance_m, moving_time_s, total_elevation_gain_m")
    .eq("id", activityUuid)
    .single();
  if (!act) return;
  const { data: cps } = await supa
    .from("campaign_participants")
    .select("campaign_id, joined_at, campaigns!inner(id, starts_at, ends_at, objective, review_mode, deleted_at, is_archived)")
    .eq("user_id", act.user_id)
    .is("left_at", null);
  for (const row of cps ?? []) {
    const raw = (row as { campaigns: Record<string, unknown> | Record<string, unknown>[] }).campaigns;
    const c = Array.isArray(raw) ? raw[0] : raw;
    if (!c) continue;
    if (c.is_archived) continue;
    if (c.deleted_at) continue;
    const { data: types } = await supa
      .from("campaign_allowed_activity_types")
      .select("strava_sport_type")
      .eq("campaign_id", row.campaign_id);
    const allowed = (types ?? []).map((t) => t.strava_sport_type);
    const elig = evaluateEligibility({
      activityStart: new Date(act.start_date as string),
      campaignStart: new Date(c.starts_at as string),
      campaignEnd: new Date(c.ends_at as string),
      activitySportType: act.sport_type as string,
      allowedTypes: allowed,
    });
    const { data: existingRev } = await supa
      .from("activity_reviews")
      .select("status")
      .eq("activity_id", act.id)
      .eq("campaign_id", row.campaign_id)
      .maybeSingle();
    const locked = existingRev?.status as string | undefined;
    const mod =
      locked && ["approved", "rejected", "flagged"].includes(locked)
        ? (locked as ModerationStatus)
        : initialModerationStatus(c.review_mode as ReviewMode, elig.ok);
    const statusForTotals =
      mod === "approved" && elig.ok
        ? "approved"
        : mod === "rejected" || !elig.ok
          ? "rejected"
          : "pending";
    const objective = c.objective as CampaignObjective;
    const included =
      statusForTotals === "approved" && elig.ok
        ? {
            dist: act.distance_m ?? 0,
            time: act.moving_time_s ?? 0,
            elev: act.total_elevation_gain_m ?? 0,
            count: 1,
          }
        : { dist: 0, time: 0, elev: 0, count: 0 };
    await supa.from("activity_reviews").upsert(
      {
        activity_id: act.id,
        campaign_id: row.campaign_id,
        status: mod,
        review_notes: elig.ok ? null : elig.reason ?? null,
      },
      { onConflict: "activity_id,campaign_id" },
    );
    await supa.from("activity_campaign_matches").upsert(
      {
        activity_id: act.id,
        campaign_id: row.campaign_id,
        is_eligible: elig.ok,
        ineligible_reason: elig.ok ? null : elig.reason,
        included_distance_m: included.dist,
        included_moving_time_s: included.time,
        included_elevation_m: included.elev,
        included_activity_count: statusForTotals === "approved" ? 1 : 0,
      },
      { onConflict: "activity_id,campaign_id" },
    );
    void objective;
  }
  await refreshLeaderboardForActivityUsers(activityUuid);
}

async function refreshLeaderboardForActivityUsers(activityUuid: string) {
  const supa = getSupabaseServiceRole();
  const { data: act } = await supa
    .from("activities")
    .select("user_id, id")
    .eq("id", activityUuid)
    .single();
  if (!act) return;
  const { data: camps } = await supa
    .from("activity_reviews")
    .select("campaign_id")
    .eq("activity_id", act.id);
  for (const c of camps ?? []) {
    await recomputeLeaderboard(c.campaign_id);
  }
}

export async function recomputeLeaderboard(campaignId: string) {
  const supa = getSupabaseServiceRole();
  const { data: camp } = await supa
    .from("campaigns")
    .select("id, objective")
    .eq("id", campaignId)
    .single();
  if (!camp) return;
  const objective = camp.objective as CampaignObjective;
  const { data: parts } = await supa
    .from("campaign_participants")
    .select("user_id, joined_at")
    .eq("campaign_id", campaignId)
    .is("left_at", null);
  if (!parts?.length) return;
  const userIds = parts.map((p) => p.user_id as string);
  const { data: profs } = await supa
    .from("athlete_profiles")
    .select("user_id, display_name, avatar_path")
    .in("user_id", userIds);
  const profById = Object.fromEntries(
    (profs ?? []).map((p) => [p.user_id as string, p]),
  );
  const byUser: Record<
    string,
    { score: number; joined: Date; name: string; avatar?: string | null }
  > = {};
  for (const p of parts) {
    const r = profById[p.user_id as string] as
      | { display_name: string; avatar_path: string | null }
      | undefined;
    byUser[p.user_id as string] = {
      score: 0,
      joined: new Date(p.joined_at as string),
      name: r?.display_name ?? "Participant",
      avatar: r?.avatar_path,
    };
  }
  const { data: reviews } = await supa
    .from("activity_reviews")
    .select("activity_id")
    .eq("campaign_id", campaignId)
    .eq("status", "approved");
  const approvedIds = (reviews ?? []).map((r) => r.activity_id as string);
  if (approvedIds.length) {
    const { data: acms } = await supa
      .from("activity_campaign_matches")
      .select(
        "activity_id, included_distance_m, included_moving_time_s, included_elevation_m, included_activity_count",
      )
      .eq("campaign_id", campaignId)
      .in("activity_id", approvedIds);
    const { data: acts } = await supa
      .from("activities")
      .select("id, user_id")
      .in("id", approvedIds);
    const actUser = Object.fromEntries(
      (acts ?? []).map((a) => [a.id as string, a.user_id as string]),
    );
    for (const acm of acms ?? []) {
      const aid = acm.activity_id as string;
      const uid = actUser[aid];
      if (!uid || !byUser[uid]) continue;
      byUser[uid]!.score += scoreFromActivity(objective, {
        distanceM: Number(acm.included_distance_m) || 0,
        movingTimeS: (acm.included_moving_time_s as number) || 0,
        elevationM: Number(acm.included_elevation_m) || 0,
        activityCount: ((acm.included_activity_count as number) || 0) as 0 | 1,
      });
    }
  }
  const entries = Object.entries(byUser).map(([userId, v]) => ({
    userId,
    displayName: v.name,
    score: v.score,
    joinedAt: v.joined,
    avatarPath: v.avatar,
  }));
  const lb = buildLeaderboard(entries, objective);
  const win = selectAutomaticWinner(lb);
  const version = Math.floor(Math.random() * 2_147_000_000);
  await supa.from("leaderboards_cache").insert({
    campaign_id: campaignId,
    version,
    snapshot: { rows: lb, objective, computed: new Date().toISOString() } as object,
  });
  for (const row of lb) {
    await supa
      .from("campaign_participants")
      .update({ rank_cached: row.rank, cached_score: row.score })
      .eq("campaign_id", campaignId)
      .eq("user_id", row.userId);
  }
  if (win) {
    await supa
      .from("campaigns")
      .update({ automatic_winner_user_id: win.userId })
      .eq("id", campaignId);
  }
}
