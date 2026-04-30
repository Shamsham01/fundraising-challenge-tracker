import { SiteHeader } from "@/components/site-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { isJustGivingEnabledClient } from "@/lib/env";
import { MediaUploader } from "@/components/media-uploader";
import { athleteAvatarPublicUrl } from "@/lib/storage/public-url";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const formKey = [
    p?.display_name ?? "",
    p?.bio ?? "",
    p?.location ?? "",
    p?.fundraising_page_url ?? "",
    p?.consent_data_processing_at ?? "",
    (p as { consent_public_leaderboard_at?: string | null } | null)?.consent_public_leaderboard_at ??
      "",
  ].join("\0");
  const initial = {
    display_name: (p?.display_name as string | null) ?? null,
    bio: (p?.bio as string | null) ?? null,
    location: (p?.location as string | null) ?? null,
    fundraising_page_url: (p?.fundraising_page_url as string | null) ?? null,
    consent_data_processing_at: (p?.consent_data_processing_at as string | null) ?? null,
    consent_public_leaderboard_at:
      (p as { consent_public_leaderboard_at?: string | null } | null)?.consent_public_leaderboard_at ??
      null,
  };
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
        <ProfileSettingsForm key={formKey} initial={initial} justGiving={jg} />
        <p className="text-xs text-muted-foreground">
          Re-connect with Strava from the home page or dashboard if you disconnected.
        </p>
      </main>
    </div>
  );
}
