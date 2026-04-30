import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isJustGivingEnabledClient } from "@/lib/env";

export default async function DashboardPage() {
  const supa = await createSupabaseServerClient();
  const { data: s } = await supa.auth.getUser();
  if (!s.user) redirect("/api/auth/strava/start");
  const { data: prof } = await supa
    .from("athlete_profiles")
    .select("*")
    .eq("user_id", s.user.id)
    .maybeSingle();
  const { data: joined } = await supa
    .from("campaign_participants")
    .select("campaign_id, cached_score, rank_cached, campaigns(title, slug)")
    .eq("user_id", s.user.id)
    .is("left_at", null);
  const { data: acts } = await supa
    .from("activities")
    .select("name, sport_type, start_date, distance_m")
    .eq("user_id", s.user.id)
    .order("start_date", { ascending: false })
    .limit(10);
  const jg = isJustGivingEnabledClient();
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <h1 className="text-2xl font-bold">Your dashboard</h1>
        <p className="text-muted-foreground">
          Hi {prof?.display_name ?? "athlete"}. Sync runs via webhooks and scheduled jobs. If token
          issues occur, re-connect from Strava settings or sign in again.
        </p>
        {jg && (
          <Card>
            <CardHeader>
              <CardTitle>Fundraising</CardTitle>
            </CardHeader>
            <CardContent>
              {prof?.fundraising_page_url ? (
                <a
                  className="text-primary underline"
                  href={prof.fundraising_page_url as string}
                  target="_blank"
                  rel="noreferrer"
                >
                  Your fundraising page
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Set a page URL in profile settings (JustGiving integration when enabled).
                </p>
              )}
            </CardContent>
          </Card>
        )}
        <section>
          <h2 className="mb-2 text-lg font-semibold">Joined campaigns</h2>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Your score</TableHead>
                  <TableHead>Rank</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(joined ?? []).map((j) => {
                  const cr = j.campaigns as
                    | { title: string; slug: string }
                    | { title: string; slug: string }[]
                    | null;
                  const c = Array.isArray(cr) ? cr[0] : cr;
                  return (
                    <TableRow key={j.campaign_id as string}>
                      <TableCell>
                        {c && (
                          <Link className="underline" href={`/campaigns/${c.slug}`}>
                            {c.title}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>{(j as { cached_score: number | null }).cached_score ?? 0}</TableCell>
                      <TableCell>
                        {(j as { rank_cached: number | null }).rank_cached ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!joined?.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      Join a public campaign to see it here.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold">Recent activities</h2>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">km</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(acts ?? []).map((a) => (
                  <TableRow key={(a as { name: string }).name + (a as { start_date: string }).start_date}>
                    <TableCell>{(a as { name: string | null }).name}</TableCell>
                    <TableCell>{(a as { sport_type: string }).sport_type}</TableCell>
                    <TableCell>
                      {new Date((a as { start_date: string }).start_date).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(
                        (Number((a as { distance_m: number | null }).distance_m) || 0) / 1000
                      ).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {!acts?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No synced activities yet. Webhooks and cron will populate this list.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
        <a
          href="/api/auth/strava/start"
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          Re-check Strava connection
        </a>
      </main>
    </div>
  );
}
