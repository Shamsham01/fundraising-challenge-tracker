import Link from "next/link";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { updateAdminProfile } from "@/app/actions/profile";
import { MediaUploader } from "@/components/media-uploader";
import { adminAvatarPublicUrl } from "@/lib/storage/public-url";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default async function AdminProfilePage() {
  const c = await createSupabaseServerClient();
  const { data: s } = await c.auth.getUser();
  if (!s.user || s.user.app_metadata?.role !== "admin") {
    redirect("/auth/admin/login");
  }
  const admin = getSupabaseServiceRole();
  const { data: p } = await admin
    .from("admin_profiles")
    .select("*")
    .eq("user_id", s.user.id)
    .maybeSingle();
  const av = adminAvatarPublicUrl(p?.avatar_path as string | null);
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin profile</h1>
        <Link className={cn(buttonVariants({ variant: "ghost", size: "sm" }))} href="/admin">
          Back
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Display name and bio appear in internal admin views. Avatar is public like participant
        avatars.
      </p>
      <div className="flex items-end gap-4">
        <div className="relative size-20 overflow-hidden rounded-full border bg-muted">
          {av ? (
            <Image src={av} alt="" fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs">—</div>
          )}
        </div>
        <MediaUploader scope="admin-avatar" label="Admin avatar" />
      </div>
      <form className="space-y-3" action={updateAdminProfile}>
        <div>
          <Label htmlFor="d">Display name</Label>
          <Input
            id="d"
            name="displayName"
            defaultValue={(p?.display_name as string) ?? ""}
            required
          />
        </div>
        <div>
          <Label htmlFor="b">Bio</Label>
          <Textarea id="b" name="bio" defaultValue={(p?.bio as string) ?? ""} />
        </div>
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}
