"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateCampaignAllowedActivityTypes } from "@/app/actions/campaign-admin";
import { CampaignActivityTypesPicker } from "@/components/campaign-activity-types-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function EditCampaignActivityTypesForm(props: {
  campaignId: string;
  initialTypes: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="max-w-xl space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await updateCampaignAllowedActivityTypes(fd);
          if (!r.ok) {
            toast.error(r.error);
          } else {
            toast.success("Activity types saved", {
              description: "Eligible activities and the leaderboard were refreshed.",
            });
            router.refresh();
          }
        });
      }}
    >
      <input type="hidden" name="campaignId" value={props.campaignId} />
      <div>
        <Label htmlFor={`act-types-${props.campaignId}`} className="text-base">
          Strava activity types
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Only uploads that match these Strava types count for this challenge (
          <a
            className="underline underline-offset-2"
            href="https://developers.strava.com/docs/reference/#api-models-SportType"
            target="_blank"
            rel="noopener noreferrer"
          >
            SportType reference
          </a>
          ).
        </p>
        <div id={`act-types-${props.campaignId}`} className="mt-3">
          <CampaignActivityTypesPicker
            key={[...props.initialTypes].sort().join(",")}
            fieldName="activityTypes"
            defaultSelected={props.initialTypes}
            idPrefix={`edit-${props.campaignId}`}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="gap-2">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save activity types"
        )}
      </Button>
    </form>
  );
}
