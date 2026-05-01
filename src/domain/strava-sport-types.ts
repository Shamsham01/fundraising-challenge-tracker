/**
 * Strava SportType enumeration (preferred over deprecated Activity.type).
 * @see https://developers.strava.com/docs/reference/#api-models-SummaryActivity
 */
export const STRAVA_SPORT_TYPES = [
  "AlpineSki",
  "BackcountrySki",
  "Badminton",
  "Basketball",
  "Canoeing",
  "Cricket",
  "Crossfit",
  "Dance",
  "EBikeRide",
  "Elliptical",
  "EMountainBikeRide",
  "Golf",
  "GravelRide",
  "Handcycle",
  "HighIntensityIntervalTraining",
  "Hike",
  "IceSkate",
  "InlineSkate",
  "Kayaking",
  "Kitesurf",
  "MountainBikeRide",
  "NordicSki",
  "Padel",
  "PhysicalTherapy",
  "Pickleball",
  "Pilates",
  "Racquetball",
  "Ride",
  "RockClimbing",
  "RollerSki",
  "Rowing",
  "Run",
  "Sail",
  "Skateboard",
  "Snowboard",
  "Snowshoe",
  "Soccer",
  "Squash",
  "StairStepper",
  "StandUpPaddling",
  "Surfing",
  "Swim",
  "TableTennis",
  "Tennis",
  "TrailRun",
  "Velomobile",
  "VirtualRide",
  "VirtualRow",
  "VirtualRun",
  "Volleyball",
  "Walk",
  "WeightTraining",
  "Wheelchair",
  "Windsurf",
  "Workout",
  "Yoga",
] as const;

export type StravaSportType = (typeof STRAVA_SPORT_TYPES)[number];

export const STRAVA_SPORT_TYPE_SET = new Set<string>(STRAVA_SPORT_TYPES);

/** Presets merge into the current selection when clicked. */
export const STRAVA_ACTIVITY_TYPE_PRESETS = [
  {
    id: "running",
    label: "Running",
    types: ["Run", "TrailRun", "VirtualRun"] as const,
  },
  {
    id: "walk_hike",
    label: "Walk / hike",
    types: ["Walk", "Hike"] as const,
  },
  {
    id: "cycling",
    label: "Cycling",
    types: [
      "Ride",
      "VirtualRide",
      "EBikeRide",
      "EMountainBikeRide",
      "GravelRide",
      "MountainBikeRide",
      "Velomobile",
      "Handcycle",
    ] as const,
  },
  {
    id: "swim_row",
    label: "Swim / row",
    types: ["Swim", "Rowing", "VirtualRow"] as const,
  },
] as const;

export function isAllowedStravaSportTypeKey(v: unknown): v is string {
  return typeof v === "string" && STRAVA_SPORT_TYPE_SET.has(v);
}

/** Parse JSON array from form body; dedupe; keep only known Strava SportType strings. */
export function parseCampaignActivityTypesPayload(raw: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out = new Set<string>();
    for (const x of parsed) {
      if (isAllowedStravaSportTypeKey(x)) out.add(x);
    }
    return [...out];
  } catch {
    return [];
  }
}

/** Map DB values onto canonical SportType casing (Strava uploads are PascalCase). */
export function canonicalizeStoredSportTypes(fromDb: string[]): string[] {
  const out = new Set<string>();
  for (const raw of fromDb) {
    const hit = STRAVA_SPORT_TYPES.find(
      (t) => t.toLowerCase() === raw.trim().toLowerCase(),
    );
    if (hit) out.add(hit);
  }
  return [...out];
}
