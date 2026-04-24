import { compareObjectives, breakTieByEarlierJoin } from "./objectives";
import type { CampaignObjective } from "./types";

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  score: number;
  joinedAt: Date;
  avatarPath?: string | null;
  rank: number;
}

/**
 * Ranks by score descending. Tie-break: earlier join time wins.
 */
export function buildLeaderboard(
  entries: {
    userId: string;
    displayName: string;
    score: number;
    joinedAt: Date;
    avatarPath?: string | null;
  }[],
  objective: CampaignObjective,
): LeaderboardRow[] {
  const sorted = [...entries].sort((a, b) => {
    const c = compareObjectives(a.score, b.score, objective);
    if (c !== 0) return -c;
    return breakTieByEarlierJoin(a.joinedAt, b.joinedAt);
  });
  return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
}

export function selectAutomaticWinner(leaderboard: LeaderboardRow[]) {
  if (leaderboard.length === 0) return null;
  return leaderboard[0] ?? null;
}
