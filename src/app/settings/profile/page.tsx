import { SiteHeader } from "@/components/site-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { updateAthleteProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isJustGivingEnabledClient } from "@/lib/env";
import { MediaUploader } from "@/components/media-uploader";
import { athleteAvatarPublicUrl } from "@/lib/storage/public-url";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DisconnectStravaButton } from "@/components/disconnect-strava-button";

export default async function ProfileSettingsPage() {
  const supa = await createSupabaseServerClient();
  const { data: s } = await supa.auth.getUser();
  if (!s.user) {
    redirect("/api/auth/strava/start");
  }
  const { data: p } = await supa
    .from("athlete_profiles")
    .select("*")
    .eq("user_id", s.user.id)
    .maybeSingle();
  const jg = isJustGivingEnabledClient();
  const avatar = athleteAvatarPublicUrl(p?.avatar_path as string | null);
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-lg space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Profile</h1>
          <Link
            href="/settings/privacy"
            className={cn(buttonVariants({ variant: "link", className: "h-auto p-0" }))}
          >
            Privacy &amp; data
          </Link>
        </div>
        <div className="flex items-end gap-4">
          <div className="relative size-20 overflow-hidden rounded-full border bg-muted">
            {avatar ? (
              <Image src={avatar} alt="" fill className="object-cover" sizes="80px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                No image
              </div>
            )}
          </div>
          <MediaUploader scope="athlete-avatar" label="Profile photo" />
        </div>
        <form className="space-y-4" action={updateAthleteProfile}>
          <div className="space-y-1">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={(p?.display_name as string) ?? ""}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" defaultValue={(p?.bio as string) ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="location">Location (optional)</Label>
            <Input id="location" name="location" defaultValue={(p?.location as string) ?? ""} />
          </div>
          {jg && (
            <div className="space-y-1">
              <Label htmlFor="fundraisingPageUrl">Fundraising / JustGiving page URL</Label>
              <Input
                id="fundraisingPageUrl"
                name="fundraisingPageUrl"
                type="url"
                placeholder="https://"
                defaultValue={(p?.fundraising_page_url as string) ?? ""}
              />
            </div>
          )}
          <div className="flex items-start gap-2 space-y-0">
            <input
              type="checkbox"
              name="consentDataProcessing"
              value="on"
              id="consent"
              defaultChecked={!!p?.consent_data_processing_at}
              className="mt-1 size-4 rounded border"
            />
            <label htmlFor="consent" className="text-sm text-muted-foreground">
              I consent to the processing of my data for campaign participation, including Strava
              activity sync, as described in the{" "}
              <Link href="/privacy" className="text-primary underline">
                privacy
              </Link>{" "}
              page. You can request deletion in privacy settings.
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Save</Button>
            <DisconnectStravaButton />
          </div>
        </form>
        <p className="text-xs text-muted-foreground">
          Re-connect with Strava from the home page or dashboard if you disconnected.
        </p>
      </main>
    </div>
  );
}
