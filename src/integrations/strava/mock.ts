import type { StravaActivity, StravaAthlete, StravaTokenResponse } from "./types";

const mockAthlete: StravaAthlete = {
  id: 1_000_001,
  username: "mock_athlete",
  firstname: "Mock",
  lastname: "Runner",
  profile: undefined,
};

export const mockStrava = {
  exchangeCode: async (
    _code: string,
  ): Promise<StravaTokenResponse & { expires_at: number }> => {
    const now = Math.floor(Date.now() / 1000);
    return {
      access_token: "mock_access",
      refresh_token: "mock_refresh",
      expires_in: 6 * 3600,
      expires_at: now + 6 * 3600,
      athlete: mockAthlete,
    };
  },
  getActivity: async (id: number): Promise<StravaActivity> => ({
    id,
    name: "Morning Run (mock)",
    distance: 5000,
    moving_time: 1800,
    total_elevation_gain: 50,
    type: "Run",
    start_date: new Date().toISOString(),
  }),
  listAthleteActivities: async (): Promise<StravaActivity[]> => {
    return [
      {
        id: 2_000_001,
        name: "Mock Run",
        distance: 10_000,
        moving_time: 3600,
        total_elevation_gain: 100,
        type: "Run",
        start_date: new Date().toISOString(),
      },
    ];
  },
};
