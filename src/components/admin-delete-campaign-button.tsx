"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { softDeleteCampaign } from "@/app/actions/campaign-admin";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AdminDeleteCampaignButton({ campaignId, title }: { campaignId: string; title: string }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  async function onDelete() {
    setLoading(true);
    const res = await softDeleteCampaign(campaignId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Challenge removed from the public site (soft delete).");
    setOpen(false);
    r.refresh();
  }
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-destructive">
        <Trash2 className="size-4" />
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this challenge?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{title}</span> will be hidden (soft delete). Data is
              retained for compliance; the campaign no longer appears on the public site. You can restore later
              from the database if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={onDelete} disabled={loading}>
              {loading ? "Removing…" : "Delete challenge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
