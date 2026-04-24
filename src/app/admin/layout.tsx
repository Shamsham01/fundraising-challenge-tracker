import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supa = await createSupabaseServerClient();
  const { data: s } = await supa.auth.getUser();
  if (!s.user) {
    redirect("/auth/admin/login");
  }
  if (s.user.app_metadata?.role !== "admin") {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen">
      <div className="border-b bg-muted/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link href="/admin">Admin</Link>
            <Link href="/admin/campaigns">Campaigns</Link>
            <Link href="/admin/campaigns/new">New</Link>
            <Link href="/admin/moderation">Moderation</Link>
            <Link href="/admin/audit">Audit</Link>
            <Link href="/admin/profile">Profile</Link>
          </div>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Exit
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
