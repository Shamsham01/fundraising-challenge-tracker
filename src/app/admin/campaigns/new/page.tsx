import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewCampaignPage() {
  async function create(formData: FormData) {
    "use server";
    const supa = await createSupabaseServerClient();
    const { data: u } = await supa.auth.getUser();
    if (!u.user || u.user.app_metadata?.role !== "admin") redirect("/auth/admin/login");
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
      .select("id")
      .single();
    if (error) {
      throw new Error(error.message);
    }
    const campId = data!.id as string;
    const list = types
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const t of list) {
      await admin.from("campaign_allowed_activity_types").insert({
        campaign_id: campId,
        strava_sport_type: t,
      });
    }
    await admin.from("audit_logs").insert({
      actor_user_id: u.user.id,
      action: "campaign.create",
      entity: "campaigns",
      entity_id: campId,
      metadata: { slug },
    });
    redirect(`/campaigns/${slug}`);
  }
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-bold">Create campaign</h1>
      <form action={create} className="space-y-3">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required />
        </div>
        <div>
          <Label htmlFor="slug">Slug (url)</Label>
          <Input id="slug" name="slug" required placeholder="spring-5k" />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={4} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="starts">Starts (ISO local)</Label>
            <Input id="starts" name="starts" type="datetime-local" required />
          </div>
          <div>
            <Label htmlFor="ends">Ends</Label>
            <Input id="ends" name="ends" type="datetime-local" required />
          </div>
        </div>
        <div>
          <Label htmlFor="types">Allowed types (comma)</Label>
          <Input id="types" name="types" defaultValue="Run,Walk,Hike" />
        </div>
        <div>
          <Label htmlFor="objective">Objective</Label>
          <Input id="objective" name="objective" defaultValue="total_distance" />
        </div>
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
