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

/**
 * Activity must be on or after join, on or before campaign end.
 * If the participant joined before the official challenge start, activities between join and start
 * still count (soft launch / testing). If they joined on or after official start, the window is
 * the same as [campaignStart, campaignEnd] intersected with [joinedAt, ∞).
 */
export function isWithinParticipantCampaignWindow(
  activityStart: Date,
  campaignStart: Date,
  campaignEnd: Date,
  participantJoinedAt: Date,
) {
  if (activityStart < participantJoinedAt || activityStart > campaignEnd) {
    return false;
  }
  if (participantJoinedAt < campaignStart) {
    return true;
  }
  return activityStart >= campaignStart;
}

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  if (!isActivityTypeAllowed(input.activitySportType, input.allowedTypes)) {
    return { ok: false, reason: "activity_type" };
  }
  const windowOk = input.participantJoinedAt
    ? isWithinParticipantCampaignWindow(
        input.activityStart,
        input.campaignStart,
        input.campaignEnd,
        input.participantJoinedAt,
      )
    : isWithinCampaignWindow(
        input.activityStart,
        input.campaignStart,
        input.campaignEnd,
      );
  if (!windowOk) {
    return { ok: false, reason: "timeframe" };
  }
  return { ok: true };
}
