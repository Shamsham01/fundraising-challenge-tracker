"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { joinCampaign, leaveCampaign } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";

export function CampaignJoinControl({
  campaignId,
  joined,
}: {
  campaignId: string;
  joined: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onJoin() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("campaignId", campaignId);
        const res = await joinCampaign(fd);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("You joined this campaign");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not join");
      }
    });
  }

  function onLeave() {
    startTransition(async () => {
      try {
        const res = await leaveCampaign(campaignId);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("You left this campaign");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not leave");
      }
    });
  }

  if (joined) {
    return (
      <Button type="button" variant="outline" disabled={pending} onClick={onLeave}>
        Leave campaign
      </Button>
    );
  }
  return (
    <Button type="button" disabled={pending} onClick={onJoin}>
      Join this campaign
    </Button>
  );
}
