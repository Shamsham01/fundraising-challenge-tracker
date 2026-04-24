"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  async function signOut() {
    setLoading(true);
    const supa = createSupabaseBrowserClient();
    await supa.auth.signOut();
    setLoading(false);
    r.push("/");
    r.refresh();
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={signOut}
      disabled={loading}
      className="gap-1.5"
    >
      <LogOut className="size-3.5" />
      Log out
    </Button>
  );
}

/**
 * Server-rendered site header passes flags; this client group handles theme and sign-out.
 */
export function HeaderActions({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <ThemeToggle />
      {signedIn && <LogoutButton />}
    </div>
  );
}

