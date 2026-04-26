import type { CampaignObjective } from "@/domain/types";

export function formatLeaderboardCell(objective: CampaignObjective, score: number) {
  switch (objective) {
    case "total_distance":
      return `${(score / 1000).toFixed(2)} km`;
    case "total_moving_time": {
      const s = Math.round(score);
      return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    }
    case "total_elevation":
      return `${score.toFixed(0)} m`;
    case "activity_count":
      return String(Math.round(score));
    default:
      return typeof score === "number" ? score.toFixed(1) : String(score);
  }
}
