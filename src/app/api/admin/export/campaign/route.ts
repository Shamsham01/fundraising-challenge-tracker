import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";

/** CSV export: participants + scores for a campaign. Admin only. */
export async function GET(request: NextRequest) {
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user || u.user.app_metadata?.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const id = request.nextUrl.searchParams.get("campaignId");
  if (!id) {
    return new NextResponse("campaignId required", { status: 400 });
  }
  const admin = getSupabaseServiceRole();
  const { data: rows, error } = await admin
    .from("campaign_participants")
    .select("user_id, cached_score, rank_cached, joined_at, athlete_profiles(display_name, strava_athlete_id)")
    .eq("campaign_id", id)
    .is("left_at", null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const lines = [
    "user_id,display_name,strava_athlete_id,score,rank,joined_at",
    ...(rows ?? []).map((r) => {
      const ap = r.athlete_profiles as
        | { display_name: string; strava_athlete_id: number }
        | { display_name: string; strava_athlete_id: number }[]
        | null;
      const a = Array.isArray(ap) ? ap[0] : ap;
      return [
        r.user_id,
        a?.display_name ?? "",
        a?.strava_athlete_id ?? "",
        r.cached_score,
        r.rank_cached ?? "",
        r.joined_at,
      ]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(",");
    }),
  ];
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="campaign-${id}.csv"`,
    },
  });
}
