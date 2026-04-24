"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { z } from "zod";

const pathZ = z.string().min(1).max(500);

export async function saveAthleteAvatarPath(storagePath: string): Promise<void> {
  const p = pathZ.safeParse(storagePath);
  if (!p.success) {
    return;
  }
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) {
    return;
  }
  const { data: existing } = await supa
    .from("athlete_profiles")
    .select("avatar_path")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (existing?.avatar_path && existing.avatar_path !== p.data) {
    const s = getSupabaseServiceRole();
    await s.storage
      .from("athlete-avatars")
      .remove([existing.avatar_path as string]);
  }
  const { error } = await supa
    .from("athlete_profiles")
    .update({ avatar_path: p.data })
    .eq("user_id", u.user.id);
  if (error) {
    return;
  }
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
}

export async function clearAthleteAvatar(): Promise<void> {
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) {
    return;
  }
  const { data: existing } = await supa
    .from("athlete_profiles")
    .select("avatar_path")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (existing?.avatar_path) {
    const s = getSupabaseServiceRole();
    await s.storage
      .from("athlete-avatars")
      .remove([existing.avatar_path as string]);
  }
  await supa
    .from("athlete_profiles")
    .update({ avatar_path: null })
    .eq("user_id", u.user.id);
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
}

export async function saveAdminAvatarPath(storagePath: string): Promise<void> {
  const p = pathZ.safeParse(storagePath);
  if (!p.success) {
    return;
  }
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user || u.user.app_metadata?.role !== "admin") {
    return;
  }
  const s = getSupabaseServiceRole();
  const { data: existing } = await s
    .from("admin_profiles")
    .select("avatar_path")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (existing?.avatar_path && existing.avatar_path !== p.data) {
    await s.storage.from("admin-avatars").remove([existing.avatar_path as string]);
  }
  const { data: cur } = await s
    .from("admin_profiles")
    .select("display_name")
    .eq("user_id", u.user.id)
    .maybeSingle();
  await s.from("admin_profiles").upsert(
    {
      user_id: u.user.id,
      display_name: (cur?.display_name as string) || "Admin",
      avatar_path: p.data,
    },
    { onConflict: "user_id" },
  );
  revalidatePath("/admin");
  revalidatePath("/admin/profile");
}

const uuid = z.string().uuid();

export async function saveCampaignImagePath(
  campaignId: string,
  storagePath: string | null,
): Promise<void> {
  const c = uuid.safeParse(campaignId);
  if (!c.success) {
    return;
  }
  let p: { success: true; data: string | null } | { success: false };
  if (storagePath === null) {
    p = { success: true, data: null };
  } else {
    const x = pathZ.safeParse(storagePath);
    p = x.success ? { success: true, data: x.data } : { success: false };
  }
  if (!p.success) {
    return;
  }
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user || u.user.app_metadata?.role !== "admin") {
    return;
  }
  const admin = getSupabaseServiceRole();
  const { data: row } = await admin
    .from("campaigns")
    .select("campaign_image_path")
    .eq("id", c.data)
    .single();
  const oldPath = row?.campaign_image_path as string | null;
  if (p.data && oldPath && oldPath !== p.data) {
    await admin.storage.from("campaign-images").remove([oldPath]);
  }
  if (p.data === null && oldPath) {
    await admin.storage.from("campaign-images").remove([oldPath]);
  }
  await admin
    .from("campaigns")
    .update({ campaign_image_path: p.data })
    .eq("id", c.data);
  revalidatePath("/");
  revalidatePath("/campaigns");
  revalidatePath(`/admin/campaigns/${c.data}/edit`);
}

export async function clearCampaignImage(campaignId: string): Promise<void> {
  return saveCampaignImagePath(campaignId, null);
}
