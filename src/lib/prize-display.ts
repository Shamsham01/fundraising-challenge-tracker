import type { CampaignPrize } from "@/lib/campaign-leaderboard";

export function prizeForRank(
  rank: number,
  prizes: CampaignPrize[],
): CampaignPrize | undefined {
  return prizes.find((p) => p.placement === rank);
}
