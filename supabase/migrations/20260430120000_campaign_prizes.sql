-- Prizes per challenge (placement = leaderboard rank: 1 = 1st, 2 = 2nd, …)
create table if not exists public.campaign_prizes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  placement int not null check (placement >= 1),
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (campaign_id, placement)
);

create index if not exists campaign_prizes_campaign_idx on public.campaign_prizes (campaign_id);

alter table public.campaign_prizes enable row level security;

create policy "campaign_prizes_public_read" on public.campaign_prizes
  for select using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_prizes.campaign_id
        and c.deleted_at is null
        and c.is_public = true
    )
  );

create policy "campaign_prizes_admin_write" on public.campaign_prizes
  for all using (public.is_admin()) with check (public.is_admin());
