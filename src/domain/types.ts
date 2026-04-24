export type CampaignObjective =
  | "total_distance"
  | "total_moving_time"
  | "total_elevation"
  | "activity_count"
  | "fundraising_amount";

export type ReviewMode = "auto_approve" | "manual_review" | "hybrid";
export type ModerationStatus = "pending" | "approved" | "rejected" | "flagged";

export interface EligibilityInput {
  activityStart: Date;
  campaignStart: Date;
  campaignEnd: Date;
  activitySportType: string;
  allowedTypes: string[];
}

export interface EligibilityResult {
  ok: boolean;
  reason?: string;
}
