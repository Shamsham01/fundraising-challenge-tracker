"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recomputeLeaderboard } from "@/lib/strava/activity-pipeline";
import { z } from "zod";

const joinSchema = z.object({ campaignId: z.string().uuid() });

function appUserKindFromJwt(
  appMetadata: { role?: string } | undefined,
): "admin" | "participant" {
  return appMetadata?.role === "admin" ? "admin" : "participant";
}

export async function joinCampaign(formData: FormData): Promise<void> {
  const parsed = joinSchema.safeParse({ campaignId: formData.get("campaignId") });
  if (!parsed.success) return;
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return;

  // Ensure public.users row exists (Strava callback does this for participants; email admins often don’t).
  const svc = getSupabaseServiceRole();
  const { error: userRowErr } = await svc.from("users").upsert(
    { id: u.user.id, user_kind: appUserKindFromJwt(u.user.app_metadata as { role?: string }) },
    { onConflict: "id" },
  );
  if (userRowErr) return;

  const { data: existing } = await supa
    .from("campaign_participants")
    .select("id, left_at")
    .eq("campaign_id", parsed.data.campaignId)
    .eq("user_id", u.user.id)
    .maybeSingle();

  let error = null as { message?: string } | null;
  if (existing?.left_at != null) {
    const up = await supa
      .from("campaign_participants")
      .update({ left_at: null, joined_at: new Date().toISOString() })
      .eq("id", existing.id);
    error = up.error;
  } else if (!existing) {
    const ins = await supa.from("campaign_participants").insert({
      campaign_id: parsed.data.campaignId,
      user_id: u.user.id,
    });
    error = ins.error;
  }
  if (error) return;

  await recomputeLeaderboard(parsed.data.campaignId);
  revalidatePath("/dashboard");
  revalidatePath("/campaigns");
  const { data: slugRow } = await svc
    .from("campaigns")
    .select("slug")
    .eq("id", parsed.data.campaignId)
    .maybeSingle();
  if (slugRow?.slug) {
    revalidatePath(`/campaigns/${slugRow.slug as string}`);
  }
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
  revalidatePath("/campaigns");
  const admin = getSupabaseServiceRole();
  const { data: slugRow } = await admin
    .from("campaigns")
    .select("slug")
    .eq("id", campaignId)
    .maybeSingle();
  if (slugRow?.slug) {
    revalidatePath(`/campaigns/${slugRow.slug as string}`);
  }
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
