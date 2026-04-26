import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CampaignObjective } from "@/domain/types";

type ServerSupa = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type LbRow = {
  rank: number;
  displayName: string;
  score: number;
  userId?: string;
  avatarPath?: string | null;
};

export type CampaignPrize = {
  placement: number;
  title: string;
  description: string | null;
};

export type CampaignLeaderboardBundle = {
  rows: LbRow[];
  snapObjective: CampaignObjective;
  computedAt: string | null;
  prizes: CampaignPrize[];
};

async function loadCacheAndPrizes(
  supa: ServerSupa,
  campaignId: string,
  fallbackObjective: string,
): Promise<CampaignLeaderboardBundle> {
  const { data: lb } = await supa
    .from("leaderboards_cache")
    .select("snapshot, computed_at")
    .eq("campaign_id", campaignId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const rawSnap = lb?.snapshot as
    | { rows?: LbRow[]; objective?: CampaignObjective; computed?: string }
    | null;
  const rows = rawSnap?.rows ?? [];
  const snapObjective = (rawSnap?.objective ?? fallbackObjective) as CampaignObjective;
  const { data: prizeRows } = await supa
    .from("campaign_prizes")
    .select("placement, title, description")
    .eq("campaign_id", campaignId)
    .order("placement", { ascending: true });
  const prizes: CampaignPrize[] = (prizeRows ?? []).map((p) => ({
    placement: p.placement as number,
    title: p.title as string,
    description: (p.description as string | null) ?? null,
  }));
  return {
    rows,
    snapObjective,
    computedAt: (lb?.computed_at as string | undefined) ?? null,
    prizes,
  };
}

/** Use when the campaign row is already loaded (avoids an extra lookup). */
export async function getCampaignLeaderboardForCampaignId(
  campaignId: string,
  fallbackObjective: string,
): Promise<CampaignLeaderboardBundle> {
  const supa = await createSupabaseServerClient();
  return loadCacheAndPrizes(supa, campaignId, fallbackObjective);
}

/**
 * Public campaign leaderboard + prizes (for home filter). Returns null if slug not found.
 */
export async function getCampaignLeaderboardBySlug(
  slug: string,
): Promise<{
  campaign: { id: string; title: string; objective: string; slug: string };
} & CampaignLeaderboardBundle | null> {
  const supa = await createSupabaseServerClient();
  const { data: c } = await supa
    .from("campaigns")
    .select("id, title, objective, slug")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!c) {
    return null;
  }
  const bundle = await loadCacheAndPrizes(
    supa,
    c.id as string,
    c.objective as string,
  );
  return {
    campaign: {
      id: c.id as string,
      title: c.title as string,
      objective: c.objective as string,
      slug: c.slug as string,
    },
    ...bundle,
  };
}
