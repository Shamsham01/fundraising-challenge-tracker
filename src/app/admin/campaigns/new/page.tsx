import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewCampaignForm } from "@/components/new-campaign-form";

export default async function NewCampaignPage() {
  const supa = await createSupabaseServerClient();
  const { data: u } = await supa.auth.getUser();
  if (!u.user || u.user.app_metadata?.role !== "admin") redirect("/auth/admin/login");
  return (
    <div className="mx-auto max-w-lg space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Create challenge</h1>
      <p className="text-sm text-muted-foreground">
        You’ll get a confirmation as soon as the challenge is created, then you’ll be taken to the public
        page.
      </p>
      <div className="pt-2">
        <NewCampaignForm />
      </div>
    </div>
  );
}
