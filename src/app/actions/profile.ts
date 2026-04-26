"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recomputeLeaderboard } from "@/lib/strava/activity-pipeline";

const updateAthlete = z.object({
  displayName: z.string().min(1).max(120),
  bio: z.string().max(2000).optional(),
  location: z.string().max(200).optional().or(z.literal("")),
  fundraisingPageUrl: z
    .preprocess((v) => (v === "" || v === undefined ? undefined : v), z.string().url().optional()),
});

export async function updateAthleteProfile(fd: FormData): Promise<void> {
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return;
  const rawConsent = String(fd.get("consentDataProcessing") ?? "");
  const rawLeaderboard = String(fd.get("consentPublicLeaderboard") ?? "");
  const parsed = updateAthlete.safeParse({
    displayName: String(fd.get("displayName") ?? ""),
    bio: String(fd.get("bio") ?? ""),
    location: String(fd.get("location") ?? ""),
    fundraisingPageUrl: fd.get("fundraisingPageUrl"),
  });
  if (!parsed.success) return;
  const touchConsent =
    rawConsent === "on" ? { consent_data_processing_at: new Date().toISOString() } : {};
  const touchLb =
    rawLeaderboard === "on"
      ? { consent_public_leaderboard_at: new Date().toISOString() }
      : { consent_public_leaderboard_at: null as string | null };
  const { error } = await supa
    .from("athlete_profiles")
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio || null,
      location: parsed.data.location || null,
      fundraising_page_url: parsed.data.fundraisingPageUrl ?? null,
      ...touchConsent,
      ...touchLb,
    })
    .eq("user_id", u.user.id);
  if (error) return;
  const { data: partRows } = await supa
    .from("campaign_participants")
    .select("campaign_id")
    .eq("user_id", u.user.id)
    .is("left_at", null);
  for (const pr of partRows ?? []) {
    try {
      await recomputeLeaderboard(pr.campaign_id as string);
    } catch {
      // non-fatal
    }
  }
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/campaigns");
  redirect("/settings/profile");
}

const updateAdmin = z.object({
  displayName: z.string().min(1).max(120),
  bio: z.string().max(2000).optional(),
});

export async function updateAdminProfile(fd: FormData): Promise<void> {
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user || u.user.app_metadata?.role !== "admin") return;
  const parsed = updateAdmin.safeParse({
    displayName: String(fd.get("displayName") ?? ""),
    bio: String(fd.get("bio") ?? ""),
  });
  if (!parsed.success) return;
  const { error } = await supa
    .from("admin_profiles")
    .upsert(
      {
        user_id: u.user.id,
        display_name: parsed.data.displayName,
        bio: parsed.data.bio || null,
        email: (u.user as { email?: string }).email ?? null,
      },
      { onConflict: "user_id" },
    );
  if (error) return;
  revalidatePath("/admin");
  revalidatePath("/admin/profile");
  redirect("/admin/profile");
}
