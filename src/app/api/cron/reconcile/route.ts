import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { listRecentActivities } from "@/integrations/strava/client";
import { ensureStravaAccessToken, fetchAndUpsertStravaActivity, recomputeActivityForUserCampaigns } from "@/lib/strava/activity-pipeline";
import { isStravaMocked } from "@/lib/env";

/**
 * Scheduled reconciliation: backfill recent Strava activities per connected user.
 * Netlify: configure scheduled function to GET this URL with CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const e = getServerEnv();
  if (!e.CRON_SECRET || secret !== e.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const supa = getSupabaseServiceRole();
  const { data: conns } = await supa.from("strava_connections").select("user_id").is("deauthorized_at", null);
  let n = 0;
  for (const c of conns ?? []) {
    const uid = c.user_id as string;
    const token = await ensureStravaAccessToken(uid);
    if (!token.access) continue;
    const acts = isStravaMocked()
      ? await (await import("@/integrations/strava/mock")).mockStrava.listAthleteActivities()
      : await listRecentActivities(token.access, 50, 1);
    for (const a of acts) {
      try {
        const r = await fetchAndUpsertStravaActivity(uid, a.id);
        if (r.kind === "upsert") {
          await recomputeActivityForUserCampaigns(r.activityId);
        }
        n++;
      } catch {
        // continue
      }
    }
    await new Promise((r) => {
      setTimeout(
        r,
        Number(process.env.STRAVA_CRON_INTER_USER_MS ?? "200"),
      );
    });
  }
  await supa.from("sync_jobs").insert({
    job_type: "reconciliation",
    state: "completed",
    result: { activities_touched: n } as object,
  });
  return NextResponse.json({ ok: true, activities_touched: n });
}
