import { describe, expect, it } from "vitest";
import {
  canonicalizeStoredSportTypes,
  parseCampaignActivityTypesPayload,
} from "../strava-sport-types";

describe("parseCampaignActivityTypesPayload", () => {
  it("keeps known SportType keys and dedupes", () => {
    const r = parseCampaignActivityTypesPayload(
      JSON.stringify(["Ride", "Ride", "TrailRun", "NotARealType"]),
    );
    expect(r.sort()).toEqual(["Ride", "TrailRun"]);
  });

  it("returns empty on invalid JSON", () => {
    expect(parseCampaignActivityTypesPayload("")).toEqual([]);
    expect(parseCampaignActivityTypesPayload("{")).toEqual([]);
  });
});

describe("canonicalizeStoredSportTypes", () => {
  it("normalizes casing", () => {
    expect(canonicalizeStoredSportTypes(["ride", " Run "])).toEqual(["Ride", "Run"]);
  });

  it("drops unknown strings", () => {
    expect(canonicalizeStoredSportTypes(["Ride", "not-valid"])).toEqual(["Ride"]);
  });
});
