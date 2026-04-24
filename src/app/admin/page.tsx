import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminHomePage() {
  const supa = await createSupabaseServerClient();
  const { count: camp } = await supa
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  const { count: pending } = await supa
    .from("activity_reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin overview</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{camp ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending reviews</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{pending ?? 0}</CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/campaigns/new" className={cn(buttonVariants())}>
          New campaign
        </Link>
        <Link
          href="/admin/moderation"
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          Review queue
        </Link>
        <Link
          href="/api/cron/reconcile?secret=CONFIGURE"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Run sync (cron URL)
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        Replace CRON_SECRET in the query for manual sync. Export CSV:{" "}
        <code className="break-all">/api/admin/export/campaign?campaignId=UUID</code> (while signed in
        as admin).
      </p>
    </div>
  );
}
