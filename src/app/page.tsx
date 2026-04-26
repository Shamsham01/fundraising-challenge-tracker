import { SiteHeader } from "@/components/site-header";
import { CampaignCard } from "@/components/campaign-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isJustGivingEnabledClient } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { getGlobalDistanceLeaderboard } from "@/lib/leaderboard-global";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const HERO_IMAGE =
  "https://images.justgiving.com/image/5313cd6e-873f-497b-886d-b79747415ead.jpg";

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
  const globalLb = await getGlobalDistanceLeaderboard(15);
  return (
    <div>
      <SiteHeader />
      <main>
        <section className="border-b border-border/60 bg-gradient-to-b from-accent/30 via-background to-background">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg ring-1 ring-black/5 dark:ring-white/10">
              <div className="relative aspect-[21/9] min-h-[200px] w-full sm:min-h-[280px]">
                <Image
                  src={HERO_IMAGE}
                  alt="Team photo for the Samworth Charity Challenge and HUGS Children’s Cancer Charity"
                  fill
                  className="object-cover object-center"
                  priority
                  sizes="(max-width: 1152px) 100vw, 1152px"
                />
              </div>
              <div className="space-y-6 border-t border-border/60 bg-card/95 p-6 sm:p-10">
                <h1 className="font-story text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Story
                </h1>
                <div className="font-story space-y-4 text-base leading-relaxed text-foreground/95 sm:text-lg">
                  <p>
                    HUGS Children’s Cancer Charity supports families going through the devastating diagnosis
                    of cancer in children under 18 years old.
                  </p>
                  <p>
                    The words &ldquo;your child has cancer&rdquo; are ones that no parent should hear and we
                    ensure that they are not alone on the journey. By providing group events, care packs,
                    respite and a platform to talk to other parents, HUGS ensures that every family has the
                    support they need!
                  </p>
                  <p>
                    Matt, Tom, Paul &amp; I are four colleagues and friends who work or have worked for The
                    Cornwall Bakery, part of the Samworth Brothers Group. For the last eight years we have
                    been entering the bi-annual Samworth Charity Challenge, raising over £10,000 for
                    various charities, local and nationwide. We&apos;ve decided that for the 2026 Charity
                    Challenge, HUGS Children&apos;s Cancer Charity will be our chosen charity, to raise
                    essential funds. The challenge is a nine-hour adventure race across three disciplines
                    (mountain bike, kayak and hike), scoring points at checkpoints throughout the course.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-10 max-w-2xl space-y-4">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Join the challenge
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                Public fundraising challenges, powered by Strava. Connect your account, join a campaign, and
                have eligible activities count on the leaderboard. Admins can moderate, export data, and
                highlight winners. {jg ? " Donation links via JustGiving are available when configured." : ""}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/campaigns" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
                  View campaigns
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/about" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                  About
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:py-12">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums sm:text-4xl">{partCount ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Distance counted (est.)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums sm:text-4xl">{totalKm.toFixed(1)} km</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Open campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums sm:text-4xl">{campaigns?.length ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <section>
            <h2 className="mb-1 text-2xl font-bold tracking-tight">Top distance (all challenges)</h2>
            <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
              Combined approved distance from challenges in this app, for participants who opted in to
              public leaderboards. Not a live Strava feed—see{" "}
              <Link href="/privacy" className="text-primary underline">
                privacy
              </Link>
              .
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Participant</TableHead>
                    <TableHead className="text-right">Total distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalLb.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="font-medium tabular-nums">{row.rank}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8 border border-border">
                            {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
                            <AvatarFallback className="text-xs">
                              {row.displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{row.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {(row.totalDistanceM / 1000).toFixed(2)} km
                      </TableCell>
                    </TableRow>
                  ))}
                  {globalLb.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-sm text-muted-foreground"
                      >
                        No public leaderboard data yet, or the database function is not installed. Run
                        the latest Supabase migration and ensure participants opt in under Settings →
                        Profile.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section>
            <h2 className="mb-6 text-2xl font-bold tracking-tight">Campaigns</h2>
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
                <p className="text-sm text-muted-foreground col-span-full">
                  No campaigns yet. Create one in the admin portal after seeding the database.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
