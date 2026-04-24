import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { HeaderActions } from "@/components/header-actions";

export async function SiteHeader() {
  const supa = await createSupabaseServerClient();
  const { data: s } = await supa.auth.getUser();
  const isAdmin = s.user?.app_metadata?.role === "admin";
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16">
        <Link
          href="/"
          className="shrink-0 text-base font-bold tracking-tight text-foreground sm:text-lg"
        >
          <span className="text-primary">HUGS</span>{" "}
          <span className="font-semibold">Challenge</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 sm:gap-1">
          <nav className="mr-0 flex max-w-full flex-nowrap items-center justify-end gap-0.5 overflow-x-auto text-sm sm:gap-1 sm:pr-1">
            <Link
              className={cn("hidden shrink-0 sm:inline", buttonVariants({ variant: "ghost", size: "sm" }))}
              href="/about"
            >
              About
            </Link>
            <Link
              className={cn("hidden shrink-0 sm:inline", buttonVariants({ variant: "ghost", size: "sm" }))}
              href="/privacy"
            >
              Privacy
            </Link>
            <Link href="/campaigns" className={cn("shrink-0", buttonVariants({ variant: "ghost", size: "sm" }))}>
              Campaigns
            </Link>
            {s.user ? (
              <>
                <Link
                  href="/dashboard"
                  className={cn("shrink-0", buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings/profile"
                  className={cn("shrink-0", buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  Profile
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={cn("shrink-0", buttonVariants({ variant: "secondary", size: "sm" }))}
                  >
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/api/auth/strava/start"
                className={cn("shrink-0", buttonVariants({ size: "sm" }))}
              >
                Connect Strava
              </Link>
            )}
          </nav>
          <HeaderActions signedIn={!!s.user} />
        </div>
      </div>
    </header>
  );
}
