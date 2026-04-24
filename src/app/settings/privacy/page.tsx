import { SiteHeader } from "@/components/site-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountSection } from "@/components/delete-account-section";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function PrivacySettingsPage() {
  const supa = await createSupabaseServerClient();
  const { data: s } = await supa.auth.getUser();
  if (!s.user) {
    redirect("/api/auth/strava/start");
  }
  const isAdmin = s.user.app_metadata?.role === "admin";
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-lg space-y-6 px-4 py-10">
        <Link href="/settings/profile" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          ← Back to profile
        </Link>
        <h1 className="text-2xl font-bold">Privacy &amp; data</h1>
        <p className="text-sm text-muted-foreground">
          We store the minimum Strava data needed to attribute activities and show campaign
          progress. You can disconnect Strava or delete your account at any time (participants
          only).
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Data use</CardTitle>
            <CardDescription>
              By using the platform you accept the processing described in the privacy policy. You
              can manage display data in profile settings.
            </CardDescription>
          </CardHeader>
        </Card>
        {!isAdmin && <DeleteAccountSection />}
      </main>
    </div>
  );
}
