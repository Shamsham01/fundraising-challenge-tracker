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
  const { data: camp } = await getSupabaseServiceRole()
    .from("campaigns")
    .select("slug")
    .eq("id", p.data)
    .maybeSingle();
  if (camp?.slug) {
    revalidatePath(`/campaigns/${camp.slug as string}`);
  }
}

export type CreateCampaignResult =
  | { ok: true; slug: string; title: string }
  | { ok: false; error: string };

export async function createCampaign(formData: FormData): Promise<CreateCampaignResult> {
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user || u.user.app_metadata?.role !== "admin") {
    return { ok: false, error: "Not authorized" };
  }
  const title = String(formData.get("title") ?? "");
  const slug = String(formData.get("slug") ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
  const description = String(formData.get("description") ?? "");
  const starts = String(formData.get("starts") ?? "");
  const ends = String(formData.get("ends") ?? "");
  const types = String(formData.get("types") ?? "Run,Walk");
  const objective = String(formData.get("objective") ?? "total_distance");
  if (!title || !slug || !starts || !ends) {
    return { ok: false, error: "Title, slug, and dates are required" };
  }
  const admin = getSupabaseServiceRole();
  const { data, error } = await admin
    .from("campaigns")
    .insert({
      title,
      slug,
      description,
      starts_at: starts,
      ends_at: ends,
      objective: objective as "total_distance",
      created_by_user_id: u.user.id,
    })
    .select("id, slug, title")
    .single();
  if (error) {
    return { ok: false, error: error.message };
  }
  const campId = data!.id as string;
  const outSlug = data!.slug as string;
  const outTitle = data!.title as string;
  const list = types
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const t of list) {
    const { error: atErr } = await admin.from("campaign_allowed_activity_types").insert({
      campaign_id: campId,
      strava_sport_type: t,
    });
    if (atErr) {
      return { ok: false, error: atErr.message };
    }
  }
  await admin.from("audit_logs").insert({
    actor_user_id: u.user.id,
    action: "campaign.create",
    entity: "campaigns",
    entity_id: campId,
    metadata: { slug: outSlug },
  });
  revalidatePath("/");
  revalidatePath("/campaigns");
  revalidatePath("/admin/campaigns");
  revalidatePath(`/campaigns/${outSlug}`);
  return { ok: true, slug: outSlug, title: outTitle };
}

export type DeleteCampaignResult = { ok: true } | { ok: false; error: string };

export async function softDeleteCampaign(campaignId: string): Promise<DeleteCampaignResult> {
  const p = uuid.safeParse(campaignId);
  if (!p.success) {
    return { ok: false, error: "Invalid campaign" };
  }
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user || u.user.app_metadata?.role !== "admin") {
    return { ok: false, error: "Not authorized" };
  }
  const admin = getSupabaseServiceRole();
  const { data: c, error: fe } = await admin
    .from("campaigns")
    .select("id, slug, title")
    .eq("id", p.data)
    .is("deleted_at", null)
    .maybeSingle();
  if (fe || !c) {
    return { ok: false, error: fe?.message ?? "Not found" };
  }
  const now = new Date().toISOString();
  const { error } = await admin
    .from("campaigns")
    .update({ deleted_at: now })
    .eq("id", p.data);
  if (error) {
    return { ok: false, error: error.message };
  }
  await admin.from("audit_logs").insert({
    actor_user_id: u.user.id,
    action: "campaign.soft_delete",
    entity: "campaigns",
    entity_id: c.id,
    metadata: { slug: c.slug, title: c.title },
  });
  revalidatePath("/");
  revalidatePath("/campaigns");
  revalidatePath("/admin/campaigns");
  revalidatePath(`/campaigns/${c.slug as string}`);
  return { ok: true };
}

const prizeRowSchema = z.object({
  placement: z.coerce.number().int().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
});

const prizePayloadSchema = z.array(prizeRowSchema);

export async function setCampaignPrizes(formData: FormData): Promise<void> {
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user || u.user.app_metadata?.role !== "admin") {
    return;
  }
  const idParse = z.string().uuid().safeParse(String(formData.get("campaignId") ?? ""));
  if (!idParse.success) {
    return;
  }
  const campaignId = idParse.data;
  let items: z.infer<typeof prizePayloadSchema>;
  try {
    items = prizePayloadSchema.parse(
      JSON.parse(String(formData.get("prizes") ?? "[]")),
    );
  } catch {
    return;
  }
  const byPl = new Map<
    number,
    { title: string; description: string | null }
  >();
  for (const p of items) {
    const desc = p.description?.trim() ? p.description.trim() : null;
    byPl.set(p.placement, { title: p.title.trim(), description: desc });
  }
  const admin = getSupabaseServiceRole();
  const { data: c, error: fe } = await admin
    .from("campaigns")
    .select("slug")
    .eq("id", campaignId)
    .is("deleted_at", null)
    .maybeSingle();
  if (fe || !c) {
    return;
  }
  const { error: delErr } = await admin
    .from("campaign_prizes")
    .delete()
    .eq("campaign_id", campaignId);
  if (delErr) {
    return;
  }
  const rows = Array.from(byPl.entries()).map(([placement, v]) => ({
    campaign_id: campaignId,
    placement,
    title: v.title,
    description: v.description,
  }));
  if (rows.length) {
    const { error: insErr } = await admin.from("campaign_prizes").insert(rows);
    if (insErr) {
      return;
    }
  }
  const slug = c.slug as string;
  revalidatePath("/");
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${slug}`);
  revalidatePath(`/admin/campaigns/${campaignId}/edit`);
}
