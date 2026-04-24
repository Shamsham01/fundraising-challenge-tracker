import { notFound } from "next/navigation";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { campaignImagePublicUrl } from "@/lib/storage/public-url";
import { joinCampaign, leaveCampaignFromForm } from "@/app/actions/campaigns";
import { buttonVariants, Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

type Props = { params: Promise<{ slug: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const { slug } = await params;
  const supa = await createSupabaseServerClient();
  const { data: c } = await supa
    .from("campaigns")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!c) notFound();
  const { data: { user } } = await supa.auth.getUser();
  const { data: part } = user
    ? await supa
        .from("campaign_participants")
        .select("id, left_at")
        .eq("campaign_id", c.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const joined = part && !part.left_at;
  const { data: types } = await supa
    .from("campaign_allowed_activity_types")
    .select("strava_sport_type")
    .eq("campaign_id", c.id);
  const { data: lb } = await supa
    .from("leaderboards_cache")
    .select("snapshot, computed_at")
    .eq("campaign_id", c.id)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const rows =
    (lb?.snapshot as { rows?: { rank: number; displayName: string; score: number }[] } | null)
      ?.rows ?? [];
  const cover = campaignImagePublicUrl(c.campaign_image_path as string | null);
  const { count: pcount } = await supa
    .from("campaign_participants")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", c.id)
    .is("left_at", null);
  return (
    <div>
      <SiteHeader />
      <div className="relative aspect-[21/9] w-full max-h-[320px] overflow-hidden bg-slate-100">
        {cover ? (
          <Image src={cover} alt="" fill className="object-cover" priority />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500">
            No campaign image
          </div>
        )}
      </div>
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold">{c.title as string}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(c.starts_at as string), "PPP p")} –{" "}
            {format(new Date(c.ends_at as string), "PPP p")}
          </p>
        </div>
        <p className="whitespace-pre-wrap text-muted-foreground">
          {(c.description as string) || "No description."}
        </p>
        <div className="text-sm text-muted-foreground">
          Allowed activity types:{" "}
          {(types ?? []).map((t) => t.strava_sport_type as string).join(", ") || "—"}
        </div>
        <p className="text-sm">Participants: {pcount ?? 0}</p>
        {user ? (
          joined ? (
            <form action={leaveCampaignFromForm}>
              <input type="hidden" name="campaignId" value={c.id as string} />
              <Button type="submit" variant="outline">
                Leave campaign
              </Button>
            </form>
          ) : (
            <form action={joinCampaign}>
              <input type="hidden" name="campaignId" value={c.id as string} />
              <Button type="submit">Join this campaign</Button>
            </form>
          )
        ) : (
          <a
            href="/api/auth/strava/start"
            className={cn(buttonVariants())}
          >
            Connect Strava to join
          </a>
        )}
        <div>
          <h2 className="mb-2 text-xl font-semibold">Leaderboard</h2>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.displayName + r.rank}>
                    <TableCell>{r.rank}</TableCell>
                    <TableCell>{r.displayName}</TableCell>
                    <TableCell className="text-right">
                      {typeof r.score === "number" ? r.score.toFixed(1) : r.score}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      No results yet. Sync activities after joining.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {lb?.computed_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              Updated {format(new Date(lb.computed_at as string), "PPpp")}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
