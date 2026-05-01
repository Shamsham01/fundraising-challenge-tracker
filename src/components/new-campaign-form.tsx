"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCampaign, type CreateCampaignResult } from "@/app/actions/campaign-admin";
import { CampaignActivityTypesPicker } from "@/components/campaign-activity-types-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const DEFAULT_ACTIVITY_TYPES = ["Run", "Walk", "Hike"] as const;

export function NewCampaignForm() {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res: CreateCampaignResult = await createCampaign(formData);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Challenge created", { description: `"${res.title}" is live. Taking you to the campaign list…` });
    r.push(`/campaigns?new=${encodeURIComponent(res.slug)}`);
    r.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="slug">Slug (url)</Label>
        <Input id="slug" name="slug" required placeholder="spring-5k" className="mt-1.5 font-mono text-sm" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} className="mt-1.5" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="starts">Starts</Label>
          <Input id="starts" name="starts" type="datetime-local" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="ends">Ends</Label>
          <Input id="ends" name="ends" type="datetime-local" required className="mt-1.5" />
        </div>
      </div>
      <div>
        <Label>Strava activity types</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Only activities of these types count toward the leaderboard. Use quick-add for common
          bundles, or tick individual Strava{" "}
          <a
            className="underline underline-offset-2"
            href="https://developers.strava.com/docs/reference/#api-models-SportType"
            target="_blank"
            rel="noopener noreferrer"
          >
            SportType
          </a>{" "}
          values.
        </p>
        <div className="mt-3">
          <CampaignActivityTypesPicker
            fieldName="activityTypes"
            defaultSelected={[...DEFAULT_ACTIVITY_TYPES]}
            idPrefix="new-campaign"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="objective">Objective</Label>
        <Input
          id="objective"
          name="objective"
          defaultValue="total_distance"
          className="mt-1.5 font-mono text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" size="lg" disabled={loading} className="min-w-40 gap-2">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating…
            </>
          ) : (
            "Create challenge"
          )}
        </Button>
      </div>
    </form>
  );
}
