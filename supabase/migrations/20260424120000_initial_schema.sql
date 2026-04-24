-- Fundraising Challenge Tracker — initial schema, RLS, and storage
-- Run with Supabase CLI: supabase db push / apply in SQL editor

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_kind as enum ('participant', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.campaign_objective as enum (
    'total_distance',
    'total_moving_time',
    'total_elevation',
    'activity_count',
    'fundraising_amount'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.campaign_review_mode as enum (
    'auto_approve',
    'manual_review',
    'hybrid'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activity_moderation_status as enum (
    'pending',
    'approved',
    'rejected',
    'flagged'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sync_status as enum (
    'pending',
    'synced',
    'error',
    'skipped'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.webhook_event_status as enum (
    'received',
    'processing',
    'processed',
    'failed',
    'ignored'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sync_job_type as enum (
    'reconciliation',
    'leaderboard_refresh',
    'strava_deauth_cleanup'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sync_job_state as enum (
    'pending',
    'running',
    'completed',
    'failed'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- app_users: one row per auth.users identity; distinguishes participant vs admin
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  user_kind public.user_kind not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Strava connection (sensitive: service-role only; no direct client access)
-- ---------------------------------------------------------------------------
create table if not exists public.strava_connections (
  user_id uuid primary key references public.users (id) on delete cascade,
  strava_athlete_id bigint not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  last_strava_event_at timestamptz,
  last_full_sync_at timestamptz,
  deauthorized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- athlete_profiles: participant display + Strava public identity
-- ---------------------------------------------------------------------------
create table if not exists public.athlete_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  strava_athlete_id bigint not null unique,
  strava_username text,
  display_name text not null,
  email text,
  bio text,
  location text,
  avatar_path text,
  fundraising_page_url text,
  consent_data_processing_at timestamptz,
  consent_marketing_at timestamptz,
  privacy_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- admin_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.admin_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  display_name text not null,
  email text,
  bio text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  description text,
  campaign_image_path text,
  is_public boolean not null default true,
  is_featured boolean not null default false,
  is_archived boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  objective public.campaign_objective not null,
  review_mode public.campaign_review_mode not null default 'hybrid',
  leaderboard_visible boolean not null default true,
  team_mode boolean not null default false,
  manual_winner_user_id uuid references public.athlete_profiles (user_id),
  automatic_winner_user_id uuid references public.athlete_profiles (user_id),
  winner_locked_at timestamptz,
  justgiving_ext_ref text,
  created_by_user_id uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint campaigns_end_after_start check (ends_at > starts_at)
);

create unique index if not exists campaigns_slug_key on public.campaigns (slug) where deleted_at is null;
create index if not exists campaigns_featured_idx on public.campaigns (is_featured) where is_archived = false and deleted_at is null;
create index if not exists campaigns_window_idx on public.campaigns (starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- campaign_allowed_activity_types: Strava sport / activity type names
-- e.g. Run, Walk, Hike, Ride
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_allowed_activity_types (
  id bigserial primary key,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  strava_sport_type text not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, strava_sport_type)
);
create index if not exists campaign_allowed_activity_types_campaign_idx
  on public.campaign_allowed_activity_types (campaign_id);

-- ---------------------------------------------------------------------------
-- campaign_participants
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  cached_score numeric(20, 6) not null default 0,
  rank_cached integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);
create index if not exists campaign_participants_campaign_idx on public.campaign_participants (campaign_id);
create index if not exists campaign_participants_user_idx on public.campaign_participants (user_id);

-- ---------------------------------------------------------------------------
-- activities (Strava)
-- ---------------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  strava_activity_id bigint not null,
  name text,
  sport_type text not null,
  start_date timestamptz not null,
  distance_m numeric(20, 3),
  moving_time_s integer,
  total_elevation_gain_m numeric(20, 2),
  raw_payload jsonb,
  sync_status public.sync_status not null default 'synced',
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, strava_activity_id)
);
create index if not exists activities_user_start_idx on public.activities (user_id, start_date desc);
create index if not exists activities_strava_id_idx on public.activities (strava_activity_id);

-- ---------------------------------------------------------------------------
-- activity_reviews: moderation per (activity, campaign) participation
-- ---------------------------------------------------------------------------
create table if not exists public.activity_reviews (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  status public.activity_moderation_status not null default 'pending',
  reviewed_by_user_id uuid references public.users (id),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, campaign_id)
);
create index if not exists activity_reviews_status_idx
  on public.activity_reviews (campaign_id, status);
create index if not exists activity_reviews_activity_idx on public.activity_reviews (activity_id);

-- ---------------------------------------------------------------------------
-- activity_campaign_matches: eligibility + contributable metrics snapshot
-- ---------------------------------------------------------------------------
create table if not exists public.activity_campaign_matches (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  is_eligible boolean not null,
  ineligible_reason text,
  included_distance_m numeric(20, 3) not null default 0,
  included_moving_time_s integer not null default 0,
  included_elevation_m numeric(20, 2) not null default 0,
  included_activity_count smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, campaign_id)
);
create index if not exists activity_campaign_matches_campaign_idx
  on public.activity_campaign_matches (campaign_id);

-- ---------------------------------------------------------------------------
-- leaderboards_cache
-- ---------------------------------------------------------------------------
create table if not exists public.leaderboards_cache (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  version integer not null default 1,
  snapshot jsonb not null,
  computed_at timestamptz not null default now(),
  unique (campaign_id, version)
);
create index if not exists leaderboards_cache_campaign_computed_idx
  on public.leaderboards_cache (campaign_id, computed_at desc);

-- ---------------------------------------------------------------------------
-- fundraising_pages (JustGiving)
-- ---------------------------------------------------------------------------
create table if not exists public.fundraising_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  provider text not null default 'justgiving',
  external_id text,
  page_url text,
  total_raised_cents bigint,
  currency text,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fundraising_pages_user_idx on public.fundraising_pages (user_id);
create index if not exists fundraising_pages_campaign_idx on public.fundraising_pages (campaign_id);

-- ---------------------------------------------------------------------------
-- teams (future)
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_user_id uuid references public.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity, created_at desc);

-- ---------------------------------------------------------------------------
-- webhook_events (Strava idempotency)
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id bigserial primary key,
  strava_object_id bigint not null,
  strava_object_type text not null,
  strava_aspect_type text,
  strava_owner_id bigint,
  strava_event_time timestamptz,
  subscription_id bigint,
  payload jsonb,
  idempotency_key text not null unique,
  status public.webhook_event_status not null default 'received',
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists webhook_events_strava_object_idx
  on public.webhook_events (strava_object_id, strava_object_type);

-- ---------------------------------------------------------------------------
-- sync_jobs
-- ---------------------------------------------------------------------------
create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type public.sync_job_type not null,
  state public.sync_job_state not null default 'pending',
  related_user_id uuid references public.users (id) on delete set null,
  related_campaign_id uuid references public.campaigns (id) on delete set null,
  payload jsonb,
  result jsonb,
  error text,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sync_jobs_state_idx on public.sync_jobs (state, scheduled_for);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null,
  title text,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create trigger strava_connections_updated before update on public.strava_connections
  for each row execute function public.set_updated_at();
exception when undefined_object or duplicate_object then null; end $$;

do $$ begin
  create trigger athlete_profiles_updated before update on public.athlete_profiles
  for each row execute function public.set_updated_at();
exception when undefined_object or duplicate_object then null; end $$;

do $$ begin
  create trigger admin_profiles_updated before update on public.admin_profiles
  for each row execute function public.set_updated_at();
exception when undefined_object or duplicate_object then null; end $$;

do $$ begin
  create trigger campaigns_updated before update on public.campaigns
  for each row execute function public.set_updated_at();
exception when undefined_object or duplicate_object then null; end $$;

do $$ begin
  create trigger activities_updated before update on public.activities
  for each row execute function public.set_updated_at();
exception when undefined_object or duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helper: is current JWT an admin? Uses app_metadata.role = 'admin' (set by service)
-- Do NOT use user_metadata for authorization.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.athlete_profiles enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_allowed_activity_types enable row level security;
alter table public.campaign_participants enable row level security;
alter table public.activities enable row level security;
alter table public.activity_reviews enable row level security;
alter table public.activity_campaign_matches enable row level security;
alter table public.leaderboards_cache enable row level security;
alter table public.fundraising_pages enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.audit_logs enable row level security;
alter table public.webhook_events enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.notifications enable row level security;
-- strava_connections: no client policies (service only)
alter table public.strava_connections enable row level security;

-- public.users: own row, admins see all
create policy "users_self_select" on public.users
  for select using (id = auth.uid() or public.is_admin());
create policy "users_service_insert" on public.users
  for insert with check (id = auth.uid() or public.is_admin());
-- strava_connections: RLS on with no policies => deny; service role bypasses in API routes

-- athlete_profiles: non-deleted rows readable for public leaderboards; admins can see soft-deleted
create policy "athlete_select" on public.athlete_profiles
  for select using (deleted_at is null or public.is_admin());

create policy "athlete_update_self" on public.athlete_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- admin_profiles: self + admin
create policy "admin_profile_select" on public.admin_profiles
  for select using (user_id = auth.uid() or public.is_admin());
create policy "admin_profile_update" on public.admin_profiles
  for update using (user_id = auth.uid() and public.is_admin());
-- Fix: admin should update their own
drop policy "admin_profile_update" on public.admin_profiles;
create policy "admin_profile_update" on public.admin_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- campaigns: public read list for active
create policy "campaigns_public_read" on public.campaigns
  for select using (deleted_at is null and (is_public = true or public.is_admin()));
create policy "campaigns_admin_write" on public.campaigns
  for all using (public.is_admin()) with check (public.is_admin());

-- campaign_allowed_activity_types
create policy "cat_read" on public.campaign_allowed_activity_types
  for select using (true);
create policy "cat_write" on public.campaign_allowed_activity_types
  for all using (public.is_admin()) with check (public.is_admin());

-- campaign_participants: public read for public campaigns; peers; own row; admin
create policy "cp_read" on public.campaign_participants
  for select using (
    public.is_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.deleted_at is null
        and c.is_public
        and not c.is_archived
    )
    or (
      auth.uid() is not null
      and exists (
        select 1 from public.campaign_participants me
        where me.campaign_id = campaign_participants.campaign_id
          and me.user_id = auth.uid()
          and me.left_at is null
      )
    )
  );

create policy "cp_insert_join" on public.campaign_participants
  for insert with check (user_id = auth.uid());
create policy "cp_update_leave" on public.campaign_participants
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- activities: own
create policy "act_read_own" on public.activities
  for select using (user_id = auth.uid() or public.is_admin());
create policy "act_write_none" on public.activities for insert with check (false);
-- no client insert/updates; server uses service role

-- activity_reviews: participants see own; admins all
create policy "ar_read" on public.activity_reviews
  for select using (
    public.is_admin()
    or exists (select 1 from public.activities a where a.id = activity_id and a.user_id = auth.uid())
  );
create policy "ar_write_admin" on public.activity_reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- activity_campaign_matches: own activity or admin
create policy "acm_read" on public.activity_campaign_matches
  for select using (
    public.is_admin()
    or exists (select 1 from public.activities a where a.id = activity_id and a.user_id = auth.uid())
  );

-- leaderboards: public read
create policy "lb_read" on public.leaderboards_cache for select using (true);

-- fundraising pages
create policy "fp_read_own" on public.fundraising_pages
  for select using (user_id = auth.uid() or public.is_admin());
create policy "fp_upsert_own" on public.fundraising_pages
  for insert with check (user_id = auth.uid());
create policy "fp_update_own" on public.fundraising_pages
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- teams (future, locked down)
create policy "teams_read" on public.teams
  for select using (public.is_admin() or true);
create policy "teams_write" on public.teams
  for all using (public.is_admin()) with check (public.is_admin());

create policy "tm_read" on public.team_memberships
  for select using (true);
create policy "tm_write" on public.team_memberships
  for all using (public.is_admin()) with check (public.is_admin());

-- audit: admin only
create policy "audit_admin" on public.audit_logs
  for select using (public.is_admin());

-- webhooks, sync, notifications: admin or own notifications
create policy "wh_none" on public.webhook_events for select using (false);
create policy "sj_admin" on public.sync_jobs for select using (public.is_admin());
create policy "notif_self" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());
create policy "notif_update_self" on public.notifications
  for update using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage bucket placeholders (create in dashboard or SQL)
-- See README for bucket policy setup; RLS for storage is separate.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('athlete-avatars', 'athlete-avatars', true),
  ('admin-avatars', 'admin-avatars', true),
  ('campaign-images', 'campaign-images', true)
on conflict (id) do nothing;
