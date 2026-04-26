import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { campaignImagePublicUrl, athleteAvatarPublicUrl } from "@/lib/storage/public-url";
import { joinCampaign, leaveCampaignFromForm } from "@/app/actions/campaigns";
import { buttonVariants, Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { CampaignObjective } from "@/domain/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type Props = { params: Promise<{ slug: string }> };

function formatLeaderboardCell(objective: CampaignObjective, score: number) {
  switch (objective) {
    case "total_distance":
      return `${(score / 1000).toFixed(2)} km`;
    case "total_moving_time": {
      const s = Math.round(score);
      return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    }
    case "total_elevation":
      return `${score.toFixed(0)} m`;
    case "activity_count":
      return String(Math.round(score));
    default:
      return typeof score === "number" ? score.toFixed(1) : String(score);
  }
}

type LbRow = {
  rank: number;
  displayName: string;
  score: number;
  userId?: string;
  avatarPath?: string | null;
};

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
  const rawSnap = lb?.snapshot as
    | { rows?: LbRow[]; objective?: CampaignObjective; computed?: string }
    | null;
  const rows = rawSnap?.rows ?? [];
  const snapObjective = (rawSnap?.objective ?? c.objective) as CampaignObjective;
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
          <p className="mb-3 max-w-2xl text-sm text-muted-foreground">
            Rankings use challenge-approved totals stored in this app (not live Strava feeds). Only
            participants who have opted in to public leaderboards appear here. See{" "}
            <Link href="/privacy" className="text-primary underline">
              privacy &amp; consent
            </Link>
            .
          </p>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const av = r.avatarPath ? athleteAvatarPublicUrl(r.avatarPath) : null;
                  return (
                    <TableRow key={(r as LbRow).userId ?? r.displayName + r.rank}>
                      <TableCell className="font-medium tabular-nums">{r.rank}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8 border border-border">
                            {av ? <AvatarImage src={av} alt="" /> : null}
                            <AvatarFallback className="text-xs">
                              {r.displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{r.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatLeaderboardCell(snapObjective, r.score)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      No one on the public board yet, or all participants have turned off public leaderboard
                      display in profile. Sync activities after joining and opt in under Settings → Profile.
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
