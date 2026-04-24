import { SiteHeader } from "@/components/site-header";
import { CampaignCard } from "@/components/campaign-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isJustGivingEnabledClient } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const supa = await createSupabaseServerClient();
  const { data: campaigns } = await supa
    .from("campaigns")
    .select("id, title, slug, description, campaign_image_path, starts_at, ends_at, is_featured")
    .eq("is_public", true)
    .is("deleted_at", null)
    .eq("is_archived", false)
    .order("is_featured", { ascending: false })
    .order("starts_at", { ascending: true });
  const { count: partCount } = await supa
    .from("campaign_participants")
    .select("id", { count: "exact", head: true })
    .is("left_at", null);
  const { data: aggs } = await supa
    .from("activity_campaign_matches")
    .select("included_distance_m")
    .eq("is_eligible", true);
  const totalKm =
    (aggs ?? []).reduce((s, r) => s + (Number(r.included_distance_m) || 0), 0) / 1000;
  const jg = isJustGivingEnabledClient();
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Public fundraising challenges, powered by Strava
          </h1>
          <p className="text-muted-foreground">
            Join a campaign, connect Strava, and have eligible activities count toward the
            leaderboard. Admins can moderate, export data, and pick winners.{" "}
            {jg ? "Donation links via JustGiving are enabled when configured." : ""}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{partCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Distance counted (est.)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalKm.toFixed(1)} km</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Open campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{campaigns?.length ?? 0}</p>
            </CardContent>
          </Card>
        </div>
        <section>
          <h2 className="mb-4 text-xl font-semibold">Campaigns</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(campaigns ?? []).map((c) => (
              <CampaignCard
                key={c.id as string}
                title={c.title as string}
                slug={c.slug as string}
                description={(c.description as string | null) ?? null}
                imagePath={c.campaign_image_path as string | null}
                startsAt={c.starts_at as string}
                endsAt={c.ends_at as string}
                isFeatured={!!c.is_featured}
              />
            ))}
            {!campaigns?.length && (
              <p className="text-sm text-muted-foreground">
                No campaigns yet. Create one in the admin portal after seeding the database.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
