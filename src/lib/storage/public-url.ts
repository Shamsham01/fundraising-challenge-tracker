import { getClientEnv } from "@/lib/env";

export function athleteAvatarPublicUrl(path: string | null | undefined) {
  if (!path) return null;
  const env = getClientEnv();
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/athlete-avatars/${path}`;
}

export function campaignImagePublicUrl(path: string | null | undefined) {
  if (!path) return null;
  const env = getClientEnv();
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/campaign-images/${path}`;
}

export function adminAvatarPublicUrl(path: string | null | undefined) {
  if (!path) return null;
  const env = getClientEnv();
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/admin-avatars/${path}`;
}
