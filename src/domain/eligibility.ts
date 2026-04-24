import type { EligibilityInput, EligibilityResult } from "./types";

/** Normalise Strava sport type names for case-insensitive matching. */
function normaliseType(t: string) {
  return t.trim().toLowerCase();
}

export function isActivityTypeAllowed(
  activitySport: string,
  allowed: string[],
) {
  const a = normaliseType(activitySport);
  return allowed.some((x) => normaliseType(x) === a);
}

export function isWithinCampaignWindow(
  activityStart: Date,
  campaignStart: Date,
  campaignEnd: Date,
) {
  return activityStart >= campaignStart && activityStart <= campaignEnd;
}

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  if (!isActivityTypeAllowed(input.activitySportType, input.allowedTypes)) {
    return { ok: false, reason: "activity_type" };
  }
  if (
    !isWithinCampaignWindow(
      input.activityStart,
      input.campaignStart,
      input.campaignEnd,
    )
  ) {
    return { ok: false, reason: "timeframe" };
  }
  return { ok: true };
}
