import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { CampaignCard } from "@/components/campaign-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewCampaignHighlight } from "@/components/new-campaign-highlight";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const sp = await searchParams;
  const highlightSlug = sp.new ?? null;
  const supa = await createSupabaseServerClient();
  const { data: campaigns } = await supa
    .from("campaigns")
    .select("id, title, slug, description, campaign_image_path, starts_at, ends_at, is_featured")
    .eq("is_public", true)
    .is("deleted_at", null)
    .eq("is_archived", false)
    .order("starts_at", { ascending: true });
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <Suspense fallback={null}>
          <NewCampaignHighlight />
        </Suspense>
        <h1 className="text-2xl font-bold">All campaigns</h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(campaigns ?? []).map((c) => {
            const slug = c.slug as string;
            return (
            <CampaignCard
              key={c.id as string}
              title={c.title as string}
              slug={slug}
              description={(c.description as string | null) ?? null}
              imagePath={c.campaign_image_path as string | null}
              startsAt={c.starts_at as string}
              endsAt={c.ends_at as string}
              isFeatured={!!c.is_featured}
              isHighlight={!!highlightSlug && highlightSlug === slug}
            />
            );
          })}
        </div>
      </main>
    </div>
  );
}
