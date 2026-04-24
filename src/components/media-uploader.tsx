"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  clearAthleteAvatar,
  saveAdminAvatarPath,
  saveAthleteAvatarPath,
  saveCampaignImagePath,
} from "@/app/actions/media";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MAX = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

type Scope = "athlete-avatar" | "admin-avatar" | "campaign-image";

export function MediaUploader(props: {
  scope: Scope;
  campaignId?: string;
  label?: string;
}) {
  const id = useId();
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  async function onFile(f: File | null) {
    if (!f) {
      return;
    }
    if (f.size > MAX) {
      toast.error("File too large (max 2 MB).");
      return;
    }
    if (!TYPES.includes(f.type)) {
      toast.error("Use JPEG, PNG, or WebP.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/upload/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: props.scope,
          contentType: f.type,
          campaignId: props.campaignId,
        }),
      });
      const j = (await res.json()) as { error?: string; signedUrl: string; path: string };
      if (!res.ok) {
        throw new Error(j.error ?? "upload init failed");
      }
      const put = await fetch(j.signedUrl, {
        method: "PUT",
        body: f,
        headers: { "Content-Type": f.type, "x-upsert": "true" },
      });
      if (!put.ok) {
        throw new Error("Upload to storage failed");
      }
      if (props.scope === "athlete-avatar") {
        await saveAthleteAvatarPath(j.path);
      } else if (props.scope === "admin-avatar") {
        await saveAdminAvatarPath(j.path);
      } else if (props.scope === "campaign-image" && props.campaignId) {
        await saveCampaignImagePath(props.campaignId, j.path);
      }
      toast.success("Image saved.");
      r.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="space-y-2">
      {props.label && <Label htmlFor={id}>{props.label}</Label>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-sm"
          disabled={loading}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {props.scope === "athlete-avatar" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await clearAthleteAvatar();
                toast.success("Avatar removed.");
                r.refresh();
              } finally {
                setLoading(false);
              }
            }}
          >
            Remove
          </Button>
        )}
      </div>
      <Alert>
        <AlertDescription className="text-xs">Max 2 MB. Shown on cards once saved.</AlertDescription>
      </Alert>
    </div>
  );
}
