import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("https://example.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("dev-anon-key-placeholder"),
  NEXT_PUBLIC_STRAVA_OAUTH_MOCK: z.enum(["0", "1"]).optional(),
  NEXT_PUBLIC_JUSTGIVING_ENABLED: z.enum(["0", "1"]).optional(),
  NEXT_PUBLIC_FEATURE_TEAM_CAMPAIGNS: z.enum(["0", "1"]).optional(),
});

const serverSchema = clientSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  STRAVA_OAUTH_DERIVE_SECRET: z.string().min(32).optional(),
  STRAVA_PARTICIPANT_EMAIL_DOMAIN: z.string().min(3).optional(),
  STRAVA_CLIENT_ID: z.string().optional(),
  STRAVA_CLIENT_SECRET: z.string().optional(),
  STRAVA_REDIRECT_URI: z.string().url().optional(),
  STRAVA_WEBHOOK_CALLBACK_URL: z.string().url().optional(),
  STRAVA_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  STRAVA_OAUTH_MOCK: z.enum(["0", "1"]).optional(),
  CRON_SECRET: z.string().min(8).optional(),
  JUSTGIVING_ENABLED: z.enum(["0", "1"]).optional(),
  JUSTGIVING_API_KEY: z.string().optional(),
  JUSTGIVING_BASE_URL: z.string().url().optional(),
  STRAVA_WEBHOOK_HMAC_SECRET: z.string().optional(),
  STRAVA_CRON_INTER_USER_MS: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

export function getClientEnv(): ClientEnv {
  return clientSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRAVA_OAUTH_MOCK: process.env.NEXT_PUBLIC_STRAVA_OAUTH_MOCK,
    NEXT_PUBLIC_JUSTGIVING_ENABLED: process.env.NEXT_PUBLIC_JUSTGIVING_ENABLED,
    NEXT_PUBLIC_FEATURE_TEAM_CAMPAIGNS: process.env.NEXT_PUBLIC_FEATURE_TEAM_CAMPAIGNS,
  });
}

export function getServerEnv(): ServerEnv {
  return serverSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRAVA_OAUTH_MOCK: process.env.NEXT_PUBLIC_STRAVA_OAUTH_MOCK,
    NEXT_PUBLIC_JUSTGIVING_ENABLED: process.env.NEXT_PUBLIC_JUSTGIVING_ENABLED,
    NEXT_PUBLIC_FEATURE_TEAM_CAMPAIGNS: process.env.NEXT_PUBLIC_FEATURE_TEAM_CAMPAIGNS,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRAVA_OAUTH_DERIVE_SECRET: process.env.STRAVA_OAUTH_DERIVE_SECRET,
    STRAVA_PARTICIPANT_EMAIL_DOMAIN: process.env.STRAVA_PARTICIPANT_EMAIL_DOMAIN,
    STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
    STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
    STRAVA_REDIRECT_URI: process.env.STRAVA_REDIRECT_URI,
    STRAVA_WEBHOOK_CALLBACK_URL: process.env.STRAVA_WEBHOOK_CALLBACK_URL,
    STRAVA_WEBHOOK_VERIFY_TOKEN: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN,
    STRAVA_OAUTH_MOCK: process.env.STRAVA_OAUTH_MOCK,
    CRON_SECRET: process.env.CRON_SECRET,
    JUSTGIVING_ENABLED: process.env.JUSTGIVING_ENABLED,
    JUSTGIVING_API_KEY: process.env.JUSTGIVING_API_KEY,
    JUSTGIVING_BASE_URL: process.env.JUSTGIVING_BASE_URL,
    STRAVA_WEBHOOK_HMAC_SECRET: process.env.STRAVA_WEBHOOK_HMAC_SECRET,
    STRAVA_CRON_INTER_USER_MS: process.env.STRAVA_CRON_INTER_USER_MS,
  });
}

export function isStravaMocked(): boolean {
  return (
    process.env.NEXT_PUBLIC_STRAVA_OAUTH_MOCK === "1" ||
    process.env.STRAVA_OAUTH_MOCK === "1"
  );
}

export function isJustGivingEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_JUSTGIVING_ENABLED === "1";
}

export function isJustGivingEnabledServer(): boolean {
  return (
    process.env.JUSTGIVING_ENABLED === "1" && !!process.env.JUSTGIVING_API_KEY
  );
}
