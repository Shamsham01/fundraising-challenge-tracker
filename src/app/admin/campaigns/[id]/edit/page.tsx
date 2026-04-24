import { notFound } from "next/navigation";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateCampaignDetails, triggerLeaderboardRecompute } from "@/app/actions/campaign-admin";
import { MediaUploader } from "@/components/media-uploader";
import { campaignImagePublicUrl } from "@/lib/storage/public-url";
import Image from "next/image";
import Link from "next/link";
import { clearCampaignImage } from "@/app/actions/media";

type P = { params: Promise<{ id: string }> };

export default async function EditCampaignPage({ params }: P) {
  const { id } = await params;
  const admin = getSupabaseServiceRole();
  const { data: c, error } = await admin
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !c) {
    notFound();
  }
  const cover = campaignImagePublicUrl(c.campaign_image_path as string | null);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Edit campaign</h1>
        <Link className={cn(buttonVariants({ variant: "outline" }))} href="/admin/campaigns">
          All campaigns
        </Link>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Campaign image</p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative aspect-[16/9] w-full max-w-md overflow-hidden rounded-lg border bg-muted">
            {cover ? (
              <Image src={cover} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 400px" />
            ) : (
              <div className="flex h-40 w-full items-center justify-center text-sm text-muted-foreground">
                No image
              </div>
            )}
          </div>
        </div>
        <MediaUploader scope="campaign-image" campaignId={id} label="Upload / replace" />
        <form
          action={async () => {
            "use server";
            await clearCampaignImage(id);
          }}
        >
          <Button type="submit" size="sm" variant="secondary">
            Remove image
          </Button>
        </form>
      </div>
      <form action={updateCampaignDetails} className="max-w-lg space-y-3">
        <input type="hidden" name="id" value={id} />
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={c.title as string} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={c.slug as string} required />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={(c.description as string) ?? ""}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isFeatured"
            id="isf"
            defaultChecked={!!(c as { is_featured: boolean }).is_featured}
            className="size-4 rounded border"
            value="on"
          />
          <Label htmlFor="isf">Feature on homepage</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Save</Button>
        </div>
      </form>
      <form
        action={async () => {
          "use server";
          await triggerLeaderboardRecompute(id);
        }}
        className="border-t pt-4"
      >
        <Button type="submit" variant="secondary" size="sm">
          Recompute leaderboard now
        </Button>
      </form>
    </div>
  );
}
