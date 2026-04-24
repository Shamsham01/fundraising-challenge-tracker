-- Public read for campaign and avatar images; scoped write for self-service; admin for campaign images.
-- Signed uploads from service role still bypass RLS.

-- public.is_admin() is usable from other schemas
create policy "storage_public_read_athlete_avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'athlete-avatars');

create policy "storage_public_read_admin_avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'admin-avatars');

create policy "storage_public_read_campaign_images"
  on storage.objects for select
  to public
  using (bucket_id = 'campaign-images');

-- Authenticated: manage own subfolder in avatar buckets
create policy "storage_athlete_avatar_own_rw"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'athlete-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'athlete-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "storage_admin_avatar_own_rw"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'admin-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'admin-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Campaign images: only admins
create policy "storage_campaign_images_admin_rw"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'campaign-images'
    and public.is_admin()
  )
  with check (
    bucket_id = 'campaign-images'
    and public.is_admin()
  );
