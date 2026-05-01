"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recomputeLeaderboard } from "@/lib/strava/activity-pipeline";
import { z } from "zod";

const joinSchema = z.object({ campaignId: z.string().uuid() });

export type CampaignMembershipResult = { ok: true } | { ok: false; error: string };

function appUserKindFromJwt(
  appMetadata: { role?: string } | undefined,
): "admin" | "participant" {
  return appMetadata?.role === "admin" ? "admin" : "participant";
}

export async function joinCampaign(formData: FormData): Promise<CampaignMembershipResult> {
  const parsed = joinSchema.safeParse({ campaignId: formData.get("campaignId") });
  if (!parsed.success) {
    return { ok: false, error: "Invalid campaign" };
  }
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) {
    return { ok: false, error: "Not signed in" };
  }

  // Ensure public.users row exists (Strava callback does this for participants; email admins often don’t).
  const svc = getSupabaseServiceRole();
  const { error: userRowErr } = await svc.from("users").upsert(
    { id: u.user.id, user_kind: appUserKindFromJwt(u.user.app_metadata as { role?: string }) },
    { onConflict: "id" },
  );
  if (userRowErr) {
    return { ok: false, error: userRowErr.message ?? "Could not update user" };
  }

  const joinedAt = new Date().toISOString();
  const { error: upErr } = await supa.from("campaign_participants").upsert(
    {
      campaign_id: parsed.data.campaignId,
      user_id: u.user.id,
      left_at: null,
      joined_at: joinedAt,
    },
    { onConflict: "campaign_id,user_id" },
  );
  if (upErr) {
    return { ok: false, error: upErr.message ?? "Could not join campaign" };
  }

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
  return { ok: true };
}

export async function leaveCampaignFromForm(
  formData: FormData,
): Promise<CampaignMembershipResult> {
  const id = String(formData.get("campaignId") ?? "");
  return leaveCampaign(id);
}

export async function leaveCampaign(campaignId: string): Promise<CampaignMembershipResult> {
  if (!z.string().uuid().safeParse(campaignId).success) {
    return { ok: false, error: "Invalid campaign" };
  }
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) {
    return { ok: false, error: "Not signed in" };
  }
  const { error } = await supa
    .from("campaign_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .eq("user_id", u.user.id);
  if (error) {
    return { ok: false, error: error.message ?? "Could not leave campaign" };
  }
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
  return { ok: true };
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
