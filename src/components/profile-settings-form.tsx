"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateAthleteProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { DisconnectStravaButton } from "@/components/disconnect-strava-button";

export type AthleteProfileFormInitial = {
  display_name: string | null;
  bio: string | null;
  location: string | null;
  fundraising_page_url: string | null;
  consent_data_processing_at: string | null;
  consent_public_leaderboard_at: string | null;
};

export function ProfileSettingsForm({
  initial,
  justGiving,
}: {
  initial: AthleteProfileFormInitial;
  justGiving: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateAthleteProfile(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Profile saved");
      router.refresh();
    });
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-1">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={initial.display_name ?? ""}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" defaultValue={initial.bio ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="location">Location (optional)</Label>
        <Input id="location" name="location" defaultValue={initial.location ?? ""} />
      </div>
      {justGiving && (
        <div className="space-y-1">
          <Label htmlFor="fundraisingPageUrl">Fundraising / JustGiving page URL</Label>
          <Input
            id="fundraisingPageUrl"
            name="fundraisingPageUrl"
            type="url"
            placeholder="https://"
            defaultValue={initial.fundraising_page_url ?? ""}
          />
        </div>
      )}
      <div className="flex items-start gap-2 space-y-0">
        <input
          type="checkbox"
          name="consentDataProcessing"
          value="on"
          id="consent"
          defaultChecked={!!initial.consent_data_processing_at}
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
      <div className="flex items-start gap-2 space-y-0">
        <input
          type="checkbox"
          name="consentPublicLeaderboard"
          value="on"
          id="consentLb"
          defaultChecked={!!initial.consent_public_leaderboard_at}
          className="mt-1 size-4 rounded border"
        />
        <label htmlFor="consentLb" className="text-sm text-muted-foreground">
          I consent to appear on{" "}
          <strong className="text-foreground">public leaderboards</strong> for challenges I join,
          using my display name, profile photo, and challenge-approved totals (distance, etc.) stored
          in this app—not live Strava feeds. You can turn this off anytime; we will update published
          boards on save.
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          Save
        </Button>
        <DisconnectStravaButton />
      </div>
    </form>
  );
}
