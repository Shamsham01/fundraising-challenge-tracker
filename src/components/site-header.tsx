import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const supa = await createSupabaseServerClient();
  const { data: s } = await supa.auth.getUser();
  const isAdmin = s.user?.app_metadata?.role === "admin";
  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Fundraising Challenge Tracker
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link
            className={cn("hidden sm:inline", buttonVariants({ variant: "ghost" }))}
            href="/about"
          >
            About
          </Link>
          <Link
            className={cn("hidden sm:inline", buttonVariants({ variant: "ghost" }))}
            href="/privacy"
          >
            Privacy
          </Link>
          <Link
            href="/campaigns"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            Campaigns
          </Link>
          {s.user ? (
            <>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                Dashboard
              </Link>
              <Link
                href="/settings/profile"
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                Profile
              </Link>
              {isAdmin && (
                <Link href="/admin" className={cn(buttonVariants({ variant: "ghost" }))}>
                  Admin
                </Link>
              )}
            </>
          ) : (
            <Link href="/api/auth/strava/start" className={cn(buttonVariants())}>
              Connect Strava
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
