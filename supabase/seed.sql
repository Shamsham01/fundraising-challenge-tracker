-- Dev seed: run in Supabase SQL editor after migrations. Replace UUIDs if needed.
-- Create an admin user in Dashboard → Authentication first, then:

-- 1) public.users
-- insert into public.users (id, user_kind) values ('YOUR_AUTH_USER_UUID', 'admin') on conflict do nothing;
-- 2) admin_profiles
-- insert into public.admin_profiles (user_id, display_name, email) values ('YOUR_AUTH_USER_UUID', 'Local Admin', 'admin@example.com') on conflict do nothing;
-- 3) campaigns
insert into public.campaigns (title, slug, description, starts_at, ends_at, objective, review_mode, is_featured, is_public)
select 'Spring Walk 2026', 'spring-walk-2026', 'Walk, hike, or run for charity.',
  now() - interval '1 day', now() + interval '30 days', 'total_distance', 'auto_approve', true, true
where not exists (select 1 from public.campaigns where slug = 'spring-walk-2026' and deleted_at is null);

-- activity types
insert into public.campaign_allowed_activity_types (campaign_id, strava_sport_type)
select c.id, t.type
from public.campaigns c
cross join (values ('Walk'), ('Hike'), ('Run')) as t(type)
where c.slug = 'spring-walk-2026' and c.deleted_at is null
on conflict (campaign_id, strava_sport_type) do nothing;
