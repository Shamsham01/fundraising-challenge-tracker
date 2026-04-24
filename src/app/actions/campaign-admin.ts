"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { recomputeLeaderboard } from "@/lib/strava/activity-pipeline";

const uuid = z.string().uuid();

export async function updateCampaignDetails(fd: FormData): Promise<void> {
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user || u.user.app_metadata?.role !== "admin") {
    return;
  }
  const c = z
    .object({
      id: z.string().uuid(),
      title: z.string().min(1).max(200),
      description: z.string().max(20_000).optional(),
      slug: z.string().min(1).max(120),
      isFeatured: z.boolean(),
    })
    .safeParse({
      id: String(fd.get("id") ?? ""),
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      slug: String(fd.get("slug") ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, ""),
      isFeatured: fd.get("isFeatured") === "on",
    });
  if (!c.success) {
    return;
  }
  const admin = getSupabaseServiceRole();
  const { error } = await admin
    .from("campaigns")
    .update({
      title: c.data.title,
      description: c.data.description || null,
      slug: c.data.slug,
      is_featured: c.data.isFeatured,
    })
    .eq("id", c.data.id);
  if (error) {
    return;
  }
  revalidatePath("/");
  revalidatePath("/campaigns");
  revalidatePath(`/admin/campaigns/${c.data.id}/edit`);
  revalidatePath(`/campaigns/${c.data.slug}`);
}

export async function triggerLeaderboardRecompute(campaignId: string): Promise<void> {
  const p = uuid.safeParse(campaignId);
  if (!p.success) {
    return;
  }
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user || u.user.app_metadata?.role !== "admin") {
    return;
  }
  await recomputeLeaderboard(p.data);
  revalidatePath("/");
  revalidatePath("/campaigns");
}
