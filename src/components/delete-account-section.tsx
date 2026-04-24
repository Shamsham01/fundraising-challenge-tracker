"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteMyParticipantAccount } from "@/app/actions/account";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { toast } from "sonner";

export function DeleteAccountSection() {
  const [pending, start] = useTransition();
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>
          Permanently removes your auth account, Strava connection, avatar, and participation
          records that cascade from your user id. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Delete your account permanently?")) {
              return;
            }
            start(async () => {
              const r = await deleteMyParticipantAccount();
              if (!r.ok) {
                toast.error(r.message);
                return;
              }
              const supa = createSupabaseBrowserClient();
              await supa.auth.signOut();
              window.location.href = "/";
            });
          }}
        >
          Delete my account
        </Button>
      </CardContent>
    </Card>
  );
}
