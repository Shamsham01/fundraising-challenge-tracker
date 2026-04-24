"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { recomputeActivityForUserCampaigns } from "@/lib/strava/activity-pipeline";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "flagged"]),
});

export async function reviewActivity(fd: FormData): Promise<void> {
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user || u.user.app_metadata?.role !== "admin") {
    return;
  }
  const parsed = schema.safeParse({
    id: String(fd.get("id") ?? ""),
    status: String(fd.get("status") ?? ""),
  });
  if (!parsed.success) return;
  const admin = getSupabaseServiceRole();
  const { data: row } = await admin
    .from("activity_reviews")
    .select("activity_id, campaign_id")
    .eq("id", parsed.data.id)
    .single();
  if (!row) return;
  const { error } = await admin
    .from("activity_reviews")
    .update({
      status: parsed.data.status,
      reviewed_by_user_id: u.user.id,
    })
    .eq("id", parsed.data.id);
  if (error) return;
  await recomputeActivityForUserCampaigns(row.activity_id as string);
  await admin.from("audit_logs").insert({
    actor_user_id: u.user.id,
    action: "activity.review",
    entity: "activity_reviews",
    entity_id: parsed.data.id,
    metadata: { status: parsed.data.status },
  });
  revalidatePath("/admin/moderation");
  revalidatePath("/campaigns");
}
