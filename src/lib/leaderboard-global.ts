import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { athleteAvatarPublicUrl } from "@/lib/storage/public-url";

export type GlobalLbRow = {
  rank: number;
  userId: string;
  displayName: string;
  totalDistanceM: number;
  avatarUrl: string | null;
};

/**
 * All-time distance totals from in-app, eligible, approved match rows. Only users
 * with consent_public_leaderboard_at (Supabase function enforces this).
 */
export async function getGlobalDistanceLeaderboard(limit = 20): Promise<GlobalLbRow[]> {
  const admin = getSupabaseServiceRole();
  const { data, error } = await admin.rpc("get_global_distance_leaderboard", {
    p_limit: limit,
  });
  if (error) {
    console.error("get_global_distance_leaderboard", error);
    return [];
  }
  const rows = (data ?? []) as {
    user_id: string;
    display_name: string;
    avatar_path: string | null;
    total_distance_m: string | number;
    lb_rank: string | number;
  }[];
  return rows.map((r) => ({
    rank: Number(r.lb_rank),
    userId: r.user_id,
    displayName: r.display_name,
    totalDistanceM: Number(r.total_distance_m),
    avatarUrl: athleteAvatarPublicUrl(r.avatar_path),
  }));
}
