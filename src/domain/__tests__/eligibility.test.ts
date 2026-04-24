import { describe, it, expect } from "vitest";
import { evaluateEligibility, isActivityTypeAllowed } from "../eligibility";

describe("eligibility", () => {
  it("rejects disallowed type", () => {
    const r = evaluateEligibility({
      activityStart: new Date("2025-01-15T10:00:00Z"),
      campaignStart: new Date("2025-01-01T00:00:00Z"),
      campaignEnd: new Date("2025-01-31T23:59:59Z"),
      activitySportType: "Swim",
      allowedTypes: ["Run", "Walk"],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("activity_type");
  });

  it("rejects out of window", () => {
    const r = evaluateEligibility({
      activityStart: new Date("2024-12-01T10:00:00Z"),
      campaignStart: new Date("2025-01-01T00:00:00Z"),
      campaignEnd: new Date("2025-01-31T23:59:59Z"),
      activitySportType: "Run",
      allowedTypes: ["Run"],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("timeframe");
  });

  it("accepts matching type in window (case-insensitive)", () => {
    const r = evaluateEligibility({
      activityStart: new Date("2025-01-10T10:00:00Z"),
      campaignStart: new Date("2025-01-01T00:00:00Z"),
      campaignEnd: new Date("2025-01-31T23:59:59Z"),
      activitySportType: "run",
      allowedTypes: ["Run"],
    });
    expect(r.ok).toBe(true);
  });

  it("isActivityTypeAllowlists aliases", () => {
    expect(isActivityTypeAllowed("VirtualRun", ["Run"])).toBe(false);
    expect(isActivityTypeAllowed("Run", ["Run", "Walk"])).toBe(true);
  });
});
