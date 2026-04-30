-- cp_read referenced campaign_participants inside its own USING clause, which re-evaluated
-- cp_read and caused "infinite recursion detected in policy for relation campaign_participants".

create or replace function public.cp_user_is_active_member(p_campaign_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_participants cp
    where cp.campaign_id = p_campaign_id
      and cp.user_id = p_user_id
      and cp.left_at is null
  );
$$;

comment on function public.cp_user_is_active_member(uuid, uuid) is
  'Used by RLS on campaign_participants; SECURITY DEFINER avoids recursive policy evaluation.';

grant execute on function public.cp_user_is_active_member(uuid, uuid) to authenticated;
grant execute on function public.cp_user_is_active_member(uuid, uuid) to anon;

drop policy if exists "cp_read" on public.campaign_participants;

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
      and public.cp_user_is_active_member(campaign_id, auth.uid())
    )
  );
