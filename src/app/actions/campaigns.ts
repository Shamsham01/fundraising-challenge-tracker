"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recomputeLeaderboard } from "@/lib/strava/activity-pipeline";
import { z } from "zod";

const joinSchema = z.object({ campaignId: z.string().uuid() });

export async function joinCampaign(formData: FormData): Promise<void> {
  const parsed = joinSchema.safeParse({ campaignId: formData.get("campaignId") });
  if (!parsed.success) return;
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return;
  const { error } = await supa.from("campaign_participants").insert({
    campaign_id: parsed.data.campaignId,
    user_id: u.user.id,
  });
  if (error) return;
  await recomputeLeaderboard(parsed.data.campaignId);
  revalidatePath("/dashboard");
  revalidatePath("/campaigns");
}

export async function leaveCampaignFromForm(formData: FormData): Promise<void> {
  const id = String(formData.get("campaignId") ?? "");
  await leaveCampaign(id);
}

export async function leaveCampaign(campaignId: string): Promise<void> {
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return;
  const { error } = await supa
    .from("campaign_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .eq("user_id", u.user.id);
  if (error) return;
  await recomputeLeaderboard(campaignId);
  revalidatePath("/dashboard");
}

export async function setCampaignFeatured(
  campaignId: string,
  isFeatured: boolean,
): Promise<void> {
  const admin = getSupabaseServiceRole();
  const supa = await createSupabaseServerClient();
  const { data: s } = await supa.auth.getUser();
  if (!s.user || s.user.app_metadata?.role !== "admin") {
    return;
  }
  const { error } = await admin
    .from("campaigns")
    .update({ is_featured: isFeatured })
    .eq("id", campaignId);
  if (error) return;
  revalidatePath("/");
  revalidatePath("/admin/campaigns");
}
