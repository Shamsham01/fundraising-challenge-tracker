import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/header-actions";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/80 bg-muted/40 backdrop-blur supports-backdrop-filter:bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex flex-1 flex-wrap items-center gap-2 text-sm font-medium sm:gap-3">
            <Link href="/admin" className="text-primary hover:underline">
              Admin
            </Link>
            <Link href="/admin/campaigns">Campaigns</Link>
            <Link href="/admin/campaigns/new">New</Link>
            <Link href="/admin/moderation">Moderation</Link>
            <Link href="/admin/audit">Audit</Link>
            <Link href="/admin/profile">Profile</Link>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <LogoutButton />
            <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Exit
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
