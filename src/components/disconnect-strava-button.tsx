"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { disconnectStravaForCurrentUser } from "@/app/actions/account";
import { toast } from "sonner";

export function DisconnectStravaButton() {
  const [p, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={p}
      onClick={() => {
        start(async () => {
          await disconnectStravaForCurrentUser();
          toast.success("Strava disconnected locally.");
        });
      }}
    >
      Disconnect Strava
    </Button>
  );
}
