"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const parsed = updateAthlete.safeParse({
    displayName: String(fd.get("displayName") ?? ""),
    bio: String(fd.get("bio") ?? ""),
    location: String(fd.get("location") ?? ""),
    fundraisingPageUrl: fd.get("fundraisingPageUrl"),
  });
  if (!parsed.success) return;
  const touchConsent = rawConsent === "on" ? { consent_data_processing_at: new Date().toISOString() } : {};
  const { error } = await supa
    .from("athlete_profiles")
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio || null,
      location: parsed.data.location || null,
      fundraising_page_url: parsed.data.fundraisingPageUrl ?? null,
      ...touchConsent,
    })
    .eq("user_id", u.user.id);
  if (error) return;
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
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
}
