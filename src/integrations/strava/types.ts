export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // seconds epoch from Strava, or we compute from expires_in
  expires_in: number;
  athlete: StravaAthlete;
}

export interface StravaAthlete {
  id: number;
  username: string | null;
  firstname: string;
  lastname: string;
  profile?: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string; // ISO
}

export interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id: number;
  event_time: number; // seconds
  updates?: Record<string, unknown>;
}
