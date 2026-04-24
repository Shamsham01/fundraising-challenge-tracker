import type { ModerationStatus, ReviewMode } from "./types";

/**
 * initial moderation status for a new (activity, campaign) match.
 * hybrid: auto-approves in MVP+ when eligible (same as auto_approve) — adjust per campaign heuristics later.
 */
export function initialModerationStatus(
  reviewMode: ReviewMode,
  isEligible: boolean,
): ModerationStatus {
  if (!isEligible) return "rejected";
  if (reviewMode === "auto_approve" || reviewMode === "hybrid") return "approved";
  return "pending";
}
