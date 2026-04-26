-- Public leaderboard: explicit opt-in; aggregated challenge totals only.
alter table public.athlete_profiles
  add column if not exists consent_public_leaderboard_at timestamptz;

comment on column public.athlete_profiles.consent_public_leaderboard_at is
  'If set, the participant may appear on public leaderboards with display name, avatar, and campaign-derived totals only.';

-- Global distance leaderboard (all approved, eligible match rows; consented users only)
create or replace function public.get_global_distance_leaderboard(p_limit int default 20)
returns table (
  user_id uuid,
  display_name text,
  avatar_path text,
  total_distance_m numeric,
  lb_rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with sums as (
    select a.user_id, sum(m.included_distance_m)::numeric as total
    from public.activity_campaign_matches m
    join public.activities a on a.id = m.activity_id
    join public.activity_reviews r
      on r.activity_id = m.activity_id
     and r.campaign_id = m.campaign_id
     and r.status = 'approved'
    join public.athlete_profiles p on p.user_id = a.user_id
    where p.consent_public_leaderboard_at is not null
      and m.is_eligible = true
      and a.user_id in (
        select ap.user_id from public.athlete_profiles ap
        where ap.deleted_at is null
      )
    group by a.user_id
  ),
  ranked as (
    select
      s.user_id,
      s.total,
      row_number() over (order by s.total desc) as rnk
    from sums s
  )
  select
    r.user_id,
    ap.display_name,
    ap.avatar_path,
    r.total,
    r.rnk
  from ranked r
  join public.athlete_profiles ap on ap.user_id = r.user_id
  where r.rnk <= coalesce(p_limit, 20)
  order by r.rnk
$$;

grant execute on function public.get_global_distance_leaderboard(int) to service_role;
