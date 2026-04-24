import type { CampaignObjective } from "./types";

export function scoreFromActivity(
  objective: CampaignObjective,
  input: {
    distanceM: number;
    movingTimeS: number;
    elevationM: number;
    activityCount: 0 | 1;
  },
): number {
  switch (objective) {
    case "total_distance":
      return input.distanceM;
    case "total_moving_time":
      return input.movingTimeS;
    case "total_elevation":
      return input.elevationM;
    case "activity_count":
      return input.activityCount;
    case "fundraising_amount":
      return 0; // Filled from JustGiving or manual elsewhere
    default:
      return 0;
  }
}

export function compareObjectives(
  a: number,
  b: number,
  objective: CampaignObjective,
) {
  if (objective === "fundraising_amount" || objective === "total_moving_time") {
    if (a !== b) return a > b ? 1 : -1;
    return 0;
  }
  if (a !== b) return a > b ? 1 : -1;
  return 0;
}

export function breakTieByEarlierJoin(joinedA: Date, joinedB: Date) {
  return joinedA.getTime() - joinedB.getTime();
}
